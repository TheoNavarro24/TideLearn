import type { AssessmentQuestion } from "@/types/course";

export type QuestionProgress = {
  box: 1 | 2 | 3 | 4;
  testCount: number;
  correctCount: number;
  highConfidenceMisses: number;
  lastMissConfidence?: "low" | "med" | "high";
};

export type SessionRecord = {
  score: number;
  date: number;
  mode: "study" | "exam";
};

export type AssessmentProgress = {
  questions: Record<string, QuestionProgress>;
  sessionHistory: SessionRecord[];
};

/** Box eligibility: box 1 always, box 2 every 2nd testCount, box 3 every 4th, box 4 every 8th. */
export function isEligible(progress: QuestionProgress): boolean {
  const { box, testCount } = progress;
  if (box === 1) return true;
  if (box === 2) return testCount % 2 === 0;
  if (box === 3) return testCount % 4 === 0;
  return testCount % 8 === 0;
}

/** weaknessScore = incorrectRatio * boxWeight + highConfidenceMisses * 2 */
export function weaknessScore(p: QuestionProgress): number {
  if (p.testCount === 0) return 0;
  const incorrectRatio = (p.testCount - p.correctCount) / p.testCount;
  const boxWeight = ([4, 3, 2, 1] as const)[p.box - 1];
  return incorrectRatio * boxWeight + p.highConfidenceMisses * 2;
}

/** Returns questions eligible for a study session based on Leitner boxes. */
export function generateStudySession(
  questions: AssessmentQuestion[],
  progressMap: Record<string, QuestionProgress>
): AssessmentQuestion[] {
  return questions.filter((q) => {
    const p = progressMap[q.id];
    if (!p) return true; // never seen → always eligible (box 1)
    return isEligible(p);
  });
}

/** Returns up to `size` questions for an exam, source-balanced if tags present. */
export function generateExamSession(
  questions: AssessmentQuestion[],
  size: number
): AssessmentQuestion[] {
  const tagged = questions.filter((q): q is import("../types/course").MCQQuestion => q.kind === "mcq" && !!q.source);
  const uniqueSources = new Set(tagged.map((q) => q.source!));
  if (tagged.length > 0 && uniqueSources.size > 1) {
    return generateSourceBalanced(questions, size);
  }
  return shuffle(questions).slice(0, Math.min(size, questions.length));
}

function generateSourceBalanced(questions: AssessmentQuestion[], size: number): AssessmentQuestion[] {
  const bySource = new Map<string, AssessmentQuestion[]>();
  for (const q of questions) {
    const key = (q.kind === "mcq" ? q.source : undefined) ?? "__untagged__";
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(q);
  }
  const sources = Array.from(bySource.keys());
  const perSource = Math.floor(size / sources.length);
  const remainder = size % sources.length;
  const result: AssessmentQuestion[] = [];
  for (let i = 0; i < sources.length; i++) {
    const pool = shuffle(bySource.get(sources[i])!);
    const take = perSource + (i < remainder ? 1 : 0);
    result.push(...pool.slice(0, take));
  }
  return shuffle(result).slice(0, size);
}

/** Returns top N weakest questions by weaknessScore. Excludes never-seen questions. */
export function generateWeakAreaSession(
  questions: AssessmentQuestion[],
  progressMap: Record<string, QuestionProgress>,
  size = 20
): AssessmentQuestion[] {
  const scored = questions
    .filter((q) => (progressMap[q.id]?.testCount ?? 0) > 0)
    .map((q) => ({ q, score: weaknessScore(progressMap[q.id]) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(size, scored.length)).map((s) => s.q);
}

/** Advance Leitner box after an answer. Returns updated progress. */
export function advanceBox(
  current: QuestionProgress,
  correct: boolean,
  confidence?: "low" | "med" | "high"
): QuestionProgress {
  const next: QuestionProgress = { ...current, testCount: current.testCount + 1 };
  if (correct) {
    next.correctCount++;
    next.box = (Math.min(current.box + 1, 4) as 1 | 2 | 3 | 4);
  } else {
    next.box = 1;
    if (confidence) next.lastMissConfidence = confidence;
    if (confidence === "high") next.highConfidenceMisses = (next.highConfidenceMisses ?? 0) + 1;
  }
  return next;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Initialise a question's progress if not present. */
export function defaultQuestionProgress(): QuestionProgress {
  return { box: 1, testCount: 0, correctCount: 0, highConfidenceMisses: 0 };
}

/** Grade a multiple-response answer. Correct only if all correct indices selected and no incorrect ones. */
export function gradeMultipleResponse(
  correctIndices: number[],
  selected: number[]
): boolean {
  const correctSet = new Set(correctIndices);
  const selectedSet = new Set(selected);
  return (
    correctIndices.every((ci) => selectedSet.has(ci)) &&
    selected.every((s) => correctSet.has(s))
  );
}
