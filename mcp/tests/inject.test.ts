import { describe, it, expect } from "vitest";

import { validateCourseJson } from "../src/lib/validate.js";
import { injectIds, injectLessonIds } from "../src/tools/semantic.js";

describe("injectIds", () => {
  it("adds kind:content to lessons without kind", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [] }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("content");
  });

  it("injects id into each lesson", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [] }],
    };
    const result = injectIds(course);
    expect(typeof result.lessons[0].id).toBe("string");
    expect(result.lessons[0].id.length).toBeGreaterThan(0);
  });

  it("injects ids into assessment lesson questions", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [
          { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
          { text: "Q2", options: ["A", "B", "C", "D"], correctIndex: 1 },
        ],
        config: { passingScore: 80, examSize: 20 },
      }],
    };
    const result = injectIds(course);
    expect(typeof result.lessons[0].questions[0].id).toBe("string");
    expect(typeof result.lessons[0].questions[1].id).toBe("string");
  });

  it("injects ids into accordion item sub-items", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "accordion",
          items: [
            { title: "Section 1", content: "Content 1" },
            { title: "Section 2", content: "Content 2" },
          ],
        }],
      }],
    };
    const result = injectIds(course);
    const block = result.lessons[0].blocks[0];
    expect(typeof block.items[0].id).toBe("string");
    expect(typeof block.items[1].id).toBe("string");
  });

  it("injects ids into tabs item sub-items", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "tabs",
          items: [
            { label: "Tab A", content: "Content A" },
            { label: "Tab B", content: "Content B" },
          ],
        }],
      }],
    };
    const result = injectIds(course);
    const block = result.lessons[0].blocks[0];
    expect(typeof block.items[0].id).toBe("string");
    expect(typeof block.items[1].id).toBe("string");
  });

  it("result passes validateCourseJson for content lesson with accordion", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "accordion",
          items: [{ title: "S1", content: "C1" }],
        }],
      }],
    };
    const withIds = injectIds(course);
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });

  it("result passes validateCourseJson for assessment lesson with questions", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [
          { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
        ],
        config: { passingScore: 80, examSize: 10 },
      }],
    };
    const withIds = injectIds(course);
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });
});

describe("injectLessonIds", () => {
  it("adds kind:content when absent", () => {
    const lesson = { title: "L1", blocks: [] };
    const result = injectLessonIds(lesson);
    expect(result.kind).toBe("content");
  });

  it("injects question ids for assessment lessons", () => {
    const lesson = {
      kind: "assessment",
      title: "Exam",
      questions: [
        { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
      ],
      config: {},
    };
    const result = injectLessonIds(lesson);
    expect(typeof result.questions[0].id).toBe("string");
  });

  it("injects sub-item ids for accordion blocks", () => {
    const lesson = {
      title: "L1",
      blocks: [{
        type: "accordion",
        items: [{ title: "S1", content: "C1" }],
      }],
    };
    const result = injectLessonIds(lesson);
    expect(typeof result.blocks[0].items[0].id).toBe("string");
  });
});

describe("injectIds — edge cases", () => {
  it("handles course with only assessment lessons (no kind:content injected)", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [{ text: "Q1", options: ["A","B","C","D"], correctIndex: 0 }],
        config: {},
      }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("assessment");
  });

  it("handles course with only content lessons (all get kind:content)", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [] },
        { title: "L2", blocks: [] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons.every((l: any) => l.kind === "content")).toBe(true);
  });

  it("handles mixed course: content and assessment lessons independently", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "Content", blocks: [] },
        { kind: "assessment", title: "Exam", questions: [], config: {} },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("content");
    expect(result.lessons[1].kind).toBe("assessment");
  });

  it("preserves existing lesson id", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ id: "pre-existing", title: "L1", blocks: [] }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBe("pre-existing");
  });

  it("preserves existing question id", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [{ id: "q-pre", text: "Q1", options: ["A","B","C","D"], correctIndex: 0 }],
        config: {},
      }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].questions[0].id).toBe("q-pre");
  });

  it("handles empty blocks array without crash", () => {
    const course = { schemaVersion: 1, title: "Test", lessons: [{ title: "L1", blocks: [] }] };
    expect(() => injectIds(course)).not.toThrow();
  });

  it("handles empty questions array without crash", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", title: "Exam", questions: [], config: {} }],
    };
    expect(() => injectIds(course)).not.toThrow();
  });

  it("content lesson with accordion AND tabs: both get sub-item ids", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [
          { type: "accordion", items: [{ title: "S1", content: "C1" }] },
          { type: "tabs", items: [{ label: "T1", content: "C1" }] },
        ],
      }],
    };
    const result = injectIds(course);
    expect(typeof result.lessons[0].blocks[0].items[0].id).toBe("string");
    expect(typeof result.lessons[0].blocks[1].items[0].id).toBe("string");
  });
});
