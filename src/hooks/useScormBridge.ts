import { useEffect } from "react";
import type { Course } from "@/types/course";

interface ResumeState {
  completed?: string[];
  lastLessonId?: string;
}

interface ResumeMessage {
  type: "resume";
  state?: ResumeState;
}

interface UseScormBridgeOpts {
  course: Course | null;
  completed: Set<string>;
  lastLessonId: string | null;
  answers: Record<string, boolean>;
  onResume: (completedIds: string[], lastLessonId: string) => void;
}

export function useScormBridge({ course, completed, lastLessonId, answers, onResume }: UseScormBridgeOpts) {
  const isInFrame = window.parent !== window;

  // Post "ready" message on course load
  useEffect(() => {
    if (!course) return;
    try {
      if (window.parent && window.parent !== window) {
        // SCORM bridge: target origin is "*" intentionally — SCORM players
        // serve content from unpredictable origins, so scoping is not reliable.
        window.parent.postMessage({ type: "ready" }, "*");
      }
    } catch {}
  }, [course]);

  // Listen for "resume" messages
  useEffect(() => {
    if (!course) return;
    const onMsg = (event: MessageEvent<ResumeMessage>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "resume") {
        const st = data.state || {};
        if (st.lastLessonId && course.lessons.some((l) => l.id === st.lastLessonId)) {
          onResume(Array.isArray(st.completed) ? st.completed : [], st.lastLessonId);
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [course, onResume]);

  // Post "progress" on completion/answer changes
  useEffect(() => {
    if (!course) return;
    const total = course.lessons.length || 0;
    const courseCompleted = total > 0 && completed.size >= total;

    const allQuizIds: string[] = [];
    for (const lesson of course.lessons) {
      if (lesson.kind !== "content") continue;
      for (const block of lesson.blocks) {
        if (["quiz", "truefalse", "shortanswer"].includes(block.type) && block.id) {
          allQuizIds.push(block.id);
        }
      }
    }
    const totalQuestions = allQuizIds.length;
    const correctAnswers = allQuizIds.filter((id) => answers[id] === true).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;

    try {
      if (window.parent && window.parent !== window) {
        // SCORM bridge: target origin is "*" intentionally
        window.parent.postMessage({
          type: "progress",
          completed: Array.from(completed),
          lastLessonId,
          courseCompleted,
          score,
          totalQuestions,
          correctAnswers,
        }, "*");
      }
    } catch {}
  }, [completed, lastLessonId, course, answers]);

  return { isInFrame };
}
