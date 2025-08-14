/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCoursesIndex, saveCourse } from "../courses";
import type { Course } from "../../types/course";

describe("courses localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads index from localStorage", () => {
    const data = JSON.stringify([{ id: "1", title: "Test", updatedAt: 0 }]);
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(data);
    const index = getCoursesIndex();
    expect(getSpy).toHaveBeenCalledWith("courses:index");
    expect(index).toEqual([{ id: "1", title: "Test", updatedAt: 0 }]);
  });

  it("saves course and updates index", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    const course: Course = { schemaVersion: 1, title: "My Course", lessons: [] };
    saveCourse("abc", course);
    expect(setSpy).toHaveBeenCalledWith("course:abc", JSON.stringify(course));
    const index = getCoursesIndex();
    expect(index[0]).toMatchObject({ id: "abc", title: "My Course" });
  });
});

