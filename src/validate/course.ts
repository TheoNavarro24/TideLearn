import { z } from "zod"
import type { Course } from "@/types/course"

const blockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough()

const contentLessonSchema = z.object({
  kind: z.literal("content"),
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
}).passthrough()

const assessmentLessonSchema = z.object({
  kind: z.literal("assessment"),
  id: z.string(),
  title: z.string(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
  }).passthrough()),
  config: z.object({}).passthrough(),
}).passthrough()

const lessonSchema = z.discriminatedUnion("kind", [
  contentLessonSchema,
  assessmentLessonSchema,
])

const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
})

export function validateCourse(data: unknown): { ok: boolean; course?: Course; summary: string } {
  const parsed = courseSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, summary: parsed.error.errors.map(e => e.message).join("; ") }
  }
  return { ok: true, course: parsed.data as Course, summary: `${parsed.data.lessons.length} lessons` }
}
