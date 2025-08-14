import { describe, expect, it } from "vitest";
import { applyPatch, type ApplyPatchResult } from "./engine";
import type { Patch } from "./types";
import { createSeedCourse } from "../seed/course";

describe("patch engine", () => {
  it("handles all operation types", () => {
    const seed = createSeedCourse();
    const patch: Patch = {
      ops: [
        {
          type: "upsertLesson",
          lesson: { id: "00000000-0000-0000-0000-000000000002", title: "Lesson 2", blocks: [] },
        },
        {
          type: "appendBlocks",
          lessonId: "00000000-0000-0000-0000-000000000001",
          blocks: [{ id: "00000000-0000-0000-0000-000000000102", type: "text", text: "New" }],
        },
        {
          type: "updateBlock",
          lessonId: "00000000-0000-0000-0000-000000000001",
          block: { id: "00000000-0000-0000-0000-000000000102", type: "text", text: "Updated" },
        },
        { type: "removeBlock", lessonId: "00000000-0000-0000-0000-000000000001", blockId: "00000000-0000-0000-0000-000000000101" },
      ],
    };
    const result = applyPatch(seed, patch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report).toMatchObject({
        upsertedLessons: 1,
        appendedBlocks: 1,
        updatedBlocks: 1,
        removedBlocks: 1,
        warnings: [],
      });
      const lesson1 = result.course.lessons.find((l) => l.id === "00000000-0000-0000-0000-000000000001");
      expect(lesson1?.blocks).toHaveLength(1);
      expect(lesson1?.blocks[0].id).toBe("00000000-0000-0000-0000-000000000102");
      const lesson2 = result.course.lessons.find((l) => l.id === "00000000-0000-0000-0000-000000000002");
      expect(lesson2).toBeTruthy();
    }
  });

  it("rolls back on unknown op type", () => {
    const seed = createSeedCourse();
    const snapshot = JSON.parse(JSON.stringify(seed));
    const patch = { ops: [{ type: "badOp" }] } as unknown as Patch;
    const result: ApplyPatchResult = applyPatch(seed, patch);
    expect(result.ok).toBe(false);
    expect(result.course).toEqual(snapshot);
    expect(seed).toEqual(snapshot); // original untouched
  });

  it("preserves original course ids", () => {
    const seed = createSeedCourse();
    const snapshot = JSON.parse(JSON.stringify(seed));
    const patch: Patch = {
      ops: [
        {
          type: "appendBlocks",
          lessonId: "00000000-0000-0000-0000-000000000001",
          blocks: [{ id: "00000000-0000-0000-0000-000000000102", type: "text", text: "New" }],
        },
      ],
    };
    const result = applyPatch(seed, patch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.course.lessons[0].id).toBe("00000000-0000-0000-0000-000000000001");
      expect(result.course.lessons[0].blocks[1].id).toBe("00000000-0000-0000-0000-000000000102");
    }
    expect(seed).toEqual(snapshot);
  });
});
