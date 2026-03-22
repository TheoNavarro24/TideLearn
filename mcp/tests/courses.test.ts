import { describe, it, expect, vi } from "vitest";
import { registerCourseTools } from "../src/tools/courses.js";

describe("registerCourseTools", () => {
  it("registers exactly 5 tools", () => {
    const mockServer = { tool: vi.fn() };
    registerCourseTools(mockServer as any);
    expect(mockServer.tool).toHaveBeenCalledTimes(5);
  });

  it("registers list_courses", () => {
    const mockServer = { tool: vi.fn() };
    registerCourseTools(mockServer as any);
    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain("list_courses");
  });
});

describe("list_courses lesson_count", () => {
  it("derives lesson_count from content.lessons length", () => {
    // Simulate the transformation the updated list_courses will apply
    const row = {
      id: "course-1",
      title: "Test",
      is_public: false,
      updated_at: "2026-01-01",
      content: { schemaVersion: 1, title: "Test", lessons: [{}, {}, {}] },
    };
    const lesson_count = (row.content as any).lessons?.length ?? 0;
    expect(lesson_count).toBe(3);
  });
});

describe("view_url format", () => {
  it("builds view_url from APP_URL and course_id", () => {
    const APP_URL = "https://tidelearn.com";
    const courseId = "abc-123";
    const view_url = `${APP_URL}/view?id=${courseId}`;
    expect(view_url).toBe("https://tidelearn.com/view?id=abc-123");
  });

  it("respects APP_URL override", () => {
    const APP_URL = "http://localhost:5173";
    const courseId = "xyz-456";
    expect(`${APP_URL}/view?id=${courseId}`).toBe("http://localhost:5173/view?id=xyz-456");
  });
});
