import { describe, it, expect } from "vitest";
import { validateCourseJson } from "../src/lib/validate.js";
import { ALL_BLOCKS } from "./fixtures/blocks.js";

describe("validateCourseJson — valid courses", () => {
  it("accepts course with all 17 block types", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "All Blocks",
      lessons: [{ kind: "content", id: "l1", title: "L1", blocks: ALL_BLOCKS }],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts course with only an assessment lesson", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Assessment Only",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Final Exam",
        questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
        config: { passingScore: 80, examSize: 10 },
      }],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts course with 0 lessons", () => {
    const result = validateCourseJson({ schemaVersion: 1, title: "Empty", lessons: [] });
    expect(result.ok).toBe(true);
  });
});

describe("validateCourseJson — invalid cases", () => {
  it("rejects missing schemaVersion", () => {
    const result = validateCourseJson({ title: "No Version", lessons: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.includes("schemaVersion"))).toBe(true);
  });

  it("rejects schemaVersion: 2", () => {
    const result = validateCourseJson({ schemaVersion: 2, title: "Wrong Version", lessons: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects lesson missing kind", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Test",
      lessons: [{ id: "l1", title: "No Kind", blocks: [] }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects assessment lesson with 3-option question (tuple requires exactly 4)", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Exam",
        questions: [{ id: "q1", text: "Q?", options: ["A","B","C"], correctIndex: 0 }],
        config: {},
      }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects assessment question with correctIndex: 5 (max 3)", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Exam",
        questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 5 }],
        config: {},
      }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects course missing title", () => {
    const result = validateCourseJson({ schemaVersion: 1, lessons: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects lessons not being an array", () => {
    const result = validateCourseJson({ schemaVersion: 1, title: "T", lessons: "not-an-array" });
    expect(result.ok).toBe(false);
  });

  it("returns errors as array of readable strings", () => {
    const result = validateCourseJson({ title: "No Version", lessons: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(typeof result.errors[0]).toBe("string");
    }
  });
});

describe("validateCourseJson — passthrough behaviour", () => {
  it("content lesson with extra fields (passthrough schema) passes", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [], extraField: true }],
    });
    expect(result.ok).toBe(true);
  });

  it("assessment question with extra fields (passthrough schema) passes", () => {
    const result = validateCourseJson({
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Exam",
        questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0, bloomLevel: "K", source: "M1" }],
        config: { passingScore: 75 },
      }],
    });
    expect(result.ok).toBe(true);
  });

  it("returns course object typed correctly on success", () => {
    const result = validateCourseJson({ schemaVersion: 1, title: "T", lessons: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.course.schemaVersion).toBe(1);
      expect(result.course.title).toBe("T");
    }
  });
});
