import { useEffect, useState } from "react";
import type { Course } from "@/types/course";

export function useLessonNavigation(course: Course | null) {
  const params = new URLSearchParams(window.location.search);
  const initialPaged = params.get("paged") !== "0";

  const [isPaged, setIsPaged] = useState<boolean>(initialPaged);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

  const go = (dir: "prev" | "next") => {
    if (!course || !currentLessonId) return;
    const idx = course.lessons.findIndex((l) => l.id === currentLessonId);
    const nextIdx = dir === "prev" ? idx - 1 : idx + 1;
    const next = course.lessons[nextIdx];
    if (next) {
      setCurrentLessonId(next.id);
      const url = new URL(window.location.href);
      url.searchParams.set("paged", "1");
      url.searchParams.set("lesson", next.id);
      history.replaceState(null, "", url.toString());
    }
  };

  const goToLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    const url = new URL(window.location.href);
    url.searchParams.set("paged", "1");
    url.searchParams.set("lesson", lessonId);
    history.replaceState(null, "", url.toString());
  };

  const switchToPaged = () => {
    setIsPaged(true);
    const url = new URL(window.location.href);
    url.searchParams.set("paged", "1");
    const target = currentLessonId ?? course?.lessons[0]?.id ?? "";
    if (target) url.searchParams.set("lesson", target);
    history.replaceState(null, "", url.toString());
  };

  const switchToScrollMode = () => {
    setIsPaged(false);
    const url = new URL(window.location.href);
    url.searchParams.set("paged", "0");
    url.searchParams.delete("lesson");
    history.replaceState(null, "", url.toString());
  };

  // Scrollspy for active section in scroll mode
  useEffect(() => {
    if (!course || isPaged) return;
    const ids = course.lessons.map((l) => l.id);
    const handler = (entries: IntersectionObserverEntry[]) => {
      let visibleId: string | null = activeId;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleId = (entry.target as HTMLElement).id;
          break;
        }
      }
      if (visibleId && visibleId !== activeId) setActiveId(visibleId);
    };
    const io = new IntersectionObserver(handler, { root: null, threshold: 0.5 });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [course, isPaged, activeId]);

  // Arrow key navigation in paged mode
  useEffect(() => {
    if (!isPaged) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (el?.isContentEditable) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go("prev"); }
      if (e.key === "ArrowRight") { e.preventDefault(); go("next"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPaged, currentLessonId, course]);

  return {
    isPaged, setIsPaged,
    activeId,
    currentLessonId, setCurrentLessonId,
    go, goToLesson,
    switchToPaged, switchToScrollMode,
  };
}
