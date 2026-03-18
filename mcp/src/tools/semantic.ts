import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, courseSchema, lessonSchema, blockSchema, type Course, type Block } from "../lib/types.js";

function injectIds(course: any): Course {
  return {
    ...course,
    lessons: (course.lessons ?? []).map((l: any) => ({
      ...l,
      id: uid(),
      blocks: (l.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
    })),
  };
}

function injectLessonIds(lesson: any) {
  return {
    ...lesson,
    id: uid(),
    blocks: (lesson.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
  };
}

export function registerSemanticTools(server: McpServer) {
  // ── save_course ──────────────────────────────────────────────────────────
  server.tool(
    "save_course",
    "Bulk-save a full course (create new or replace existing). Omit all id fields — they are generated automatically. Pass course_id to replace an existing course.",
    {
      course_json: z.record(z.unknown()),
      course_id: z.string().uuid().optional(),
    },
    async ({ course_json, course_id }) =>
      withAuth(async (client, userId) => {
        const withIds = injectIds(course_json);
        const parsed = courseSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid course");

        if (course_id) {
          // Replace existing
          const { data: existing } = await client.from("courses").select("id").eq("id", course_id).eq("user_id", userId).single();
          if (!existing) return err("course_not_found", `No course with id ${course_id}`);
          await client.from("courses").update({ content: parsed.data, title: parsed.data.title }).eq("id", course_id).eq("user_id", userId);
          return ok({ course_id });
        }

        const { data, error } = await client.from("courses").insert({ user_id: userId, title: parsed.data.title, content: parsed.data, is_public: false }).select("id").single();
        if (error || !data) return err("insert_failed", error?.message ?? "Unknown");
        return ok({ course_id: data.id });
      })
  );

  // ── replace_lesson ────────────────────────────────────────────────────────
  server.tool(
    "replace_lesson",
    "Replace all blocks in a lesson with a new set. Omit id fields from blocks — generated automatically.",
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

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: validated.map((r) => (r as any).data) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to replace lesson");
        return ok({ message: "Lesson blocks replaced" });
      })
  );

  // ── generate_course ───────────────────────────────────────────────────────
  server.tool(
    "generate_course",
    "Save a fully-drafted course JSON as a new course. Claude should generate the complete course_json before calling this tool.",
    { course_json: z.record(z.unknown()) },
    async ({ course_json }) =>
      withAuth(async (client, userId) => {
        const withIds = injectIds(course_json);
        const parsed = courseSchema.safeParse(withIds);
        if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid course");
        const { data, error } = await client.from("courses").insert({ user_id: userId, title: parsed.data.title, content: parsed.data, is_public: false }).select("id").single();
        if (error || !data) return err("insert_failed", error?.message ?? "Unknown");
        return ok({ course_id: data.id });
      })
  );

  // ── generate_lesson ───────────────────────────────────────────────────────
  server.tool(
    "generate_lesson",
    "Insert a fully-drafted lesson into an existing course. Claude should generate the lesson_json before calling this tool.",
    {
      course_id: z.string().uuid(),
      lesson_json: z.record(z.unknown()),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_json, position }) =>
      withAuth(async (client, userId) => {
        const withIds = injectLessonIds(lesson_json);
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
    "Append assessment blocks to a lesson. Claude should read the lesson first (via get_course), generate the blocks, then call this tool.",
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

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: [...l.blocks, ...parsedBlocks] }
          ),
        }));
        if (mutError) return err(mutError, "Failed to append quiz blocks");
        return ok({ block_ids: blockIds });
      })
  );

  // ── rewrite_block ─────────────────────────────────────────────────────────
  server.tool(
    "rewrite_block",
    "Replace a block's content with a rewritten version. Claude should fetch the block first (via get_course), rewrite it, then call this tool with the updated block (no id field needed).",
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
        if (!parsed.success) return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: l.blocks.map((b) => (b.id === block_id ? parsed.data : b)) }
          ),
        }));
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

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: validated.map((r) => (r as any).data) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to rewrite lesson");
        return ok({ message: "Lesson rewritten" });
      })
  );

  // ── restructure_course ────────────────────────────────────────────────────
  server.tool(
    "restructure_course",
    "Reorder and/or rename lessons. Claude should provide lesson_order as an array of {lesson_id, title} in the desired order. Does not add or remove lessons.",
    {
      course_id: z.string().uuid(),
      lesson_order: z.array(z.object({ lesson_id: z.string().uuid(), title: z.string() })),
    },
    async ({ course_id, lesson_order }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
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
        if (mutError) return err(mutError, "Failed to restructure course");
        return ok({ message: "Course restructured" });
      })
  );
}
