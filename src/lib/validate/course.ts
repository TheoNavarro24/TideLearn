import { factories, type Course } from "@/types/course";
import { z } from "zod";

const blockSchema = z
  .object({
    id: z.string().uuid(),
    type: z
      .string()
      .refine((t) => t in factories, {
        message: "Unknown block type",
      }),
  })
  .passthrough();

const lessonSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    blocks: z.array(blockSchema),
  })
  .passthrough();

const courseSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string(),
    lessons: z.array(lessonSchema),
  })
  .passthrough();

export function validateCourse(course: unknown): asserts course is Course {
  courseSchema.parse(course);
}

export { blockSchema, lessonSchema, courseSchema };
