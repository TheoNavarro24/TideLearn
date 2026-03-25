import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import {
  exportScorm12Zip,
  exportStaticWebZip,
  buildScormFileName,
  buildStaticFileName,
} from "@/lib/scorm12";
import type { CourseData } from "@/lib/scorm12";

// ─── Mock fetch — no media URLs in our fixture so this should never be called,
//     but guard against it to avoid real network calls. ───────────────────────
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      blob: vi.fn().mockResolvedValue(new Blob()),
    })
  );
});

// ─── Minimal course fixture (no media URLs — avoids fetch) ───────────────────
function makeCourse(title = "Test Course"): CourseData {
  return {
    title,
    lessons: [
      {
        kind: "content",
        id: "lesson-1",
        title: "Lesson One",
        blocks: [
          { id: "b1", type: "text", text: "<p>Hello world</p>" },
        ],
      },
    ],
  };
}

// ─── buildScormFileName / buildStaticFileName (indirectly test sanitizeFileName) ──

describe("buildScormFileName", () => {
  it("converts spaces to hyphens and appends suffix", () => {
    expect(buildScormFileName("My Course")).toBe("my-course-scorm12.zip");
  });

  it("strips special characters from the filename", () => {
    // sanitizeFileName collapses runs of non-alphanumeric chars into a single "-"
    expect(buildScormFileName("Hello! World@2024")).toBe("hello-world-2024-scorm12.zip");
  });

  it("falls back to 'course' for an empty title", () => {
    expect(buildScormFileName("")).toBe("course-scorm12.zip");
  });
});

describe("buildStaticFileName", () => {
  it("converts spaces to hyphens and appends suffix", () => {
    expect(buildStaticFileName("My Course")).toBe("my-course-web.zip");
  });

  it("falls back to 'course' for an empty title", () => {
    expect(buildStaticFileName("")).toBe("course-web.zip");
  });
});

// ─── exportScorm12Zip — integration tests ────────────────────────────────────

describe("exportScorm12Zip", () => {
  it("returns a Blob", async () => {
    const course = makeCourse();
    const result = await exportScorm12Zip(course, "");
    expect(result).toBeInstanceOf(Blob);
  });

  it("zip contains imsmanifest.xml", async () => {
    const course = makeCourse("My SCORM Course");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["imsmanifest.xml"]).toBeDefined();
  });

  it("imsmanifest.xml contains the course title", async () => {
    const course = makeCourse("My SCORM Course");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    const manifest = await zip.files["imsmanifest.xml"].async("string");
    expect(manifest).toContain("My SCORM Course");
  });

  it("imsmanifest.xml contains SCORM 1.2 version identifier", async () => {
    const course = makeCourse();
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    const manifest = await zip.files["imsmanifest.xml"].async("string");
    expect(manifest).toContain("1.2");
  });

  it("zip contains index.html", async () => {
    const course = makeCourse();
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["index.html"]).toBeDefined();
  });

  it("index.html embeds the course title", async () => {
    const course = makeCourse("My SCORM Course");
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    const html = await zip.files["index.html"].async("string");
    expect(html).toContain("My SCORM Course");
  });

  it("zip contains course.json", async () => {
    const course = makeCourse();
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["course.json"]).toBeDefined();
  });

  it("course.json encodes the lesson title", async () => {
    const course = makeCourse();
    const blob = await exportScorm12Zip(course, "");
    const zip = await JSZip.loadAsync(blob);
    const json = await zip.files["course.json"].async("string");
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe("Test Course");
    expect(parsed.lessons[0].title).toBe("Lesson One");
  });
});

// ─── exportStaticWebZip — integration tests ───────────────────────────────────

describe("exportStaticWebZip", () => {
  it("returns a Blob", async () => {
    const course = makeCourse();
    const result = await exportStaticWebZip(course, "");
    expect(result).toBeInstanceOf(Blob);
  });

  it("zip contains index.html", async () => {
    const course = makeCourse();
    const blob = await exportStaticWebZip(course, "");
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["index.html"]).toBeDefined();
  });

  it("index.html embeds the course title", async () => {
    const course = makeCourse("Static Web Course");
    const blob = await exportStaticWebZip(course, "");
    const zip = await JSZip.loadAsync(blob);
    const html = await zip.files["index.html"].async("string");
    expect(html).toContain("Static Web Course");
  });

  it("static zip does NOT contain imsmanifest.xml", async () => {
    const course = makeCourse();
    const blob = await exportStaticWebZip(course, "");
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["imsmanifest.xml"]).toBeUndefined();
  });
});
