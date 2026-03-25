import { useEffect, useMemo, useState } from "react";

export function useCourseProgress() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [lastLessonId, setLastLessonId] = useState<string | null>(null);

  const progressKey = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    return "courseProgress:" + (id ? `id:${id}` : window.location.hash.slice(1));
  }, []);

  const persistProgress = (nextCompleted: Set<string>, nextLast: string | null) => {
    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({ completed: Array.from(nextCompleted), lastLessonId: nextLast || undefined })
      );
    } catch {}
  };

  const loadProgress = () => {
    try {
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const p = JSON.parse(raw) as { completed?: string[]; lastLessonId?: string };
        setCompleted(new Set(p.completed || []));
        setLastLessonId(p.lastLessonId || null);
      } else {
        setCompleted(new Set());
        setLastLessonId(null);
      }
    } catch {}
  };

  useEffect(() => { loadProgress(); }, [progressKey]);

  useEffect(() => {
    const handler = () => loadProgress();
    window.addEventListener("course:progress:changed", handler as EventListener);
    return () => window.removeEventListener("course:progress:changed", handler as EventListener);
  }, [progressKey]);

  const toggleComplete = (lessonId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
      persistProgress(next, lastLessonId);
      window.dispatchEvent(new Event("course:progress:changed"));
      return next;
    });
  };

  const trackLesson = (lessonId: string) => {
    setLastLessonId(lessonId);
    persistProgress(completed, lessonId);
    window.dispatchEvent(new Event("course:progress:changed"));
  };

  const applyResumeState = (completedIds: string[], resumeLessonId: string | null) => {
    setCompleted(new Set(completedIds));
    if (resumeLessonId) setLastLessonId(resumeLessonId);
  };

  return { completed, lastLessonId, toggleComplete, trackLesson, persistProgress, applyResumeState };
}
