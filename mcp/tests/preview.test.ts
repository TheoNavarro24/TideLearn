import { describe, it, expect } from "vitest";
import { renderCourseToHtml, analyzeCourse } from "../src/tools/preview.js";
import { Course } from "../src/lib/types.js";

const sampleCourse: Course = {
  schemaVersion: 1,
  title: "Fire Safety",
  lessons: [
    {
      id: "l1",
      title: "Introduction",
      blocks: [
        { id: "b1", type: "heading", text: "Welcome" },
        { id: "b2", type: "text", text: "<p>Hello world</p>" },
        { id: "b3", type: "quiz", question: "Q?", options: ["A", "B"], correctIndex: 0 },
      ],
    },
    {
      id: "l2",
      title: "Equipment",
      blocks: [
        { id: "b4", type: "heading", text: "Gear" },
        { id: "b5", type: "image", src: "https://example.com/img.jpg", alt: "gear" },
      ],
    },
  ],
};

describe("renderCourseToHtml", () => {
  it("includes the course title", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Fire Safety");
  });

  it("includes all lesson titles", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Introduction");
    expect(html).toContain("Equipment");
  });

  it("renders a quiz block", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("Q?");
    expect(html).toContain("A");
  });

  it("renders an image block", () => {
    const html = renderCourseToHtml(sampleCourse);
    expect(html).toContain("https://example.com/img.jpg");
  });
});

describe("analyzeCourse", () => {
  it("counts lessons and blocks correctly", () => {
    const result = analyzeCourse(sampleCourse);
    expect(result.lesson_count).toBe(2);
    expect(result.block_count).toBe(5);
  });

  it("counts assessments", () => {
    const result = analyzeCourse(sampleCourse);
    expect(result.assessment_count).toBe(1);
  });

  it("flags lesson with no assessment", () => {
    const result = analyzeCourse(sampleCourse);
    const gap = result.gaps.find((g) => g.lesson_id === "l2" && g.type === "no_assessment");
    expect(gap).toBeDefined();
  });

  it("flags lesson with no media", () => {
    const result = analyzeCourse(sampleCourse);
    const gap = result.gaps.find((g) => g.lesson_id === "l1" && g.type === "no_media");
    expect(gap).toBeDefined();
  });
});
