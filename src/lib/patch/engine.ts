import type { Course } from "@/types/course";
import type { Patch, PatchOp } from "./types";

export type PatchReport = {
  upsertedLessons: number;
  appendedBlocks: number;
  updatedBlocks: number;
  removedBlocks: number;
  warnings: string[];
};

type ApplyPatchOk = { ok: true; course: Course; report: PatchReport };
type ApplyPatchErr = { ok: false; course: Course; error: string; report: PatchReport };
export type ApplyPatchResult = ApplyPatchOk | ApplyPatchErr;

export function applyPatch(course: Course, patch: Patch): ApplyPatchResult {
  const working: Course = JSON.parse(JSON.stringify(course));
  const report: PatchReport = {
    upsertedLessons: 0,
    appendedBlocks: 0,
    updatedBlocks: 0,
    removedBlocks: 0,
    warnings: [],
  };

  try {
    for (const op of patch.ops) {
      handleOp(working, op, report);
    }
    return { ok: true, course: working, report };
  } catch (err) {
    return {
      ok: false,
      course,
      error: err instanceof Error ? err.message : String(err),
      report,
    };
  }
}

function handleOp(course: Course, op: PatchOp, report: PatchReport) {
  switch (op.type) {
    case "upsertLesson": {
      const index = course.lessons.findIndex((l) => l.id === op.lesson.id);
      if (index >= 0) {
        course.lessons[index] = op.lesson;
      } else {
        course.lessons.push(op.lesson);
      }
      report.upsertedLessons++;
      return;
    }
    case "appendBlocks": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`appendBlocks: lesson ${op.lessonId} not found`);
        return;
      }
      for (const block of op.blocks) {
        if (lesson.blocks.some((b) => b.id === block.id)) {
          report.warnings.push(`appendBlocks: block ${block.id} already exists in lesson ${op.lessonId}`);
        } else {
          lesson.blocks.push(block);
          report.appendedBlocks++;
        }
      }
      return;
    }
    case "updateBlock": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`updateBlock: lesson ${op.lessonId} not found`);
        return;
      }
      const index = lesson.blocks.findIndex((b) => b.id === op.block.id);
      if (index < 0) {
        report.warnings.push(`updateBlock: block ${op.block.id} not found in lesson ${op.lessonId}`);
        return;
      }
      lesson.blocks[index] = op.block;
      report.updatedBlocks++;
      return;
    }
    case "removeBlock": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`removeBlock: lesson ${op.lessonId} not found`);
        return;
      }
      const index = lesson.blocks.findIndex((b) => b.id === op.blockId);
      if (index < 0) {
        report.warnings.push(`removeBlock: block ${op.blockId} not found in lesson ${op.lessonId}`);
        return;
      }
      lesson.blocks.splice(index, 1);
      report.removedBlocks++;
      return;
    }
    default: {
      const _exhaust: never = op;
      throw new Error(`Unknown op type: ${(op as { type: string }).type}`);
    }
  }
}
