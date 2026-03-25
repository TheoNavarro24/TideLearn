import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { exportScorm12Zip } from "@/lib/scorm12";
import type { CourseData } from "@/lib/scorm12";

// ─── Mock fetch — prevent real network calls ────────────────────────────────
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      blob: vi.fn().mockResolvedValue(new Blob()),
    })
  );
});

// ─── Realistic multi-lesson course fixture (2 modules, each with 1-2 blocks) ─
function makeMultiLessonCourse(title = "Multi-Lesson Course"): CourseData {
  return {
    title,
    lessons: [
      {
        kind: "content",
        id: "lesson-1",
        title: "Module 1: Introduction",
        blocks: [
          {
            id: "b1",
            type: "heading",
            text: "Module 1: Introduction",
          },
          {
            id: "b2",
            type: "text",
            text: "<p>This is the introductory module. Learn the fundamentals.</p>",
          },
          {
            id: "b3",
            type: "text",
            text: "<p>By the end of this module, you should understand the basics.</p>",
          },
        ],
      },
      {
        kind: "content",
        id: "lesson-2",
        title: "Module 2: Advanced Topics",
        blocks: [
          {
            id: "b4",
            type: "heading",
            text: "Module 2: Advanced Topics",
          },
          {
            id: "b5",
            type: "text",
            text: "<p>Now let's dive into more advanced material.</p>",
          },
          {
            id: "b6",
            type: "quote",
            text: "Knowledge is power.",
            cite: "Francis Bacon",
          },
        ],
      },
    ],
  };
}

// ─── Integration tests ─────────────────────────────────────────────────────

describe("SCORM export — end-to-end structure", () => {
  // 1. imsmanifest.xml present with SCORM 1.2 identifier
  it("produces zip with imsmanifest.xml containing SCORM 1.2 identifier", async () => {
    const course = makeMultiLessonCourse("Test SCORM Course");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);

    // File exists
    expect(zip.files["imsmanifest.xml"]).toBeDefined();

    // Contains SCORM 1.2 version
    const manifest = await zip.files["imsmanifest.xml"].async("string");
    expect(manifest).toContain("<schemaversion>1.2</schemaversion>");
  });

  // 2. imsmanifest.xml contains course title in metadata
  it("imsmanifest.xml contains course title in organization", async () => {
    const courseTitle = "Financial Planning Fundamentals";
    const course = makeMultiLessonCourse(courseTitle);
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);

    const manifest = await zip.files["imsmanifest.xml"].async("string");
    expect(manifest).toContain(courseTitle);
  });

  // 3. index.html present and contains course title
  it("index.html exists and embeds course title", async () => {
    const courseTitle = "Embedded Data Test";
    const course = makeMultiLessonCourse(courseTitle);
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);

    // File exists
    expect(zip.files["index.html"]).toBeDefined();

    // Contains course title
    const html = await zip.files["index.html"].async("string");
    expect(html).toContain(courseTitle);
  });

  // 4. Multi-lesson structure is preserved in embedded course.json
  it("course.json preserves multi-lesson structure with all blocks", async () => {
    const course = makeMultiLessonCourse("Multi-Lesson Test");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);

    // course.json exists
    expect(zip.files["course.json"]).toBeDefined();

    // Verify structure
    const courseJson = await zip.files["course.json"].async("string");
    const parsed = JSON.parse(courseJson);

    // Check top level
    expect(parsed.title).toBe("Multi-Lesson Test");

    // Check lessons count
    expect(parsed.lessons.length).toBe(2);

    // Check first lesson
    expect(parsed.lessons[0].title).toBe("Module 1: Introduction");
    expect(parsed.lessons[0].kind).toBe("content");
    expect(parsed.lessons[0].blocks.length).toBe(3); // heading + 2 text blocks

    // Check second lesson
    expect(parsed.lessons[1].title).toBe("Module 2: Advanced Topics");
    expect(parsed.lessons[1].kind).toBe("content");
    expect(parsed.lessons[1].blocks.length).toBe(3); // heading + text + quote

    // Verify block content is intact
    const lesson1Text = parsed.lessons[0].blocks[1];
    expect(lesson1Text.type).toBe("text");
    expect(lesson1Text.text).toContain("introductory module");
  });

  // 5. index.html contains lesson content from multiple modules
  it("index.html includes content from multiple lessons", async () => {
    const course = makeMultiLessonCourse("Content Verify Test");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);

    const html = await zip.files["index.html"].async("string");

    // Check for content from both lessons
    expect(html).toContain("Module 1: Introduction");
    expect(html).toContain("Module 2: Advanced Topics");
    expect(html).toContain("introductory module");
    expect(html).toContain("advanced material");
  });
});
