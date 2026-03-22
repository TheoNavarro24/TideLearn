import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, lessonSchema, blockSchema, type Block } from "../lib/types.js";
import { validateCourseJson, formatZodErrors } from "../lib/validate.js";

export function injectSubItemIds(block: any): any {
  if (block.type === "accordion" || block.type === "tabs") {
    return {
      ...block,
      items: (block.items ?? []).map((item: any) => ({
        ...item,
        id: item.id ?? uid(),
      })),
    };
  }
  return block;
}

export function injectIds(course: any) {
  return {
    ...course,
    lessons: (course.lessons ?? []).map((l: any) => {
      if (l.kind === "assessment") {
        return {
          ...l,
          id: l.id ?? uid(),
          questions: (l.questions ?? []).map((q: any) => ({
            ...q,
            id: q.id ?? uid(),
          })),
        };
      }
      return {
        ...l,
        kind: "content",
        id: l.id ?? uid(),
        blocks: (l.blocks ?? []).map((b: any) =>
          injectSubItemIds({ ...b, id: b.id ?? uid() })
        ),
      };
    }),
  };
}

export function injectLessonIds(lesson: any) {
  if (lesson.kind === "assessment") {
    return {
      ...lesson,
      id: uid(),
      questions: (lesson.questions ?? []).map((q: any) => ({
        ...q,
        id: q.id ?? uid(),
      })),
    };
  }
  return {
    ...lesson,
    kind: "content",
    id: uid(),
    blocks: (lesson.blocks ?? []).map((b: any) =>
      injectSubItemIds({ ...b, id: uid() })
    ),
  };
}

export function checkRestructureOrder(existingIds: string[], providedIds: string[]): string | null {
  const provided = new Set(providedIds);
  const missing = existingIds.filter(id => !provided.has(id));
  if (missing.length === 0) return null;
  return `lesson_order must include all ${existingIds.length} lesson(s). Missing: ${missing.join(", ")}`;
}

export function registerSemanticTools(server: McpServer) {
  // ── save_course ──────────────────────────────────────────────────────────
  server.tool(
    "save_course",
    `Bulk-save a full course (create new or replace existing). Omit all id fields — they are generated automatically. Pass course_id to replace an existing course.

REQUIRED fields and types:
- schemaVersion: 1 (number literal) at the top level — omitting causes validation error
- text blocks: "text" field must be HTML e.g. "<p>Hello</p>", not markdown
- quiz blocks: use "correctIndex" (number, 0-based) not "correct_answer"
- accordion/tabs items: each item needs an "id" field (UUID)

MINIMAL EXAMPLE — one text block + one quiz block:
{
  "schemaVersion": 1,
  "title": "My Course",
  "lessons": [
    {
      "title": "Lesson 1",
      "blocks": [
        { "type": "text", "text": "<p>Welcome to the lesson.</p>" },
        { "type": "quiz", "question": "What is 2+2?", "options": ["3","4","5","6"], "correctIndex": 1 }
      ]
    }
  ]
}

If unsure of schema, read the tidelearn://instructions resource for the full block type reference.`,
    {
      course_json: z.record(z.unknown()),
      course_id: z.string().uuid().optional(),
    },
    async ({ course_json, course_id }) =>
      withAuth(async (client, userId) => {
        const withIds = injectIds(course_json);
        const result = validateCourseJson(withIds);
        if (!result.ok) return err("validation_error", `Validation failed:\n${result.errors.map((e) => `- ${e}`).join("\n")}`);

        if (course_id) {
          // Replace existing
          const { data: existing } = await client.from("courses").select("id").eq("id", course_id).eq("user_id", userId).single();
          if (!existing) return err("course_not_found", `No course with id ${course_id}`);
          await client.from("courses").update({ content: result.course, title: result.course.title }).eq("id", course_id).eq("user_id", userId);
          return ok({ course_id });
        }

        const { data, error } = await client.from("courses").insert({ user_id: userId, title: result.course.title, content: result.course, is_public: false }).select("id").single();
        if (error || !data) return err("insert_failed", error?.message ?? "Unknown");
        return ok({ course_id: data.id });
      })
  );

  // ── generate_lesson ───────────────────────────────────────────────────────
  server.tool(
    "generate_lesson",
    `Insert a fully-drafted lesson into an existing course at the given position. Omit id fields — they are generated automatically.

lesson_json shape:
{
  "title": "Lesson Title",
  "blocks": [
    { "type": "text", "text": "<p>HTML content.</p>" },
    { "type": "quiz", "question": "...", "options": ["A","B","C"], "correctIndex": 0 }
  ]
}

Text fields must be HTML. See tidelearn://instructions for all block types.`,
    {
      course_id: z.string().uuid(),
      lesson_json: z.record(z.unknown()),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_json, position }) =>
      withAuth(async (client, userId) => {
        const withIds = injectLessonIds(lesson_json);
        if (withIds.kind === "assessment") {
          return err("assessment_lesson", "Use add_assessment_lesson to create assessment lessons, not generate_lesson.");
        }
        const parsed = lessonSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid lesson");
        const lessonId = parsed.data.id;

        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, parsed.data);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to insert lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  // ── generate_quiz_for_lesson ──────────────────────────────────────────────
  server.tool(
    "generate_quiz_for_lesson",
    `Append assessment blocks to a lesson. Read the lesson first via get_course, then draft the blocks and call this tool. Omit id fields — they are generated automatically.

blocks array shape:
[
  { "type": "quiz", "question": "What is X?", "options": ["A","B","C","D"], "correctIndex": 2 },
  { "type": "truefalse", "question": "True or false: Y?", "correct": true },
  { "type": "shortanswer", "question": "Define Z.", "answer": "expected answer" }
]

Only assessment block types are appropriate here: quiz, truefalse, shortanswer.`,
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      blocks: z.array(z.record(z.unknown())),
    },
    async ({ course_id, lesson_id, blocks }) =>
      withAuth(async (client, userId) => {
        const blocksWithIds = blocks.map((b) => ({ ...b, id: uid() }));
        const validated = blocksWithIds.map((b) => blockSchema.safeParse(b));
        const invalid = validated.find((r) => !r.success);
        if (invalid && !invalid.success) return err("invalid_block_type", invalid.error.issues[0]?.message ?? "Invalid block");
        const parsedBlocks = validated.map((r) => (r as any).data) as Block[];
        const blockIds = parsedBlocks.map((b) => b.id);

        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if ((targetLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const cl = l as any;
              return { ...l, blocks: [...cl.blocks, ...parsedBlocks] };
            }),
          };
        });
        if (assessmentError) return err("assessment_lesson", "generate_quiz_for_lesson cannot be used on assessment lessons. Use add_question instead.");
        if (mutError) return err(mutError, "Failed to append quiz blocks");
        return ok({ block_ids: blockIds });
      })
  );

  // ── rewrite_block ─────────────────────────────────────────────────────────
  server.tool(
    "rewrite_block",
    `Replace a block's content with a rewritten version. Fetch the block first via get_course, rewrite it, then call this tool.

Omit the id field from updated_block — it is set automatically from block_id.
Text fields (e.g. in text blocks) must be HTML (e.g. "<p>content</p>"), not markdown.`,
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      updated_block: z.record(z.unknown()),
    },
    async ({ course_id, lesson_id, block_id, updated_block }) =>
      withAuth(async (client, userId) => {
        const withId = { ...updated_block, id: block_id };
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) return err("invalid_block_type", `Validation failed:\n${formatZodErrors(parsed.error).map((e) => `- ${e}`).join("\n")}`);

        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if ((targetLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const cl = l as any;
              return { ...l, blocks: cl.blocks.map((b: any) => (b.id === block_id ? parsed.data : b)) };
            }),
          };
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (mutError) return err(mutError, "Failed to rewrite block");
        return ok({ message: "Block rewritten" });
      })
  );

  // ── rewrite_lesson ────────────────────────────────────────────────────────
  server.tool(
    "rewrite_lesson",
    "Replace all blocks in a lesson with Claude's rewritten version. Claude should fetch the lesson first, rewrite it, then pass the new blocks array here (no id fields needed).",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      blocks: z.array(z.record(z.unknown())),
    },
    async ({ course_id, lesson_id, blocks }) =>
      withAuth(async (client, userId) => {
        const blocksWithIds = blocks.map((b) => ({ ...b, id: uid() }));
        const validated = blocksWithIds.map((b) => blockSchema.safeParse(b));
        const invalid = validated.find((r) => !r.success);
        if (invalid && !invalid.success) return err("invalid_block_type", invalid.error.issues[0]?.message ?? "Invalid block");

        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if ((targetLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : { ...l, blocks: validated.map((r) => (r as any).data) }
            ),
          };
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (mutError) return err(mutError, "Failed to rewrite lesson");
        return ok({ message: "Lesson rewritten" });
      })
  );

  // ── restructure_course ────────────────────────────────────────────────────
  server.tool(
    "restructure_course",
    "Reorder and/or rename lessons. lesson_order must contain ALL lessons in the course — omitting any will return an error. Pass every lesson_id with its desired title in the new order.",
    {
      course_id: z.string().uuid(),
      lesson_order: z.array(z.object({ lesson_id: z.string().uuid(), title: z.string() })),
    },
    async ({ course_id, lesson_order }) =>
      withAuth(async (client, userId) => {
        let orderError: string | null = null;

        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const existingIds = course.lessons.map((l: any) => l.id);
          const providedIds = lesson_order.map(l => l.lesson_id);
          orderError = checkRestructureOrder(existingIds, providedIds);
          if (orderError) return course;

          const lessonMap = new Map(course.lessons.map((l) => [l.id, l]));
          const reordered = lesson_order
            .map(({ lesson_id, title }) => {
              const lesson = lessonMap.get(lesson_id);
              if (!lesson) return null;
              return { ...lesson, title };
            })
            .filter(Boolean) as typeof course.lessons;
          return { ...course, lessons: reordered };
        });

        if (orderError) return err("incomplete_lesson_order", orderError);
        if (mutError) return err(mutError, "Failed to restructure course");
        return ok({ message: "Course restructured" });
      })
  );
}
