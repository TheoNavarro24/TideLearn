/**
 * Viewer progress utilities — pure localStorage helpers extracted from View.tsx.
 * Storage format: { completed: string[], lastLessonId?: string }
 * Key pattern: "courseProgress:id:<courseId>" or "courseProgress:<hash>"
 */

function progressKey(courseId: string): string {
  return `courseProgress:id:${courseId}`;
}

export function saveLessonProgress(courseId: string, lessonId: string): void {
  const key = progressKey(courseId);
  try {
    const raw = localStorage.getItem(key);
    const data: { completed?: string[]; lastLessonId?: string } = raw
      ? JSON.parse(raw)
      : {};
    const completedSet = new Set<string>(data.completed || []);
    completedSet.add(lessonId);
    localStorage.setItem(
      key,
      JSON.stringify({ ...data, completed: Array.from(completedSet) })
    );
  } catch {}
}

export function loadLessonProgress(courseId: string): string[] {
  const key = progressKey(courseId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data: { completed?: string[] } = JSON.parse(raw);
      return data.completed || [];
    }
  } catch {}
  return [];
}

export function getProgressPercentage(
  completed: string[],
  total: number
): number {
  if (total === 0) return 0;
  return (completed.length / total) * 100;
}

export function saveResumePoint(courseId: string, lessonId: string): void {
  const key = progressKey(courseId);
  try {
    const raw = localStorage.getItem(key);
    const data: { completed?: string[]; lastLessonId?: string } = raw
      ? JSON.parse(raw)
      : {};
    localStorage.setItem(
      key,
      JSON.stringify({ ...data, lastLessonId: lessonId })
    );
  } catch {}
}

export function loadResumePoint(courseId: string): string | null {
  const key = progressKey(courseId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data: { lastLessonId?: string } = JSON.parse(raw);
      return data.lastLessonId || null;
    }
  } catch {}
  return null;
}
