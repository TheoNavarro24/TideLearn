import { describe, it, expect, vi } from "vitest";

// mutateCourse is tested by injecting a mock Supabase client
describe("mutateCourse", () => {
  it("fetches, applies mutation, and saves", async () => {
    const course = {
      schemaVersion: 1 as const,
      title: "Test",
      lessons: [{ id: "l1", title: "L1", blocks: [] }],
    };

    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { content: course, user_id: "u1" },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    } as any;

    // Make update chain return success
    mockClient.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "c1", (c) => {
      c.title = "Updated";
      return c;
    });

    expect(result).toBeNull(); // null = success
  });

  it("returns error string when course not found", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "bad-id", (c) => c);
    expect(result).toBe("course_not_found");
  });
});

describe("mutateCourse — additional error paths", () => {
  it("returns update_failed when DB update errors", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { content: { schemaVersion: 1, title: "T", lessons: [] }, user_id: "u1" },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
        }),
      }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "c1", (c) => c);
    expect(result).toBe("update_failed");
  });

  it("returns course_not_found when fetch errors", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "bad-id", (c) => c);
    expect(result).toBe("course_not_found");
  });

  it("returns null on successful mutation", async () => {
    const course = { schemaVersion: 1 as const, title: "T", lessons: [] };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { content: course, user_id: "u1" }, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    const result = await mutateCourse(mockClient, "u1", "c1", (c) => ({ ...c, title: "Updated" }));
    expect(result).toBeNull();
  });

  it("propagates mutator exception", async () => {
    const course = { schemaVersion: 1 as const, title: "T", lessons: [] };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { content: course, user_id: "u1" }, error: null }),
    } as any;

    const { mutateCourse } = await import("../src/lib/mutate.js");
    await expect(
      mutateCourse(mockClient, "u1", "c1", () => { throw new Error("mutator failed"); })
    ).rejects.toThrow("mutator failed");
  });
});
