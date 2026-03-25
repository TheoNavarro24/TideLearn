import { describe, it, expect } from "vitest";
import {
  advanceBox,
  isEligible,
  weaknessScore,
  generateStudySession,
  generateExamSession,
  generateWeakAreaSession,
  gradeMultipleResponse,
  gradeFillInBlank,
  gradeMatching,
  gradeSorting,
  shuffle,
  defaultQuestionProgress,
  type QuestionProgress,
} from "@/lib/assessment";
import type { AssessmentQuestion } from "@/types/course";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProgress(overrides: Partial<QuestionProgress> = {}): QuestionProgress {
  return { ...defaultQuestionProgress(), ...overrides };
}

function makeMCQ(id: string): AssessmentQuestion {
  return {
    kind: "mcq",
    id,
    text: `Question ${id}`,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
  };
}

// ─── advanceBox ──────────────────────────────────────────────────────────────

describe("advanceBox", () => {
  it("advances box from 1 to 2 on correct answer", () => {
    const p = makeProgress({ box: 1, testCount: 0, correctCount: 0 });
    const result = advanceBox(p, true);
    expect(result.box).toBe(2);
  });

  it("advances box from 3 to 4 on correct answer", () => {
    const p = makeProgress({ box: 3, testCount: 4, correctCount: 3 });
    const result = advanceBox(p, true);
    expect(result.box).toBe(4);
  });

  it("does not exceed box 4 on correct answer", () => {
    const p = makeProgress({ box: 4, testCount: 8, correctCount: 7 });
    const result = advanceBox(p, true);
    expect(result.box).toBe(4);
  });

  it("resets box to 1 on incorrect answer", () => {
    const p = makeProgress({ box: 3, testCount: 4, correctCount: 3 });
    const result = advanceBox(p, false);
    expect(result.box).toBe(1);
  });

  it("increments testCount and correctCount on correct answer", () => {
    const p = makeProgress({ box: 1, testCount: 5, correctCount: 3 });
    const result = advanceBox(p, true);
    expect(result.testCount).toBe(6);
    expect(result.correctCount).toBe(4);
  });

  it("increments testCount only on incorrect answer", () => {
    const p = makeProgress({ box: 2, testCount: 3, correctCount: 2 });
    const result = advanceBox(p, false);
    expect(result.testCount).toBe(4);
    expect(result.correctCount).toBe(2);
  });

  it("records lastMissConfidence on incorrect answer with confidence", () => {
    const p = makeProgress({ box: 2, testCount: 2, correctCount: 1 });
    const result = advanceBox(p, false, "high");
    expect(result.lastMissConfidence).toBe("high");
  });

  it("increments highConfidenceMisses on high-confidence incorrect answer", () => {
    const p = makeProgress({ box: 3, testCount: 4, correctCount: 3, highConfidenceMisses: 1 });
    const result = advanceBox(p, false, "high");
    expect(result.highConfidenceMisses).toBe(2);
  });
});

// ─── isEligible ──────────────────────────────────────────────────────────────

describe("isEligible", () => {
  it("box 1 is always eligible regardless of testCount", () => {
    expect(isEligible(makeProgress({ box: 1, testCount: 0 }))).toBe(true);
    expect(isEligible(makeProgress({ box: 1, testCount: 7 }))).toBe(true);
  });

  it("box 2 is eligible when testCount is divisible by 2", () => {
    expect(isEligible(makeProgress({ box: 2, testCount: 4 }))).toBe(true);
  });

  it("box 2 is not eligible when testCount is odd", () => {
    expect(isEligible(makeProgress({ box: 2, testCount: 3 }))).toBe(false);
  });

  it("box 3 is eligible when testCount is divisible by 4", () => {
    expect(isEligible(makeProgress({ box: 3, testCount: 8 }))).toBe(true);
  });

  it("box 3 is not eligible when testCount is not divisible by 4", () => {
    expect(isEligible(makeProgress({ box: 3, testCount: 6 }))).toBe(false);
  });

  it("box 4 is eligible when testCount is divisible by 8", () => {
    expect(isEligible(makeProgress({ box: 4, testCount: 16 }))).toBe(true);
  });

  it("box 4 is not eligible when testCount is not divisible by 8", () => {
    expect(isEligible(makeProgress({ box: 4, testCount: 12 }))).toBe(false);
  });
});

// ─── weaknessScore ───────────────────────────────────────────────────────────

describe("weaknessScore", () => {
  it("returns 0 for a question never tested", () => {
    const p = makeProgress({ testCount: 0 });
    expect(weaknessScore(p)).toBe(0);
  });

  it("low accuracy in box 1 yields high score", () => {
    // box 1 weight = 4; 0/4 correct → incorrectRatio=1 → score = 1*4 = 4
    const p = makeProgress({ box: 1, testCount: 4, correctCount: 0, highConfidenceMisses: 0 });
    expect(weaknessScore(p)).toBe(4);
  });

  it("high confidence misses add to score", () => {
    // box 1 weight = 4; 50% correct → incorrectRatio=0.5 → 0.5*4 + 2*2 = 6
    const p = makeProgress({ box: 1, testCount: 4, correctCount: 2, highConfidenceMisses: 2 });
    expect(weaknessScore(p)).toBe(6);
  });

  it("perfect accuracy yields weakness score of 0 (ignoring highConfidenceMisses)", () => {
    // incorrectRatio = 0, highConfidenceMisses = 0 → score = 0
    const p = makeProgress({ box: 4, testCount: 8, correctCount: 8, highConfidenceMisses: 0 });
    expect(weaknessScore(p)).toBe(0);
  });

  it("higher box weight means lower weakness score for same accuracy", () => {
    // box 4 weight = 1, box 1 weight = 4 — same 50% incorrect
    const highBox = makeProgress({ box: 4, testCount: 4, correctCount: 2, highConfidenceMisses: 0 });
    const lowBox = makeProgress({ box: 1, testCount: 4, correctCount: 2, highConfidenceMisses: 0 });
    expect(weaknessScore(highBox)).toBeLessThan(weaknessScore(lowBox));
  });
});

// ─── generateStudySession ────────────────────────────────────────────────────

describe("generateStudySession", () => {
  it("includes questions with no progress (never seen)", () => {
    const questions = [makeMCQ("q1"), makeMCQ("q2")];
    const result = generateStudySession(questions, {});
    expect(result).toHaveLength(2);
  });

  it("excludes questions not yet due (box 2, odd testCount)", () => {
    const questions = [makeMCQ("q1"), makeMCQ("q2")];
    const progressMap = {
      q1: makeProgress({ box: 2, testCount: 3 }), // not eligible
      q2: makeProgress({ box: 1, testCount: 1 }), // always eligible
    };
    const result = generateStudySession(questions, progressMap);
    expect(result.map((q) => q.id)).toContain("q2");
    expect(result.map((q) => q.id)).not.toContain("q1");
  });

  it("includes only eligible questions across a mixed set", () => {
    const questions = [makeMCQ("q1"), makeMCQ("q2"), makeMCQ("q3")];
    const progressMap = {
      q1: makeProgress({ box: 1, testCount: 5 }),  // eligible (box 1)
      q2: makeProgress({ box: 3, testCount: 8 }),  // eligible (8 % 4 === 0)
      q3: makeProgress({ box: 3, testCount: 6 }),  // not eligible (6 % 4 !== 0)
    };
    const result = generateStudySession(questions, progressMap);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("q1");
    expect(ids).toContain("q2");
    expect(ids).not.toContain("q3");
  });
});

// ─── generateExamSession ─────────────────────────────────────────────────────

describe("generateExamSession", () => {
  it("returns at most `size` questions", () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeMCQ(`q${i}`));
    const result = generateExamSession(questions, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns all questions when size >= pool length", () => {
    const questions = [makeMCQ("q1"), makeMCQ("q2"), makeMCQ("q3")];
    const result = generateExamSession(questions, 10);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when questions pool is empty", () => {
    expect(generateExamSession([], 5)).toHaveLength(0);
  });
});

// ─── generateWeakAreaSession ─────────────────────────────────────────────────

describe("generateWeakAreaSession", () => {
  it("excludes never-seen questions", () => {
    const questions = [makeMCQ("q1"), makeMCQ("q2")];
    const progressMap = {
      q1: makeProgress({ testCount: 0 }), // never seen
      q2: makeProgress({ box: 1, testCount: 4, correctCount: 0 }), // has history
    };
    const result = generateWeakAreaSession(questions, progressMap);
    expect(result.map((q) => q.id)).not.toContain("q1");
    expect(result.map((q) => q.id)).toContain("q2");
  });

  it("returns questions sorted by weakness score descending", () => {
    const questions = [makeMCQ("strong"), makeMCQ("weak")];
    const progressMap = {
      strong: makeProgress({ box: 4, testCount: 8, correctCount: 8, highConfidenceMisses: 0 }),
      weak: makeProgress({ box: 1, testCount: 4, correctCount: 0, highConfidenceMisses: 3 }),
    };
    const result = generateWeakAreaSession(questions, progressMap);
    expect(result[0].id).toBe("weak");
  });

  it("respects the size cap", () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeMCQ(`q${i}`));
    const progressMap = Object.fromEntries(
      questions.map((q) => [q.id, makeProgress({ testCount: 4, correctCount: 1 })])
    );
    const result = generateWeakAreaSession(questions, progressMap, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

// ─── gradeMultipleResponse ───────────────────────────────────────────────────

describe("gradeMultipleResponse", () => {
  it("returns true when all correct indices are selected and nothing extra", () => {
    expect(gradeMultipleResponse([0, 2], [0, 2])).toBe(true);
  });

  it("returns false when a correct index is missing", () => {
    expect(gradeMultipleResponse([0, 2], [0])).toBe(false);
  });

  it("returns false when an extra incorrect index is selected", () => {
    expect(gradeMultipleResponse([0, 2], [0, 1, 2])).toBe(false);
  });

  it("returns true for single correct index", () => {
    expect(gradeMultipleResponse([1], [1])).toBe(true);
  });

  it("returns false when completely wrong selection", () => {
    expect(gradeMultipleResponse([0, 1], [2, 3])).toBe(false);
  });
});

// ─── gradeFillInBlank ────────────────────────────────────────────────────────

describe("gradeFillInBlank", () => {
  it("returns true for exact case-insensitive match", () => {
    const blanks = [{ acceptable: ["Paris"] }];
    expect(gradeFillInBlank(blanks, ["paris"])).toBe(true);
  });

  it("returns false for wrong answer", () => {
    const blanks = [{ acceptable: ["Paris"] }];
    expect(gradeFillInBlank(blanks, ["London"])).toBe(false);
  });

  it("returns true for case-sensitive exact match", () => {
    const blanks = [{ acceptable: ["Paris"], caseSensitive: true }];
    expect(gradeFillInBlank(blanks, ["Paris"])).toBe(true);
  });

  it("returns false for case mismatch when caseSensitive is true", () => {
    const blanks = [{ acceptable: ["Paris"], caseSensitive: true }];
    expect(gradeFillInBlank(blanks, ["paris"])).toBe(false);
  });

  it("returns true when all blanks are correct", () => {
    const blanks = [{ acceptable: ["red"] }, { acceptable: ["blue"] }];
    expect(gradeFillInBlank(blanks, ["red", "blue"])).toBe(true);
  });

  it("returns false when one blank is wrong", () => {
    const blanks = [{ acceptable: ["red"] }, { acceptable: ["blue"] }];
    expect(gradeFillInBlank(blanks, ["red", "green"])).toBe(false);
  });

  it("trims whitespace from user input", () => {
    const blanks = [{ acceptable: ["Paris"] }];
    expect(gradeFillInBlank(blanks, ["  Paris  "])).toBe(true);
  });
});

// ─── gradeMatching ───────────────────────────────────────────────────────────

describe("gradeMatching", () => {
  it("returns true when all pairs match correctly", () => {
    const pairs = [
      { leftId: "l1", rightId: "r1" },
      { leftId: "l2", rightId: "r2" },
    ];
    const selections = { l1: "r1", l2: "r2" };
    expect(gradeMatching(pairs, selections)).toBe(true);
  });

  it("returns false when one pair is wrong", () => {
    const pairs = [
      { leftId: "l1", rightId: "r1" },
      { leftId: "l2", rightId: "r2" },
    ];
    const selections = { l1: "r1", l2: "r1" }; // l2 mapped to wrong right
    expect(gradeMatching(pairs, selections)).toBe(false);
  });

  it("returns false when a pair is missing from selections", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }];
    const selections = { l1: "r1" }; // l2 not selected
    expect(gradeMatching(pairs, selections)).toBe(false);
  });
});

// ─── gradeSorting ────────────────────────────────────────────────────────────

describe("gradeSorting", () => {
  it("returns true when all items are in correct buckets", () => {
    const items = [
      { id: "i1", bucketId: "b1" },
      { id: "i2", bucketId: "b2" },
    ];
    const placements = { i1: "b1", i2: "b2" };
    expect(gradeSorting(items, placements)).toBe(true);
  });

  it("returns false when one item is in the wrong bucket", () => {
    const items = [
      { id: "i1", bucketId: "b1" },
      { id: "i2", bucketId: "b2" },
    ];
    const placements = { i1: "b2", i2: "b2" }; // i1 in wrong bucket
    expect(gradeSorting(items, placements)).toBe(false);
  });

  it("returns false when an item has no placement", () => {
    const items = [{ id: "i1", bucketId: "b1" }];
    const placements = {}; // i1 not placed
    expect(gradeSorting(items, placements)).toBe(false);
  });
});

// ─── shuffle ─────────────────────────────────────────────────────────────────

describe("shuffle", () => {
  it("returns an array of the same length", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it("contains all the same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual([...arr].sort());
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });
});
