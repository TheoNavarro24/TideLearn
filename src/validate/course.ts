import { z } from "zod"
import type { Course } from "@/types/course"

const blockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough()

const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
})

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
