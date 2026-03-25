import { describe, it, expect } from "vitest";
import { injectQuestionSubItemIds, injectPartialQuestionSubItemIds } from "../assessment.js";

describe("injectQuestionSubItemIds", () => {
  it("mcq: injects top-level id only", () => {
    const q = { kind: "mcq", text: "Q", options: ["A","B","C","D"], correctIndex: 0 };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.kind).toBe("mcq");
  });

  it("fillinblank: injects id on each blank", () => {
    const q = {
      kind: "fillinblank", text: "The {{1}} is red.",
      blanks: [{ acceptable: ["sky"] }],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.blanks[0].id).toBeTruthy();
  });

  it("matching: injects ids on left+right, converts index pairs to id pairs", () => {
    const q = {
      kind: "matching", text: "Match them",
      left: [{ label: "A" }, { label: "B" }],
      right: [{ label: "1" }, { label: "2" }],
      pairs: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 1, rightIndex: 0 }],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.left[0].id).toBeTruthy();
    expect(result.right[0].id).toBeTruthy();
    expect(result.pairs[0].leftId).toBe(result.left[0].id);
    expect(result.pairs[0].rightId).toBe(result.right[1].id);
  });

  it("sorting: injects ids on buckets+items, converts bucketIndex to bucketId", () => {
    const q = {
      kind: "sorting", text: "Sort them",
      buckets: [{ label: "Even" }, { label: "Odd" }],
      items: [
        { text: "2", bucketIndex: 0 },
        { text: "3", bucketIndex: 1 },
      ],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.buckets[0].id).toBeTruthy();
    expect(result.items[0].bucketId).toBe(result.buckets[0].id);
    expect(result.items[1].bucketId).toBe(result.buckets[1].id);
  });

  it("sorting question: injects ids on buckets and items, converts bucketIndex to bucketId", () => {
    const q = {
      kind: "sorting", text: "Sort the items",
      buckets: [{ label: "Even" }, { label: "Odd" }],
      items: [{ text: "2", bucketIndex: 0 }, { text: "3", bucketIndex: 1 }, { text: "4", bucketIndex: 0 }],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.buckets[0].id).toBeTruthy();
    expect(result.items[0].bucketId).toBe(result.buckets[0].id); // 2 → Even
    expect(result.items[1].bucketId).toBe(result.buckets[1].id); // 3 → Odd
    expect(result.items[2].bucketId).toBe(result.buckets[0].id); // 4 → Even
  });

  it("sorting question: items without matching bucketIndex get a fallback id", () => {
    const q = {
      kind: "sorting", text: "Sort",
      buckets: [{ label: "A" }],
      items: [{ text: "x", bucketIndex: 99 }], // invalid index
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.items[0].bucketId).toBeTruthy(); // should not throw
  });

  it("multipleresponse: injects id only (options are plain strings)", () => {
    const q = {
      kind: "multipleresponse", text: "Select all",
      options: ["A", "B", "C"], correctIndices: [0, 2],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.correctIndices).toEqual([0, 2]);
  });
});

describe("injectPartialQuestionSubItemIds", () => {
  it("injects ids on new blanks", () => {
    const result = injectPartialQuestionSubItemIds({
      blanks: [{ acceptable: ["sky"] }],
    });
    expect(result.blanks[0].id).toBeTruthy();
  });

  it("preserves existing blank ids", () => {
    const result = injectPartialQuestionSubItemIds({
      blanks: [{ id: "existing-id", acceptable: ["sky"] }],
    });
    expect(result.blanks[0].id).toBe("existing-id");
  });
});
