import { describe, it, expect } from "vitest";

// Test the lesson-extraction logic in isolation
function extractLesson(course: any, lessonId: string) {
  return course.lessons?.find((l: any) => l.id === lessonId) ?? null;
}

describe("get_lesson extraction logic", () => {
  const course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [
      { kind: "content", id: "l1", title: "Lesson 1", blocks: [{ id: "b1", type: "heading", text: "Hello" }] },
      { kind: "assessment", id: "l2", title: "Exam", questions: [], config: {} },
    ],
  };

  it("returns the correct content lesson", () => {
    const lesson = extractLesson(course, "l1");
    expect(lesson).not.toBeNull();
    expect(lesson.title).toBe("Lesson 1");
    expect(lesson.blocks).toHaveLength(1);
  });

  it("returns the correct assessment lesson", () => {
    const lesson = extractLesson(course, "l2");
    expect(lesson).not.toBeNull();
    expect(lesson.kind).toBe("assessment");
  });

  it("returns null for unknown id", () => {
    const lesson = extractLesson(course, "unknown");
    expect(lesson).toBeNull();
  });
});
