import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createNewCourse,
  saveCourse,
  loadCourse,
  deleteCourse,
} from "@/lib/courses";
import type { Course, ContentLesson, HeadingBlock, TextBlock } from "@/types/course";

// Mock the Supabase client — the functions under test are all local/localStorage-only
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    auth: { getSession: vi.fn() },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a minimal valid Course fixture */
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
          { id: "b1", type: "heading", text: "Hello" } as HeadingBlock,
        ],
      } as ContentLesson,
    ],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("editor roundtrip — save/load integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Create, save, load preserves structure
  it("create, save, load preserves course structure (schemaVersion, title, lessons)", () => {
    const { id, course: created } = createNewCourse("Roundtrip Test");

    expect(created.schemaVersion).toBe(1);
    expect(created.title).toBe("Roundtrip Test");
    expect(created.lessons.length).toBeGreaterThan(0);

    const loaded = loadCourse(id);
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.title).toBe("Roundtrip Test");
    expect(loaded?.lessons.length).toBe(created.lessons.length);
  });

  // 2. Add block, save, load, block exists
  it("add text block, save, load, block persists", () => {
    const { id, course } = createNewCourse("Block Test");
    
    // Mutate: add a text block to the first lesson
    const lesson = course.lessons[0];
    const initialBlockCount = lesson.kind === "content" ? lesson.blocks.length : 0;
    
    if (lesson.kind === "content") {
      const newBlock: TextBlock = {
        id: "text-block-1",
        type: "text",
        text: "This is a test paragraph.",
      };
      lesson.blocks.push(newBlock);
    }

    // Save the modified course
    saveCourse(id, course);

    // Load and verify
    const loaded = loadCourse(id);
    expect(loaded).not.toBeNull();
    expect(loaded?.lessons.length).toBe(1);

    const loadedLesson = loaded?.lessons[0];
    if (loadedLesson && loadedLesson.kind === "content") {
      expect(loadedLesson.blocks.length).toBe(initialBlockCount + 1); // +1 for the newly added block
      const textBlock = loadedLesson.blocks.find((b) => b.type === "text" && "text" in b && b.text === "This is a test paragraph.");
      expect(textBlock).toBeDefined();
      expect(textBlock?.type).toBe("text");
    }
  });

  // 3. Modify title, save, load, title updated
  it("modify title, save, load, title is updated", () => {
    const { id, course } = createNewCourse("Original Title");

    // Modify title
    course.title = "Updated Title";
    saveCourse(id, course);

    // Load and verify
    const loaded = loadCourse(id);
    expect(loaded?.title).toBe("Updated Title");
  });

  // 4. Delete course, loadCourse returns null
  it("delete course, loadCourse returns null", () => {
    const { id, course } = createNewCourse("Deletion Test");

    // Verify it was saved
    expect(loadCourse(id)).not.toBeNull();

    // Delete
    deleteCourse(id);

    // Verify it's gone
    expect(loadCourse(id)).toBeNull();
  });

  // 5. Corrupted localStorage, loadCourse returns null gracefully
  it("corrupted localStorage JSON, loadCourse returns null gracefully", () => {
    const badId = "bad-course";
    localStorage.setItem(`course:${badId}`, "not json {{{");

    const loaded = loadCourse(badId);
    expect(loaded).toBeNull();
  });
});
