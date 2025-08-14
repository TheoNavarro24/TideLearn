import { describe, expect, it } from "vitest";
import { buildScormFileName, buildStaticFileName } from "../scorm12";

describe("scorm12 filenames", () => {
  it("builds sanitized scorm file name", () => {
    expect(buildScormFileName("My Course!")).toBe("my-course-scorm12.zip");
  });

  it("builds sanitized static file name", () => {
    expect(buildStaticFileName("Another_Course 123")).toBe("another_course-123-web.zip");
  });

  it("uses fallback for empty title", () => {
    expect(buildScormFileName("")).toBe("course-scorm12.zip");
  });
});

