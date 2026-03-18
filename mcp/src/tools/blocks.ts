import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid, blockSchema, type Block } from "../lib/types.js";

export function registerBlockTools(server: McpServer) {
  server.tool(
    "list_blocks",
    "List all blocks in a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lesson = (data.content as any).lessons?.find((l: any) => l.id === lesson_id);
        if (!lesson) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        return ok(lesson.blocks.map((b: any, i: number) => ({ id: b.id, type: b.type, position: i + 1 })));
      })
  );

  server.tool(
    "add_block",
    "Add a block to a lesson. Omit the 'id' field — it will be generated automatically.",
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
    "Update specific fields of a block (partial patch). Rich text fields (text, content) must be valid HTML strings.",
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
