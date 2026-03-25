import { describe, it, expect } from "vitest";
import { injectIds, injectLessonIds } from "../semantic.js";

describe("injectIds", () => {
  it("injects ids into lessons and blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "text", text: "Hello" }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBeDefined();
    expect(result.lessons[0].kind).toBe("content");
    expect(result.lessons[0].blocks[0].id).toBeDefined();
  });

  it("preserves existing ids", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { id: "keep-lesson", title: "L1", blocks: [{ id: "keep-block", type: "text", text: "Hello" }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBe("keep-lesson");
    expect(result.lessons[0].blocks[0].id).toBe("keep-block");
  });

  it("handles assessment lessons", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { kind: "assessment", title: "Quiz", questions: [{ text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBeDefined();
    expect(result.lessons[0].kind).toBe("assessment");
    expect((result.lessons[0] as any).questions[0].id).toBeDefined();
  });

  it("defaults to kind: content when kind is missing", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [{ type: "text", text: "Hello" }] }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("content");
  });

  it("injects sub-item ids into accordion blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "accordion", items: [{ title: "S1", content: "C1" }] }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].blocks[0].items[0].id).toBeDefined();
  });

  it("injects sub-item ids into timeline blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "timeline", items: [{ date: "2024", title: "Launch" }] }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].blocks[0].items[0].id).toBeDefined();
  });

  it("handles empty lessons array", () => {
    const course = { schemaVersion: 1, title: "Test", lessons: [] };
    const result = injectIds(course);
    expect(result.lessons).toEqual([]);
  });
});

describe("injectLessonIds", () => {
  it("injects ids into a content lesson", () => {
    const lesson = { title: "L1", blocks: [{ type: "text", text: "Hello" }] };
    const result = injectLessonIds(lesson);
    expect(result.id).toBeDefined();
    expect(result.kind).toBe("content");
    expect(result.blocks[0].id).toBeDefined();
  });

  it("injects ids into an assessment lesson", () => {
    const lesson = {
      kind: "assessment",
      title: "Quiz",
      questions: [{ text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 }],
    };
    const result = injectLessonIds(lesson);
    expect(result.id).toBeDefined();
    expect(result.kind).toBe("assessment");
    expect((result as any).questions[0].id).toBeDefined();
  });

  it("always generates a new lesson id (not preserving)", () => {
    const lesson = { id: "old-id", title: "L1", blocks: [] };
    const result = injectLessonIds(lesson);
    expect(result.id).toBeDefined();
    expect(result.id).not.toBe("old-id");
  });
});
