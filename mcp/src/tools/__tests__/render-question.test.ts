import { describe, it, expect } from "vitest";
import { renderQuestion } from "../preview.js";

describe("renderQuestion", () => {
  it("mcq: renders question with correct answer marked", () => {
    const q = { kind: "mcq", text: "Q?", options: ["A","B","C","D"], correctIndex: 1 };
    const result = renderQuestion(q);
    expect(result).toContain("Q?");
    expect(result).toContain("✓");
    expect(result).toContain("B");
  });

  it("multipleresponse: shows multiple correct answers", () => {
    const q = { kind: "multipleresponse", text: "Select all", options: ["A","B","C"], correctIndices: [0, 2] };
    const result = renderQuestion(q);
    expect(result).toContain("Select all");
    expect(result).toContain("✓");
  });

  it("fillinblank: shows blank count or template", () => {
    const q = {
      kind: "fillinblank", text: "The {{1}} is {{2}}.",
      blanks: [{ id: "a", acceptable: ["sky"] }, { id: "b", acceptable: ["blue"] }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("Fill-in-the-blank");
    expect(result).toBeTruthy();
  });

  it("matching: shows prompt", () => {
    const q = {
      kind: "matching", text: "Match",
      left: [{ id: "l1", label: "A" }, { id: "l2", label: "B" }],
      right: [{ id: "r1", label: "1" }, { id: "r2", label: "2" }],
      pairs: [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("Match");
    expect(result).toBeTruthy();
  });

  it("sorting: shows items with correct buckets", () => {
    const q = {
      kind: "sorting", text: "Sort these",
      buckets: [{ id: "b1", label: "Even" }, { id: "b2", label: "Odd" }],
      items: [{ id: "i1", text: "2", bucketId: "b1" }, { id: "i2", text: "3", bucketId: "b2" }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("Sort these");
    expect(result).toContain("2");
    expect(result).toContain("Even");
  });

  it("unknown kind: renders fallback with kind name", () => {
    const result = renderQuestion({ kind: "unknown_future_type" });
    expect(result).toContain("Unknown question kind");
    expect(result).toContain("unknown_future_type");
  });
});
