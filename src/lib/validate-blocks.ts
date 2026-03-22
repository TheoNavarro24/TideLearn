import { blockSchema } from "@/types/course";
import type { ContentLesson } from "@/types/course";

export type BlockWarning = {
  lessonTitle: string;
  blockIndex: number;
  blockType: string;
  issues: string[];
};

export function validateCourseBlocks(lessons: ContentLesson[]): BlockWarning[] {
  const warnings: BlockWarning[] = [];

  for (const lesson of lessons) {
    for (let i = 0; i < lesson.blocks.length; i++) {
      const block = lesson.blocks[i];
      const result = blockSchema.safeParse(block);
      if (!result.success) {
        const issues = result.error.issues.map((issue) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
        warnings.push({
          lessonTitle: lesson.title,
          blockIndex: i,
          blockType: block.type,
          issues,
        });
      }
      // Also check correctIndex -1 on quizzes (valid in schema but worth flagging)
      if (block.type === "quiz" && block.correctIndex === -1) {
        const existing = warnings.find(
          (w) => w.lessonTitle === lesson.title && w.blockIndex === i
        );
        const issue = "no correct answer selected";
        if (existing) {
          existing.issues.push(issue);
        } else {
          warnings.push({
            lessonTitle: lesson.title,
            blockIndex: i,
            blockType: block.type,
            issues: [issue],
          });
        }
      }
    }
  }

  return warnings;
}
