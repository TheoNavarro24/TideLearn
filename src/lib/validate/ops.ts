import { z } from "zod";
import { blockSchema, lessonSchema } from "./course";

const addLesson = z.object({
  op: z.literal("lesson.add"),
  lesson: lessonSchema,
  afterId: z.string().uuid().optional(),
});

const updateLesson = z.object({
  op: z.literal("lesson.update"),
  lessonId: z.string().uuid(),
  title: z.string().optional(),
});

const removeLesson = z.object({
  op: z.literal("lesson.remove"),
  lessonId: z.string().uuid(),
});

const moveLesson = z.object({
  op: z.literal("lesson.move"),
  lessonId: z.string().uuid(),
  afterId: z.string().uuid().optional(),
});

const addBlock = z.object({
  op: z.literal("block.add"),
  lessonId: z.string().uuid(),
  block: blockSchema,
  afterId: z.string().uuid().optional(),
});

const updateBlock = z.object({
  op: z.literal("block.update"),
  lessonId: z.string().uuid(),
  block: blockSchema,
});

const removeBlock = z.object({
  op: z.literal("block.remove"),
  lessonId: z.string().uuid(),
  blockId: z.string().uuid(),
});

const moveBlock = z.object({
  op: z.literal("block.move"),
  lessonId: z.string().uuid(),
  blockId: z.string().uuid(),
  afterId: z.string().uuid().optional(),
});

export const patchOpSchema = z.union([
  addLesson,
  updateLesson,
  removeLesson,
  moveLesson,
  addBlock,
  updateBlock,
  removeBlock,
  moveBlock,
]);

export type PatchOp = z.infer<typeof patchOpSchema>;

export function validateOps(ops: unknown): asserts ops is PatchOp[] {
  z.array(patchOpSchema).parse(ops);
}
