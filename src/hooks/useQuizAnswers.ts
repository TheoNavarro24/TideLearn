import { useEffect, useMemo, useState } from "react";

interface QuizAnsweredDetail {
  blockId: string;
  correct: boolean;
}

type QuizAnsweredEvent = CustomEvent<QuizAnsweredDetail>;

export function useQuizAnswers() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const storageKey = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    return "quizAnswers:" + (id ? `id:${id}` : window.location.hash.slice(1));
  }, []);

  // Load persisted answers on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Listen for quiz:answered events and persist
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as QuizAnsweredEvent).detail;
      const blockId = detail?.blockId;
      const correct = detail?.correct;
      if (!blockId) return;
      setAnswers((prev) => {
        const next = { ...prev, [blockId]: !!correct };
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    window.addEventListener("quiz:answered", handler);
    return () => window.removeEventListener("quiz:answered", handler);
  }, [storageKey]);

  return { answers };
}
