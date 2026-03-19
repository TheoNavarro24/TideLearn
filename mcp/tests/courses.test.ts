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
