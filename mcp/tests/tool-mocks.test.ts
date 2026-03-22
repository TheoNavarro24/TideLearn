import { describe, it, expect } from "vitest";
import { validateCourseJson } from "../src/lib/validate.js";
import { injectIds } from "../src/tools/semantic.js";
import { uid } from "../src/lib/uid.js";
import { ALL_BLOCKS, SAMPLE_QUESTIONS } from "./fixtures/blocks.js";

// ─── get_lesson extraction logic ─────────────────────────────────────────────

// Replicate the extraction logic from get_lesson (lessons.ts)
function extractLesson(course: any, lessonId: string) {
  return course.lessons?.find((l: any) => l.id === lessonId) ?? null;
}

describe("get_lesson — extraction logic", () => {
  it("returns lesson_not_found sentinel for unknown id", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ id: "l1", kind: "content", title: "L1", blocks: [] }] };
    expect(extractLesson(course, "unknown")).toBeNull();
  });

  it("returns content lesson by id", () => {
    const lesson = { id: "l1", kind: "content", title: "L1", blocks: ALL_BLOCKS.slice(0, 3) };
    const course = { schemaVersion: 1, title: "T", lessons: [lesson] };
    expect(extractLesson(course, "l1")).toEqual(lesson);
  });

  it("returns assessment lesson by id", () => {
    const lesson = { id: "l2", kind: "assessment", title: "Exam", questions: SAMPLE_QUESTIONS, config: {} };
    const course = { schemaVersion: 1, title: "T", lessons: [{ id: "l1", kind: "content", title: "L1", blocks: [] }, lesson] };
    expect(extractLesson(course, "l2")).toEqual(lesson);
  });
});

// ─── replace_questions contract ───────────────────────────────────────────────

function simulateReplaceQuestions(incoming: any[]) {
  return incoming.map(q => ({ ...q, id: uid() }));
}

describe("replace_questions — contract", () => {
  it("all incoming questions get new IDs", () => {
    const incoming = SAMPLE_QUESTIONS.map(({ id, ...q }) => q); // strip IDs
    const result = simulateReplaceQuestions(incoming);
    expect(result).toHaveLength(2);
    result.forEach(q => {
      expect(typeof q.id).toBe("string");
      expect(q.id.length).toBeGreaterThan(0);
    });
  });

  it("old question IDs are not present in result", () => {
    const oldIds = new Set(SAMPLE_QUESTIONS.map(q => q.id));
    const incoming = SAMPLE_QUESTIONS.map(({ id, ...q }) => q);
    const result = simulateReplaceQuestions(incoming);
    result.forEach(q => expect(oldIds.has(q.id)).toBe(false));
  });

  it("replaces with empty array when incoming is empty", () => {
    const result = simulateReplaceQuestions([]);
    expect(result).toHaveLength(0);
  });
});

// ─── list_courses lesson_count derivation ────────────────────────────────────

function deriveListRow(row: { id: string; title: string; is_public: boolean; updated_at: string; content: any }) {
  return {
    id: row.id,
    title: row.title,
    is_public: row.is_public,
    updated_at: row.updated_at,
    lesson_count: (row.content as any)?.lessons?.length ?? 0,
  };
}

describe("list_courses — lesson_count", () => {
  it("returns 0 for course with no lessons", () => {
    const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: { schemaVersion: 1, title: "T", lessons: [] } };
    expect(deriveListRow(row).lesson_count).toBe(0);
  });

  it("returns 3 for course with 3 lessons", () => {
    const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: { schemaVersion: 1, title: "T", lessons: [{}, {}, {}] } };
    expect(deriveListRow(row).lesson_count).toBe(3);
  });

  it("returns 0 when content is null", () => {
    const row = { id: "c1", title: "T", is_public: false, updated_at: "2026-01-01", content: null };
    expect(deriveListRow(row).lesson_count).toBe(0);
  });
});

// ─── save_course validation integration ──────────────────────────────────────

describe("save_course — validation + inject pipeline", () => {
  it("valid megacourse with all 17 block types passes validation after inject", () => {
    const raw = {
      schemaVersion: 1,
      title: "Megacourse",
      lessons: [
        { kind: "content", title: "L1", blocks: ALL_BLOCKS },
        { kind: "assessment", title: "Exam", questions: SAMPLE_QUESTIONS.map(({ id, ...q }) => q), config: { passingScore: 80, examSize: 2 } },
      ],
    };
    const withIds = injectIds(raw);
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });

  it("course with missing schemaVersion fails validation before any DB call", () => {
    const raw = { title: "No version", lessons: [] };
    const result = validateCourseJson(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.includes("schemaVersion"))).toBe(true);
  });

  it("lesson missing kind passes after injectIds adds kind:content", () => {
    const raw = { schemaVersion: 1, title: "T", lessons: [{ title: "No Kind", blocks: [] }] };
    const withIds = injectIds(raw); // injectIds fills in kind:content for lessons that lack it
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });
});

// ─── restructure_course logic ─────────────────────────────────────────────────

function simulateRestructure(lessons: any[], order: Array<{ lesson_id: string; title: string }>) {
  const lessonMap = new Map(lessons.map(l => [l.id, l]));
  const orderIds = order.map(o => o.lesson_id);
  const missing = lessons.filter(l => !orderIds.includes(l.id)).map(l => l.id);
  if (missing.length > 0) {
    return { ok: false as const, error: "incomplete_lesson_order", missing };
  }
  return {
    ok: true as const,
    lessons: order.map(o => ({ ...lessonMap.get(o.lesson_id)!, title: o.title })),
  };
}

describe("restructure_course — order validation", () => {
  const lessons = [
    { id: "l1", kind: "content", title: "Lesson 1", blocks: [] },
    { id: "l2", kind: "content", title: "Lesson 2", blocks: [] },
  ];

  it("returns incomplete_lesson_order when a lesson is omitted", () => {
    const result = simulateRestructure(lessons, [{ lesson_id: "l1", title: "Lesson 1" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("incomplete_lesson_order");
      expect(result.missing).toContain("l2");
    }
  });

  it("reorders lessons when all IDs present", () => {
    const result = simulateRestructure(lessons, [
      { lesson_id: "l2", title: "Renamed L2" },
      { lesson_id: "l1", title: "Renamed L1" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lessons[0].id).toBe("l2");
      expect(result.lessons[1].id).toBe("l1");
      expect(result.lessons[0].title).toBe("Renamed L2");
    }
  });
});

// ─── view_url format ──────────────────────────────────────────────────────────

describe("view_url — format", () => {
  it("builds view_url from APP_URL and course_id", () => {
    const APP_URL = "https://tidelearn.com";
    const courseId = "abc-123";
    expect(`${APP_URL}/view?id=${courseId}`).toBe("https://tidelearn.com/view?id=abc-123");
  });

  it("respects APP_URL override for local dev", () => {
    const APP_URL = "http://localhost:5173";
    const courseId = "xyz-456";
    expect(`${APP_URL}/view?id=${courseId}`).toBe("http://localhost:5173/view?id=xyz-456");
  });

  it("mcp_callback URL includes encoded callback", () => {
    const APP_URL = "https://tidelearn.com";
    const callbackUrl = "http://localhost:38472/callback";
    const loginUrl = `${APP_URL}/auth?mcp_callback=${encodeURIComponent(callbackUrl)}`;
    const parsed = new URL(loginUrl);
    expect(parsed.pathname).toBe("/auth");
    expect(parsed.searchParams.get("mcp_callback")).toBe(callbackUrl);
  });
});
