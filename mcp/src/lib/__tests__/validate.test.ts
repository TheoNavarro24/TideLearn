import { describe, it, expect } from "vitest";
import { formatZodErrors, validateCourseJson } from "../validate.js";
import { courseSchema } from "../types.js";

describe("formatZodErrors", () => {
  it("returns plain-English messages with paths", () => {
    const result = courseSchema.safeParse({ title: "Test", lessons: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = formatZodErrors(result.error);
      expect(msgs.length).toBeGreaterThan(0);
      expect(msgs[0]).toContain("schemaVersion");
    }
  });
});

describe("validateCourseJson", () => {
  it("returns ok:true for a valid course", () => {
    const course = { schemaVersion: 1, title: "Test", lessons: [] };
    const result = validateCourseJson(course);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.course.title).toBe("Test");
  });

  it("returns ok:false with errors for missing schemaVersion", () => {
    const result = validateCourseJson({ title: "Test", lessons: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.toLowerCase().includes("schemaversion"))).toBe(true);
    }
  });

  it("returns ok:false with errors for invalid block type", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        id: "abc",
        title: "L1",
        blocks: [{ id: "b1", type: "bullet", text: "hi" }],
      }],
    };
    const result = validateCourseJson(course);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });
});
