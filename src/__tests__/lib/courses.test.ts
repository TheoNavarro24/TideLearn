import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createNewCourse,
  exportCourseJSON,
  getCoursesIndex,
  saveCourse,
  loadCourse,
  deleteCourse,
  renameCourse,
  duplicateCourse,
} from "@/lib/courses";
import type { Course } from "@/types/course";

// Mock the Supabase client — the functions under test are all local/localStorage-only
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    auth: { getSession: vi.fn() },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Minimal valid Course fixture */
function makeCourse(title = "Test Course"): Course {
  return {
    schemaVersion: 1,
    title,
    lessons: [
      {
        kind: "content",
        id: "lesson-1",
        title: "Lesson One",
        blocks: [
          { id: "b1", type: "heading", text: "Hello" },
        ],
      },
    ],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("courses.ts — pure functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. createNewCourse — schemaVersion, title, lessons
  it("createNewCourse returns a course with schemaVersion:1 and the given title", () => {
    const { id, course } = createNewCourse("My Course");
    expect(id).toBeTruthy();
    expect(course.schemaVersion).toBe(1);
    expect(course.title).toBe("My Course");
    expect(course.lessons.length).toBeGreaterThanOrEqual(1);
  });

  it("createNewCourse uses 'New Course' as default title", () => {
    const { course } = createNewCourse();
    expect(course.title).toBe("New Course");
  });

  // 2. exportCourseJSON — returns JSON string containing the title
  it("exportCourseJSON returns a valid JSON string containing the course title", () => {
    const course = makeCourse("Export Test");
    const json = exportCourseJSON(course);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json); // must not throw
    expect(parsed.title).toBe("Export Test");
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe("courses.ts — migrateLessons (via loadCourse)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 12. loadCourse applies migrateLessons — legacy lesson without kind gets kind:"content"
  it("loadCourse upgrades legacy lessons (no kind) to kind:'content'", () => {
    const legacyCourse = {
      schemaVersion: 1,
      title: "Legacy",
      lessons: [
        { id: "l1", title: "Old Lesson", blocks: [] }, // no kind field
      ],
    };
    localStorage.setItem("course:legacy-id", JSON.stringify(legacyCourse));
    const loaded = loadCourse("legacy-id");
    expect(loaded).not.toBeNull();
    expect(loaded!.lessons[0]).toHaveProperty("kind", "content");
  });

  // 3. migrateQuestions — assessment lesson without kind on a question gets kind:"mcq"
  it("loadCourse upgrades legacy assessment questions (no kind) to kind:'mcq'", () => {
    const legacyCourse = {
      schemaVersion: 1,
      title: "Legacy Assessment",
      lessons: [
        {
          kind: "assessment",
          id: "l2",
          title: "Quiz",
          config: {},
          questions: [
            { id: "q1", text: "What?", options: ["A", "B"], correctIndex: 0 }, // no kind
          ],
        },
      ],
    };
    localStorage.setItem("course:legacy-assess-id", JSON.stringify(legacyCourse));
    const loaded = loadCourse("legacy-assess-id");
    expect(loaded).not.toBeNull();
    const lesson = loaded!.lessons[0] as any;
    expect(lesson.questions[0]).toHaveProperty("kind", "mcq");
  });
});

describe("courses.ts — localStorage CRUD", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 5. saveCourse + loadCourse roundtrip
  it("saveCourse + loadCourse roundtrip preserves course data", () => {
    const course = makeCourse("Roundtrip");
    saveCourse("course-abc", course);
    const loaded = loadCourse("course-abc");
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe("Roundtrip");
    expect(loaded!.schemaVersion).toBe(1);
    expect(loaded!.lessons).toHaveLength(1);
    expect(loaded!.lessons[0].title).toBe("Lesson One");
  });

  // 6. loadCourse with nonexistent key returns null
  it("loadCourse returns null for a nonexistent id", () => {
    const result = loadCourse("does-not-exist");
    expect(result).toBeNull();
  });

  // 7. loadCourse with corrupted JSON returns null (no throw)
  it("loadCourse returns null gracefully when JSON is corrupted", () => {
    localStorage.setItem("course:bad-json", "{ not valid json !!!");
    expect(() => loadCourse("bad-json")).not.toThrow();
    expect(loadCourse("bad-json")).toBeNull();
  });

  // 8. getCoursesIndex — after saving 2 courses, index includes both
  it("getCoursesIndex contains entries for all saved courses", () => {
    saveCourse("id-1", makeCourse("Course One"));
    saveCourse("id-2", makeCourse("Course Two"));
    const index = getCoursesIndex();
    const ids = index.map((i) => i.id);
    expect(ids).toContain("id-1");
    expect(ids).toContain("id-2");
    const titles = index.map((i) => i.title);
    expect(titles).toContain("Course One");
    expect(titles).toContain("Course Two");
  });

  // 9. deleteCourse — after delete, loadCourse returns null
  it("deleteCourse removes the course; loadCourse returns null afterwards", () => {
    saveCourse("to-delete", makeCourse("Doomed"));
    expect(loadCourse("to-delete")).not.toBeNull();
    deleteCourse("to-delete");
    expect(loadCourse("to-delete")).toBeNull();
  });

  it("deleteCourse removes the course from the index", () => {
    saveCourse("to-delete-2", makeCourse("Also Doomed"));
    deleteCourse("to-delete-2");
    const index = getCoursesIndex();
    expect(index.find((i) => i.id === "to-delete-2")).toBeUndefined();
  });

  // 10. renameCourse — loaded course has new title
  it("renameCourse updates the course title in storage and index", () => {
    saveCourse("rename-me", makeCourse("Old Title"));
    renameCourse("rename-me", "New Title");
    const loaded = loadCourse("rename-me");
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe("New Title");
    const index = getCoursesIndex();
    const entry = index.find((i) => i.id === "rename-me");
    expect(entry?.title).toBe("New Title");
  });

  // 11. duplicateCourse — different ID, same content
  it("duplicateCourse returns a new id and preserves content (title, lessons)", () => {
    const original = makeCourse("Original");
    saveCourse("orig-id", original);
    const newId = duplicateCourse("orig-id");
    expect(newId).not.toBeNull();
    expect(newId).not.toBe("orig-id");
    const copy = loadCourse(newId!);
    expect(copy).not.toBeNull();
    // Title gets "(Copy)" suffix
    expect(copy!.title).toBe("Original (Copy)");
    expect(copy!.lessons).toHaveLength(original.lessons.length);
    expect(copy!.lessons[0].title).toBe(original.lessons[0].title);
  });

  it("duplicateCourse returns null for a nonexistent source course", () => {
    const result = duplicateCourse("ghost-id");
    expect(result).toBeNull();
  });
});
