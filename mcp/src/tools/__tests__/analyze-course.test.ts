import { describe, it, expect } from "vitest";
import { analyzeCourse } from "../preview.js";
import type { Course } from "../../lib/types.js";

function makeCourse(lessons: any[]): Course {
  return { schemaVersion: 1, title: "Test", lessons } as Course;
}

describe("analyzeCourse", () => {
  it("counts lessons and blocks", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "Hello" },
        { id: "b2", type: "heading", text: "Title" },
      ]},
    ]));
    expect(result.lesson_count).toBe(1);
    expect(result.block_count).toBe(2);
  });

  it("reports block type breakdown", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "A" },
        { id: "b2", type: "text", text: "B" },
        { id: "b3", type: "heading", text: "C" },
      ]},
    ]));
    expect(result.block_type_breakdown.text).toBe(2);
    expect(result.block_type_breakdown.heading).toBe(1);
  });

  it("counts assessment questions from assessment lessons", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "assessment", id: "l1", title: "Quiz", questions: [
        { id: "q1", text: "Q1", options: ["A","B","C","D"], correctIndex: 0 },
        { id: "q2", text: "Q2", options: ["A","B","C","D"], correctIndex: 1 },
      ], config: { passingScore: 80, examSize: 20 } },
    ]));
    expect(result.assessment_count).toBe(2);
  });

  it("counts inline knowledge checks as assessments", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "quiz", question: "Q?", options: ["A","B"], correctIndex: 0 },
        { id: "b2", type: "truefalse", question: "TF?", correct: true },
      ]},
    ]));
    expect(result.assessment_count).toBe(2);
  });

  it("flags lesson with no assessment when no assessment lesson exists", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Lesson 1", blocks: [
        { id: "b1", type: "text", text: "No quiz here" },
      ]},
    ]));
    expect(result.gaps.some(g => g.type === "no_assessment")).toBe(true);
  });

  it("does not flag no_assessment when a standalone assessment lesson exists", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Content", blocks: [
        { id: "b1", type: "text", text: "Content" },
      ]},
      { kind: "assessment", id: "l2", title: "Assessment", questions: [
        { id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
      ], config: {} },
    ]));
    expect(result.gaps.some(g => g.type === "no_assessment")).toBe(false);
  });

  it("flags lesson with no media", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "Just text" },
      ]},
    ]));
    expect(result.gaps.some(g => g.type === "no_media")).toBe(true);
  });

  it("flags lesson with more than 10 blocks", () => {
    const blocks = Array.from({ length: 12 }, (_, i) => ({
      id: `b${i}`, type: "text", text: `Block ${i}`,
    }));
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Long Lesson", blocks },
    ]));
    expect(result.gaps.some(g => g.type === "too_long")).toBe(true);
  });

  it("estimates read time from word count", () => {
    const words = Array(200).fill("word").join(" ");
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: words },
      ]},
    ]));
    expect(result.estimated_read_minutes).toBe(1);
  });

  it("handles empty course", () => {
    const result = analyzeCourse(makeCourse([]));
    expect(result.lesson_count).toBe(0);
    expect(result.block_count).toBe(0);
    expect(result.gaps).toEqual([]);
  });
});
