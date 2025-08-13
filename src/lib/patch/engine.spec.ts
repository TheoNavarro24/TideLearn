import { describe, it, expect } from 'vitest';
import { applyPatch, type PatchOp } from './engine';
import { createSeedCourse } from '../seed/course';

// Tests ensure deterministic behaviour using the same seed course for each case.

describe('patch engine', () => {
  it('handles add, replace and remove operations', () => {
    const seed = createSeedCourse();
    const ops: PatchOp[] = [
      { op: 'add', path: ['lessons', 0, 'blocks', 1], value: { id: 'block-2', type: 'text', text: 'New' } },
      { op: 'replace', path: ['lessons', 0, 'title'], value: 'Updated Lesson' },
      { op: 'remove', path: ['lessons', 0, 'blocks', 0] },
    ];
    const result = applyPatch(seed, ops);
    expect(result.ok).toBe(true);
    const course = result.value;
    expect(course.lessons[0].title).toBe('Updated Lesson');
    expect(course.lessons[0].blocks).toHaveLength(1);
    expect(course.lessons[0].blocks[0].id).toBe('block-2');
  });

  it('rolls back on invalid operation', () => {
    const seed = createSeedCourse();
    const snapshot = JSON.parse(JSON.stringify(seed));
    const ops: PatchOp[] = [
      { op: 'replace', path: ['lessons', 0, 'title'], value: 'Updated Lesson' },
      // Invalid path - there is only one lesson
      { op: 'remove', path: ['lessons', 1] },
    ];
    const result = applyPatch(seed, ops);
    expect(result.ok).toBe(false);
    expect(result.value).toEqual(snapshot);
    expect(seed).toEqual(snapshot); // original untouched
  });

  it('preserves ids of existing items and uses provided ids for new ones', () => {
    const seed = createSeedCourse();
    const ops: PatchOp[] = [
      { op: 'add', path: ['lessons', 0, 'blocks', 1], value: { id: 'block-2', type: 'text', text: 'New' } },
      { op: 'replace', path: ['lessons', 0, 'title'], value: 'Updated Lesson' },
    ];
    const result = applyPatch(seed, ops);
    expect(result.ok).toBe(true);
    const course = result.value;
    // Existing IDs remain the same
    expect(course.lessons[0].id).toBe('lesson-1');
    expect(course.lessons[0].blocks[0].id).toBe('block-1');
    // Newly inserted block keeps provided id
    expect(course.lessons[0].blocks[1].id).toBe('block-2');
  });
});
