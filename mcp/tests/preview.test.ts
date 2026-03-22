import { describe, it, expect } from "vitest";
import { renderCourseToHtml, analyzeCourse } from "../src/tools/preview.js";
import { Course } from "../src/lib/types.js";
import { ALL_BLOCKS, SAMPLE_QUESTIONS } from "./fixtures/blocks.js";

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

it("renders warning placeholder for blocks with empty required fields", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [
        { id: "b1", type: "image", src: "", alt: "" },
      ],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("Missing required field");
  expect(html).not.toContain("<img");
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

describe("renderCourseToHtml — all 17 block types", () => {
  ALL_BLOCKS.forEach((block) => {
    it(`renders ${block.type} block without [Unknown block type]`, () => {
      const course: Course = {
        schemaVersion: 1,
        title: "Test",
        lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [block] }],
      };
      const html = renderCourseToHtml(course);
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
      expect(html).not.toContain("[Unknown block type]");
    });
  });
});

describe("renderCourseToHtml — assessment lesson rendering", () => {
  it("shows 'No questions in bank yet' when question bank is empty", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", id: "l1", title: "Empty Exam", questions: [], config: {} }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("No questions in bank yet");
  });

  it("renders question text and options for a single question", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("What does PASS stand for?");
    expect(html).toContain("Pull Aim Squeeze Sweep");
    expect(html).toContain("✓");
  });

  it("renders feedback when present", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("PASS is the acronym");
  });

  it("renders bloomLevel badge when present", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain(">K<");
  });

  it("renders source badge when present", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "assessment", id: "l1", title: "Exam", questions: [SAMPLE_QUESTIONS[0]], config: {} }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("Module 1");
  });
});

describe("analyzeCourse — gap matrix", () => {
  it("flags no_media and no_assessment for lesson with only a heading block", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [{ id: "b1", type: "heading", text: "Hi" }] }],
    };
    const result = analyzeCourse(course);
    const gapTypes = result.gaps.map(g => g.type);
    expect(gapTypes).toContain("no_media");
    expect(gapTypes).toContain("no_assessment");
  });

  it("flags no_assessment when no quiz block and no assessment lesson", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "L1",
        blocks: [
          { id: "b1", type: "heading", text: "H" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          { id: "b3", type: "text", text: "<p>text</p>" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    expect(result.gaps.some(g => g.type === "no_assessment" && g.lesson_id === "l1")).toBe(true);
  });

  it("does NOT flag no_assessment when course has an assessment lesson", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        {
          kind: "content",
          id: "l1",
          title: "L1",
          blocks: [
            { id: "b1", type: "heading", text: "H" },
            { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          ],
        },
        {
          kind: "assessment",
          id: "l2",
          title: "Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
          config: {},
        },
      ],
    };
    const result = analyzeCourse(course);
    expect(result.gaps.every(g => g.type !== "no_assessment")).toBe(true);
  });

  it("flags no_media for lesson with no image/video/audio", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "L1",
        blocks: [
          { id: "b1", type: "heading", text: "H" },
          { id: "b2", type: "text", text: "<p>text</p>" },
          { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
        ],
      }],
    };
    const result = analyzeCourse(course);
    expect(result.gaps.some(g => g.type === "no_media")).toBe(true);
  });

  it("does NOT flag no_media for lesson with image", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "L1",
        blocks: [
          { id: "b1", type: "heading", text: "H" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
        ],
      }],
    };
    const result = analyzeCourse(course);
    expect(result.gaps.every(g => g.type !== "no_media")).toBe(true);
  });

  it("reports multiple gaps on one lesson", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "L1",
        blocks: [{ id: "b1", type: "heading", text: "H" }],
      }],
    };
    const result = analyzeCourse(course);
    const l1Gaps = result.gaps.filter(g => g.lesson_id === "l1");
    expect(l1Gaps.length).toBeGreaterThanOrEqual(2);
  });

  it("meeting all criteria produces no gaps", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "L1",
        blocks: [
          { id: "b1", type: "heading", text: "H" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          { id: "b3", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
        ],
      }],
    };
    const result = analyzeCourse(course);
    expect(result.gaps).toHaveLength(0);
  });

  it("course with 0 lessons: no crash, empty gaps array", () => {
    const course: Course = { schemaVersion: 1, title: "Empty", lessons: [] };
    expect(() => analyzeCourse(course)).not.toThrow();
    const result = analyzeCourse(course);
    expect(result.gaps).toHaveLength(0);
  });
});
