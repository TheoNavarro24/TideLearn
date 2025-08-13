import { describe, it, expect } from 'vitest';
import { validateCourse } from './course';
import { createSeedCourse } from '../seed/course';

// Tests rely on deterministic seed data to ensure repeatability.

describe('course validation', () => {
  it('rejects unknown block types', () => {
    const course = createSeedCourse();
    // @ts-expect-error - intentionally wrong block type
    course.lessons[0].blocks[0].type = 'mystery';
    expect(() => validateCourse(course)).toThrow(/Unknown block type/);
  });

  it('rejects incorrect schema versions', () => {
    const course = createSeedCourse() as any;
    course.schemaVersion = 99;
    expect(() => validateCourse(course)).toThrow(/schema version/);
  });

  it('accepts a valid course', () => {
    const course = createSeedCourse();
    expect(() => validateCourse(course)).not.toThrow();
  });
});
