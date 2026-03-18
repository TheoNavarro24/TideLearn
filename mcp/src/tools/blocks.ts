import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, blockSchema, type Block } from "../lib/types.js";
import { formatZodErrors } from "../lib/validate.js";

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

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map(l => {
            const blockUpdates = updateMap.get(l.id);
            if (!blockUpdates) return l;
            return {
              ...l,
              blocks: l.blocks.map(b => blockUpdates.get(b.id) ?? b),
            };
          }),
        }));

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
  accordion  { type:"accordion", items:[{ id:"<uuid>", title:"...", content:"..." }] }
  tabs       { type:"tabs", items:[{ id:"<uuid>", label:"...", content:"..." }] }
  quiz       { type:"quiz", question:"...", options:["A","B","C","D"], correctIndex:0 }
  truefalse  { type:"truefalse", question:"...", correct:true|false, feedbackCorrect?:"...", feedbackIncorrect?:"..." }
  shortanswer { type:"shortanswer", question:"...", answer:"...", acceptable?:["alt1"], caseSensitive?:false, trimWhitespace?:true }
  divider    { type:"divider" }
  toc        { type:"toc" }

accordion and tabs items require a UUID id field — generate one with crypto.randomUUID().
position is 1-based and optional; omit to append at the end.`,
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block: z.record(z.unknown()), // validated against blockSchema after id injection
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_id, block, position }) =>
      withAuth(async (client, userId) => {
        // Inject a new id and validate
        const withId = { ...block, id: uid() };
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) {
          return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");
        }
        const newBlock = parsed.data;
        const blockId = newBlock.id;

        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            const blocks = [...l.blocks];
            const idx = position ? Math.min(position - 1, blocks.length) : blocks.length;
            blocks.splice(idx, 0, newBlock);
            return { ...l, blocks };
          }),
        }));

        if (mutError) return err(mutError, "Failed to add block");
        return ok({ block_id: blockId });
      })
  );

  server.tool(
    "update_block",
    "Update specific fields of a block (partial patch). Pass only the fields you want to change — type and id are preserved automatically. Text fields are plain strings, not HTML.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      block_id: z.string().uuid(),
      fields: z.record(z.unknown()),
    },
    async ({ course_id, lesson_id, block_id, fields }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            return {
              ...l,
              blocks: l.blocks.map((b) =>
                b.id === block_id ? ({ ...b, ...fields, id: b.id, type: b.type } as Block) : b
              ),
            };
          }),
        }));
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
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          // Find and remove block from source lesson
          let blockToMove: Block | undefined;
          const lessonsAfterRemove = course.lessons.map((l) => {
            if (l.id !== lesson_id) return l;
            const idx = l.blocks.findIndex((b) => b.id === block_id);
            if (idx === -1) return l;
            blockToMove = l.blocks[idx];
            return { ...l, blocks: l.blocks.filter((b) => b.id !== block_id) };
          });
          if (!blockToMove) return course;

          // Insert into target lesson at new_position
          const finalLessons = lessonsAfterRemove.map((l) => {
            if (l.id !== targetId) return l;
            const blocks = [...l.blocks];
            const idx = Math.min(new_position - 1, blocks.length);
            blocks.splice(idx, 0, blockToMove!);
            return { ...l, blocks };
          });
          return { ...course, lessons: finalLessons };
        });
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
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, blocks: l.blocks.filter((b) => b.id !== block_id) }
          ),
        }));
        if (mutError) return err(mutError, "Failed to delete block");
        return ok({ message: "Block deleted" });
      })
  );
}
