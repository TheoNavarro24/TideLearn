import { describe, it, expect } from "vitest";

// Inline copies of grading functions for testing (frontend src not importable from MCP)
function gradeFillInBlank(
  blanks: Array<{ acceptable: string[]; caseSensitive?: boolean }>,
  inputs: string[]
): boolean {
  return blanks.every((blank, i) => {
    const input = (inputs[i] ?? "").trim();
    return blank.acceptable.some((a) =>
      blank.caseSensitive ? a === input : a.toLowerCase() === input.toLowerCase()
    );
  });
}

function gradeMatching(
  pairs: Array<{ leftId: string; rightId: string }>,
  selections: Record<string, string>
): boolean {
  return pairs.every((p) => selections[p.leftId] === p.rightId);
}

describe("gradeFillInBlank", () => {
  it("correct when all blanks answered correctly (case-insensitive by default)", () => {
    const blanks = [{ acceptable: ["Paris"] }, { acceptable: ["France"] }];
    expect(gradeFillInBlank(blanks, ["paris", "FRANCE"])).toBe(true);
  });

  it("incorrect when one blank is wrong", () => {
    const blanks = [{ acceptable: ["Paris"] }, { acceptable: ["France"] }];
    expect(gradeFillInBlank(blanks, ["Paris", "Germany"])).toBe(false);
  });

  it("respects caseSensitive flag", () => {
    const blanks = [{ acceptable: ["Paris"], caseSensitive: true }];
    expect(gradeFillInBlank(blanks, ["paris"])).toBe(false);
    expect(gradeFillInBlank(blanks, ["Paris"])).toBe(true);
  });

  it("accepts any of multiple acceptable answers", () => {
    const blanks = [{ acceptable: ["UK", "United Kingdom", "Britain"] }];
    expect(gradeFillInBlank(blanks, ["Britain"])).toBe(true);
  });

  it("incorrect when blank is empty", () => {
    const blanks = [{ acceptable: ["Paris"] }];
    expect(gradeFillInBlank(blanks, [""])).toBe(false);
  });
});

describe("gradeMatching", () => {
  it("correct when all pairs selected correctly", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }];
    const selections = { l1: "r1", l2: "r2" };
    expect(gradeMatching(pairs, selections)).toBe(true);
  });

  it("incorrect when one pair is wrong", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }];
    const selections = { l1: "r1", l2: "r1" }; // l2 matched to wrong right
    expect(gradeMatching(pairs, selections)).toBe(false);
  });

  it("incorrect when a pair is unselected", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }];
    const selections = {}; // nothing selected
    expect(gradeMatching(pairs, selections)).toBe(false);
  });
});
