import { useEffect, useMemo, useRef, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { getSpec } from "@/components/blocks/registry";
import { Button } from "@/components/ui/button";

import type { Block, Lesson, Course } from "@/types/course";

export default function View() {
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const json = decompressFromEncodedURIComponent(hash);
      if (json) setCourse(JSON.parse(json));
    } catch (e) {
      console.error("Failed to parse course", e);
    }
  }, []);

  const flatNav = useMemo(() => course?.lessons.map((l) => ({ id: l.id, title: l.title })) ?? [], [course]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const gateParam = useMemo(() => params.get("gate"), [params]);
  const gateEnabled = useMemo(() => gateParam === "1" || gateParam === "quiz", [gateParam]);
  const gateQuiz = useMemo(() => gateParam === "quiz", [gateParam]);
  const paged = useMemo(() => params.get("paged") === "1" || !!params.get("lesson"), [params]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  useEffect(() => {
    if (!course) return;
    if (gateEnabled) {
      setUnlocked(new Set(course.lessons[0] ? [course.lessons[0].id] : []));
    } else {
      setUnlocked(new Set(course.lessons.map((l) => l.id)));
    }
    if (paged) {
      const paramLesson = params.get("lesson");
      const first = course.lessons[0]?.id ?? null;
      const target = course.lessons.some((l)=>l.id===paramLesson) ? (paramLesson as string) : first;
      setCurrentLessonId(target);
      const url = new URL(window.location.href);
      if (target) { url.searchParams.set("lesson", target); url.searchParams.set("paged","1"); history.replaceState(null, "", url.toString()); }
    }
  }, [course, gateEnabled, paged, params]);

  const currentHash = useMemo(() => window.location.hash.slice(1), []);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const storageKey = useMemo(() => "quizAnswers:" + window.location.hash.slice(1), []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    const handler = (e: Event) => {
      const anyE = e as CustomEvent<{ blockId: string; correct: boolean }>;
      const { blockId, correct } = anyE.detail || ({} as any);
      if (!blockId) return;
      setAnswers((prev) => {
        const next = { ...prev, [blockId]: !!correct };
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    window.addEventListener("quiz:answered", handler as EventListener);
    return () => window.removeEventListener("quiz:answered", handler as EventListener);
  }, [storageKey]);

  // Scrollspy for active section
  useEffect(() => {
    if (!course) return;
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
  }, [course, activeId]);

  // Progress bar based on main scroll
  useEffect(() => {
    const onScroll = () => {
      const main = document.querySelector("main");
      if (!main) return;
      const rect = main.getBoundingClientRect();
      const total = main.scrollHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(window.scrollY - (main as any).offsetTop, 0), total);
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      setProgress(Math.max(0, Math.min(100, pct)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!course) {
    return (
      <main className="min-h-screen container mx-auto flex items-center justify-center">
        <article className="text-center">
          <h1 className="text-2xl font-semibold mb-2">No course data</h1>
          <p className="text-muted-foreground">Provide a valid course URL with data in the hash segment.</p>
        </article>
      </main>
    );
  }

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

  const currentLesson = currentLessonId ? course.lessons.find((l) => l.id === currentLessonId) : null;
  const idx = currentLesson ? course.lessons.findIndex((l) => l.id === currentLesson.id) : -1;
  const prevLesson = idx > 0 ? course.lessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < course.lessons.length - 1 ? course.lessons[idx + 1] : null;

  return (
    <div>
      <header className="border-b bg-hero">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold text-gradient leading-tight">{course.title}</h1>
          {flatNav.length > 1 && !paged && (
            <nav className="mt-3 text-sm text-muted-foreground">
              <ul className="flex flex-wrap gap-3">
                {flatNav.map((l) => (
                  <li key={l.id}>
                    <a
                      className={l.id === activeId ? "text-primary font-medium" : "hover:text-foreground"}
                      href={`#${currentHash}`}
                      onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    >
                      {l.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {!paged && (
            <div className="mt-4 h-1 w-full rounded bg-muted">
              <div className="h-1 rounded bg-primary" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto py-8">
        {paged ? (
          currentLesson ? (
            <section key={currentLesson.id} className="space-y-6">
              <h2 className="text-2xl font-semibold mb-4">{currentLesson.title}</h2>
              {currentLesson.blocks.map((b) => {
                const spec = getSpec((b as any).type);
                const ViewComp = spec.View as any;
                return (
                  <article key={b.id} className="prose prose-slate max-w-none dark:prose-invert">
                    <ViewComp block={b as any} />
                  </article>
                );
              })}
              <div className="mt-6 flex items-center justify-between">
                <Button variant="secondary" disabled={!prevLesson} onClick={() => go("prev")}>Previous</Button>
                <Button disabled={!nextLesson} onClick={() => go("next")}>Next</Button>
              </div>
            </section>
          ) : (
            <p className="text-muted-foreground">Select a lesson to begin.</p>
          )
        ) : (
          <div className="space-y-12">
            {course.lessons.map((l, idx) => {
              const isUnlocked = unlocked.has(l.id);
              const nextId = course.lessons[idx + 1]?.id as string | undefined;
              const quizIds = l.blocks.filter((b: any) => ["quiz", "truefalse", "shortanswer"].includes((b as any).type)).map((b: any) => (b as any).id);
              const totalChecks = quizIds.length;
              const correctChecks = quizIds.filter((id: string) => answers[id]).length;
              return (
                <section key={l.id} id={l.id} className="scroll-mt-24">
                  <h2 className="text-2xl font-semibold mb-4">{l.title}</h2>
                  {gateEnabled && !isUnlocked ? (
                    <article className="rounded-md border p-6 text-center">
                      <p className="text-muted-foreground">This section is locked. Continue the previous section to unlock.</p>
                    </article>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {l.blocks.map((b) => {
                          const spec = getSpec((b as any).type);
                          const ViewComp = spec.View as any;
                          return (
                            <article key={b.id} className="prose prose-slate max-w-none dark:prose-invert">
                              <ViewComp block={b as any} />
                            </article>
                          );
                        })}
                      </div>
                      {gateEnabled && nextId && !unlocked.has(nextId) && (
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          {gateQuiz && (
                            <p className="text-sm text-muted-foreground">
                              Checks: {correctChecks}/{totalChecks} correct {totalChecks > 0 && correctChecks < totalChecks ? "— answer all to continue" : ""}
                            </p>
                          )}
                          <div className="flex justify-end">
                            <Button
                              disabled={gateQuiz && totalChecks > 0 && correctChecks < totalChecks}
                              onClick={() => setUnlocked((prev) => { const n = new Set(prev); if (nextId) n.add(nextId); return n; })}
                            >
                              Continue
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
