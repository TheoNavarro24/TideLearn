import type { Course } from "@/types/course";
import { validateCourse } from "./validate/course";
import { validateOps, type PatchOp } from "./validate/ops";

export function applyPatch(course: Course, ops: PatchOp[]): Course {
  validateCourse(course);
  validateOps(ops);
  // Mutation logic would go here
  return course;
}
