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

it("renders a document block", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Docs Course",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [{
        id: "b1",
        type: "document",
        src: "https://example.com/file.pdf",
        fileType: "pdf",
        title: "Annual Report",
      }],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("Annual Report");
  expect(html).not.toContain("[Unknown block type]");
});

describe("renderCourseToHtml — assessment lesson", () => {
  it("renders assessment question text", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Final Exam",
        questions: [{
          id: "q1",
          text: "What does PASS stand for?",
          options: ["Pull Aim Squeeze Sweep", "Press Activate Spray Stop", "Point Attack Spray Stand", "Push Aim Spray Sweep"],
          correctIndex: 0,
          feedback: "PASS is the standard technique.",
        }],
        config: { passingScore: 80, examSize: 20 },
      }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("What does PASS stand for?");
    expect(html).toContain("Pull Aim Squeeze Sweep");
    expect(html).toContain("PASS is the standard technique.");
    // Correct answer should be visually distinguished
    expect(html).toContain("✓");
  });
});

it("renders quiz with correctIndex -1 as unset", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [{
        id: "b1",
        type: "quiz",
        question: "Q?",
        options: ["A", "B"],
        correctIndex: -1,
      }],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("no correct answer set");
  expect(html).not.toContain("✓");
});

describe("analyzeCourse — assessment lesson awareness", () => {
  it("does not flag no_assessment when course has an assessment lesson", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        {
          kind: "content",
          id: "l1",
          title: "Introduction",
          blocks: [
            { id: "b1", type: "heading", text: "Hello" },
            { id: "b2", type: "text", text: "<p>Content</p>" },
            { id: "b3", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          ],
        },
        {
          kind: "assessment",
          id: "l2",
          title: "Final Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
          config: { passingScore: 80, examSize: 10 },
        },
      ],
    };
    const result = analyzeCourse(course);
    const noAssessmentGaps = result.gaps.filter(g => g.type === "no_assessment");
    expect(noAssessmentGaps).toHaveLength(0);
  });

  it("still flags no_assessment when no assessment lesson exists", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Introduction",
        blocks: [
          { id: "b1", type: "heading", text: "Hello" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const noAssessmentGaps = result.gaps.filter(g => g.type === "no_assessment");
    expect(noAssessmentGaps).toHaveLength(1);
  });
});

describe("analyzeCourse — empty field detection", () => {
  it("flags blocks with empty required fields", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Intro",
        blocks: [
          { id: "b1", type: "heading", text: "" },
          { id: "b2", type: "image", src: "", alt: "test" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const emptyFieldGaps = result.gaps.filter(g => g.type === "empty_required_field");
    expect(emptyFieldGaps.length).toBeGreaterThanOrEqual(2);
  });

  it("does not flag valid blocks as empty", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Intro",
        blocks: [
          { id: "b1", type: "heading", text: "Hello" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "test" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const emptyFieldGaps = result.gaps.filter(g => g.type === "empty_required_field");
    expect(emptyFieldGaps).toHaveLength(0);
  });
});
