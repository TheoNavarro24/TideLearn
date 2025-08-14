import { describe, expect, it } from "vitest";
import { validateCourse } from "./course";
import { createSeedCourse } from "../seed/course";

describe("course validation", () => {
  it("rejects unknown block types", () => {
    const course = createSeedCourse();
    // @ts-expect-error - intentionally wrong block type
    course.lessons[0].blocks[0].type = "mystery";
    expect(() => validateCourse(course)).toThrow(/Unknown block type/);
  });

  it("rejects incorrect schema versions", () => {
    const course = createSeedCourse() as any;
    course.schemaVersion = 99;
    expect(() => validateCourse(course)).toThrow(/Invalid literal/);
  });

  it("accepts a valid course", () => {
    const course = createSeedCourse();
    expect(() => validateCourse(course)).not.toThrow();
  });
});
