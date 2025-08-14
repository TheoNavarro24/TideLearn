import type { BlockType, Course } from '@/types/course';
import { factories } from '@/types/course';

const blockTypes = new Set<BlockType>(Object.keys(factories) as BlockType[]);

export function validateCourse(data: any): Course {
  if (!data || typeof data !== 'object') throw new Error('Course must be an object');
  if (data.schemaVersion !== 1) throw new Error('Unsupported schema version');
  if (!Array.isArray(data.lessons)) throw new Error('Lessons must be array');

  for (const lesson of data.lessons) {
    if (!lesson || typeof lesson !== 'object') throw new Error('Invalid lesson');
    if (typeof lesson.id !== 'string' || typeof lesson.title !== 'string') throw new Error('Invalid lesson');
    if (!Array.isArray(lesson.blocks)) throw new Error('Invalid blocks');
    for (const block of lesson.blocks) {
      if (!block || typeof block !== 'object') throw new Error('Invalid block');
      if (typeof block.type !== 'string') throw new Error('Invalid block');
      if (!blockTypes.has(block.type as BlockType)) throw new Error('Unknown block type');
    }
  }

  return data as Course;
}
