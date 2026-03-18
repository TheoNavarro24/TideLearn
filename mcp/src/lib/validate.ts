import { ZodError } from "zod";
import { courseSchema, type Course } from "./types.js";

/** Convert a ZodError into readable plain-English strings with field paths. */
export function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

/** Validate a raw JSON object as a Course. Used by save_course before writing. */
export function validateCourseJson(
  json: unknown
): { ok: true; course: Course } | { ok: false; errors: string[] } {
  const parsed = courseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, errors: formatZodErrors(parsed.error) };
  }
  return { ok: true, course: parsed.data };
}
