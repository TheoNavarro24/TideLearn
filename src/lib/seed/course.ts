import type { Course, TextBlock } from '@/types/course';

export function createSeedCourse(): Course {
  return {
    schemaVersion: 1,
    title: 'Seed Course',
    lessons: [
      {
        id: 'lesson-1',
        title: 'Lesson 1',
        blocks: [
          { id: 'block-1', type: 'text', text: 'Hello world' } satisfies TextBlock,
        ],
      },
    ],
  };
}
