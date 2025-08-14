import type { Course, TextBlock } from '@/types/course';

export function createSeedCourse(): Course {
  return {
    schemaVersion: 1,
    title: 'Seed Course',
    lessons: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Lesson 1',
        blocks: [
          { id: '00000000-0000-0000-0000-000000000101', type: 'text', text: 'Hello world' } satisfies TextBlock,
        ],
      },
    ],
  };
}
