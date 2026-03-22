import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, blockSchema, type Block } from "../lib/types.js";
import { formatZodErrors } from "../lib/validate.js";
import { injectSubItemIds } from "./semantic.js";

export function registerBlockTools(server: McpServer) {
  server.tool(
    "rewrite_blocks",
    `Replace multiple blocks in one operation. Provide an array of updates, each with lesson_id, block_id, and the new block content.

Omit the id field from each updated_block — it is injected from block_id.
Text fields (e.g. in text blocks) must be HTML (e.g. "<p>content</p>"), not markdown.`,
    {
      course_id: z.string().uuid(),
      updates: z.array(z.object({
        lesson_id: z.string().uuid(),
        block_id: z.string().uuid(),
        updated_block: z.record(z.unknown()),
      })).min(1),
    },
    async ({ course_id, updates }) =>
      withAuth(async (client, userId) => {
        // Validate all blocks first, collect all errors before aborting
        const allErrors: string[] = [];
        const validatedBlocks: Block[] = [];
        for (const update of updates) {
          const withId = { ...update.updated_block, id: update.block_id };
          const parsed = blockSchema.safeParse(withId);
          if (!parsed.success) {
            const msgs = formatZodErrors(parsed.error).map(e => `block ${update.block_id}: ${e}`);
            allErrors.push(...msgs);
          } else {
            validatedBlocks.push(parsed.data);
          }
        }
        if (allErrors.length > 0) {
          return err("validation_error", `Validation failed:\n${allErrors.map(e => `- ${e}`).join("\n")}`);
        }

        // Build lookup: lesson_id -> block_id -> validated block
        const updateMap = new Map<string, Map<string, Block>>();
        for (let i = 0; i < updates.length; i++) {
          const { lesson_id, block_id } = updates[i];
          if (!updateMap.has(lesson_id)) updateMap.set(lesson_id, new Map());
          updateMap.get(lesson_id)!.set(block_id, validatedBlocks[i]);
        }

        let assessmentError: string | null = null;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          for (const [lessonId] of updateMap) {
            const lesson = course.lessons.find((l) => l.id === lessonId);
            if ((lesson as any)?.kind === "assessment") {
              assessmentError = lessonId;
              return course;
            }
          }
          return {
            ...course,
            lessons: course.lessons.map(l => {
              const blockUpdates = updateMap.get(l.id);
              if (!blockUpdates) return l;
              const cl = l as any;
              return {
                ...l,
                blocks: cl.blocks.map((b: any) => blockUpdates.get(b.id) ?? b),
              };
            }),
          };
        });

        if (assessmentError) return err("assessment_lesson", `Block operations cannot be used on assessment lessons. Use add_question / update_question instead.`);
        if (mutError) return err(mutError, "Failed to rewrite blocks");
        return ok({ updated: updates.length });
      })
  );

  server.tool(
    "add_block",
    `Add a block to a lesson. Omit the 'id' field — it is generated automatically.

BLOCK TYPES — pass exactly these fields in the 'block' object:

  heading    { type:"heading", text:"..." }
  text       { type:"text", text:"..." }
  image      { type:"image", src:"https://...", alt:"..." }
  video      { type:"video", url:"https://youtube.com/..." }
  audio      { type:"audio", src:"https://...", title?:"..." }
  code       { type:"code", language:"python", code:"..." }
  list       { type:"list", style:"bulleted"|"numbered", items:["item1","item2"] }
  quote      { type:"quote", text:"...", cite?:"Author" }
  callout    { type:"callout", variant:"info"|"success"|"warning"|"danger", title?:"...", text:"..." }
  accordion  { type:"accordion", items:[{ title:"...", content:"..." }] }
  tabs       { type:"tabs", items:[{ label:"...", content:"..." }] }
  quiz       { type:"quiz", question:"...", options:["A","B","C","D"], correctIndex:0 }
  truefalse  { type:"truefalse", question:"...", correct:true|false, feedbackCorrect?:"...", feedbackIncorrect?:"..." }
  shortanswer { type:"shortanswer", question:"...", answer:"...", acceptable?:["alt1"], caseSensitive?:false, trimWhitespace?:true }
  document   { type:"document", src:"https://...", fileType:"pdf"|"docx"|"xlsx"|"pptx", title?:"..." }
  divider    { type:"divider" }
  toc        { type:"toc" }

accordion and tabs item IDs are generated automatically — omit them.
position is 1-based and optional; omit to append at the end.`,
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block: z.record(z.unknown()), // validated against blockSchema after id injection
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_id, block, position }) =>
      withAuth(async (client, userId) => {
        // Inject a new id, inject sub-item IDs for accordion/tabs, then validate
        const withId = injectSubItemIds({ ...block, id: uid() });
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) {
          const msgs = formatZodErrors(parsed.error);
          return err("invalid_block_type", `Validation failed:\n${msgs.map(e => `- ${e}`).join("\n")}`);
        }
        const newBlock = parsed.data;
        const blockId = newBlock.id;

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
              const blocks = [...cl.blocks];
              const idx = position ? Math.min(position - 1, blocks.length) : blocks.length;
              blocks.splice(idx, 0, newBlock);
              return { ...l, blocks };
            }),
          };
        });

        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (mutError) return err(mutError, "Failed to add block");
        return ok({ block_id: blockId });
      })
  );

  server.tool(
    "update_block",
    "Update specific fields of a block (partial patch). Pass only the fields you want to change — type and id are preserved automatically. Text fields (e.g. text block \"text\" field) must be HTML (e.g. \"<p>content</p>\"), not markdown.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      fields: z.record(z.unknown()),
    },
    async ({ course_id, lesson_id, block_id, fields }) =>
      withAuth(async (client, userId) => {
        let assessmentError = false;
        let validationError: string | null = null;
        let blockNotFound = false;

        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if ((targetLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }

          // Find the block, merge fields, validate the result
          const cl = targetLesson as any;
          const existingBlock = cl?.blocks?.find((b: any) => b.id === block_id);
          if (!existingBlock) {
            blockNotFound = true;
            return course;
          }
          const merged = { ...existingBlock, ...fields, id: existingBlock.id, type: existingBlock.type };
          const parsed = blockSchema.safeParse(merged);
          if (!parsed.success) {
            validationError = `Validation failed:\n${formatZodErrors(parsed.error).map((e: string) => `- ${e}`).join("\n")}`;
            return course;
          }

          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const cl2 = l as any;
              return {
                ...l,
                blocks: cl2.blocks.map((b: any) =>
                  b.id === block_id ? ({ ...b, ...fields, id: b.id, type: b.type } as Block) : b
                ),
              };
            }),
          };
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (blockNotFound) return err("block_not_found", `No block with id ${block_id} in lesson ${lesson_id}`);
        if (validationError) return err("validation_error", validationError);
        if (mutError) return err(mutError, "Failed to update block");
        return ok({ message: "Block updated" });
      })
  );

  server.tool(
    "move_block",
    "Move a block to a new position, optionally to a different lesson. new_position is 1-based within the target lesson.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      new_position: z.number().int().positive(),
      target_lesson_id: z.string().uuid().optional(),
    },
    async ({ course_id, lesson_id, block_id, new_position, target_lesson_id }) =>
      withAuth(async (client, userId) => {
        const targetId = target_lesson_id ?? lesson_id;
        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const srcLesson = course.lessons.find((l) => l.id === lesson_id);
          const tgtLesson = course.lessons.find((l) => l.id === targetId);
          if ((srcLesson as any)?.kind === "assessment" || (tgtLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }

          // Find and remove block from source lesson
          let blockToMove: Block | undefined;
          const lessonsAfterRemove = course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            const cl = l as any;
            const idx = cl.blocks.findIndex((b: any) => b.id === block_id);
            if (idx === -1) return l;
            blockToMove = cl.blocks[idx];
            return { ...l, blocks: cl.blocks.filter((b: any) => b.id !== block_id) };
          });
          if (!blockToMove) return course;

          // Insert into target lesson at new_position
          const finalLessons = lessonsAfterRemove.map((l) => {
            if (l.id !== targetId) return l;
            const cl = l as any;
            const blocks = [...cl.blocks];
            const idx = Math.min(new_position - 1, blocks.length);
            blocks.splice(idx, 0, blockToMove!);
            return { ...l, blocks };
          });
          return { ...course, lessons: finalLessons };
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (mutError) return err(mutError, "Failed to move block");
        return ok({ message: "Block moved" });
      })
  );

  server.tool(
    "delete_block",
    "Remove a block from a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id, block_id }) =>
      withAuth(async (client, userId) => {
        let assessmentError = false;
        let blockNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if ((targetLesson as any)?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          const cl = targetLesson as any;
          if (!cl?.blocks?.some((b: any) => b.id === block_id)) {
            blockNotFound = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const cl2 = l as any;
              return { ...l, blocks: cl2.blocks.filter((b: any) => b.id !== block_id) };
            }),
          };
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (blockNotFound) return err("block_not_found", `No block with id ${block_id} in lesson ${lesson_id}`);
        if (mutError) return err(mutError, "Failed to delete block");
        return ok({ message: "Block deleted" });
      })
  );
}
