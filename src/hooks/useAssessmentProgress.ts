import { useState, useCallback } from "react";
import type { QuestionProgress, AssessmentProgress, SessionRecord } from "@/lib/assessment";

export type { QuestionProgress, AssessmentProgress, SessionRecord };

const MAX_HISTORY = 20;

function storageKey(courseId: string, lessonId: string): string {
  return `tl_assess_${courseId}_${lessonId}`;
}

function load(courseId: string, lessonId: string): AssessmentProgress {
  try {
    const raw = localStorage.getItem(storageKey(courseId, lessonId));
    if (!raw) return { questions: {}, sessionHistory: [] };
    return JSON.parse(raw) as AssessmentProgress;
  } catch {
    return { questions: {}, sessionHistory: [] };
  }
}

function save(courseId: string, lessonId: string, progress: AssessmentProgress): void {
  try {
    localStorage.setItem(storageKey(courseId, lessonId), JSON.stringify(progress));
  } catch {}
}

export function useAssessmentProgress(courseId: string, lessonId: string) {
  const [progress, setProgress] = useState<AssessmentProgress>(() => load(courseId, lessonId));

  const updateQuestion = useCallback(
    (questionId: string, updater: (p: QuestionProgress) => QuestionProgress) => {
      setProgress((prev) => {
        const current: QuestionProgress = prev.questions[questionId] ?? {
          box: 1,
          testCount: 0,
          correctCount: 0,
          highConfidenceMisses: 0,
        };
        const next: AssessmentProgress = {
          ...prev,
          questions: { ...prev.questions, [questionId]: updater(current) },
        };
        save(courseId, lessonId, next);
        return next;
      });
    },
    [courseId, lessonId]
  );

  const addSession = useCallback(
    (record: SessionRecord) => {
      setProgress((prev) => {
        const history = [...prev.sessionHistory, record];
        if (history.length > MAX_HISTORY) history.shift();
        const next: AssessmentProgress = { ...prev, sessionHistory: history };
        save(courseId, lessonId, next);
        return next;
      });
    },
    [courseId, lessonId]
  );

  return { progress, updateQuestion, addSession };
}
