import { describe, it, expect, beforeEach } from "vitest";
import {
  saveLessonProgress,
  loadLessonProgress,
  getProgressPercentage,
  saveResumePoint,
  loadResumePoint,
} from "@/lib/progress";

describe("viewer progress tracking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveLessonProgress + loadLessonProgress roundtrip — saved lessonId is present", () => {
    saveLessonProgress("course-1", "lesson-abc");
    const result = loadLessonProgress("course-1");
    expect(result).toContain("lesson-abc");
  });

  it("saving the same lessonId twice does not create duplicates", () => {
    saveLessonProgress("course-1", "lesson-abc");
    saveLessonProgress("course-1", "lesson-abc");
    const result = loadLessonProgress("course-1");
    const occurrences = result.filter((id) => id === "lesson-abc").length;
    expect(occurrences).toBe(1);
  });

  it("getProgressPercentage — 2 of 4 lessons completed returns 50", () => {
    const percentage = getProgressPercentage(["l1", "l2"], 4);
    expect(percentage).toBe(50);
  });

  it("saveResumePoint + loadResumePoint — saves and retrieves the last lesson", () => {
    saveResumePoint("course-1", "lesson-xyz");
    const result = loadResumePoint("course-1");
    expect(result).toBe("lesson-xyz");
  });

  it("progress is course-specific — course A progress does not affect course B", () => {
    saveLessonProgress("course-A", "lesson-1");
    saveResumePoint("course-A", "lesson-1");

    const progressB = loadLessonProgress("course-B");
    const resumeB = loadResumePoint("course-B");

    expect(progressB).toHaveLength(0);
    expect(resumeB).toBeNull();
  });
});
