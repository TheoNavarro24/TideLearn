import { useEffect, useMemo, useRef, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { getSpec } from "@/components/blocks/registry";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

import { courseSchema, type Block, type Lesson, type Course } from "@/types/course";

export default function View() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const json = decompressFromEncodedURIComponent(hash);
      if (json) {
        const parsed = JSON.parse(json);
        const result = courseSchema.safeParse(parsed);
        if (result.success) {
          setCourse(result.data);
        } else {
          console.error("Invalid course data", result.error);
          setError("Invalid course data");
        }
      }
    } catch (e) {
      console.error("Failed to parse course", e);
      setError("Failed to parse course");
    }
  }, []);

  const flatNav = useMemo(() => course?.lessons.map((l) => ({ id: l.id, title: l.title })) ?? [], [course]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const gateParam = useMemo(() => params.get("gate"), [params]);
  const gateEnabled = useMemo(() => gateParam === "1" || gateParam === "quiz", [gateParam]);
  const gateQuiz = useMemo(() => gateParam === "quiz", [gateParam]);
  const initialPaged = useMemo(() => {
    const p = params.get("paged");
    // Default to paged mode unless explicitly disabled (?paged=0)
    if (p === "0") return false;
    return true;
  }, [params]);
  const [isPaged, setIsPaged] = useState<boolean>(initialPaged);
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
    if (isPaged) {
      const paramLesson = params.get("lesson");
      const first = course.lessons[0]?.id ?? null;
      const target = course.lessons.some((l)=>l.id===paramLesson) ? (paramLesson as string) : first;
      setCurrentLessonId(target);
      const url = new URL(window.location.href);
      if (target) { url.searchParams.set("lesson", target); url.searchParams.set("paged","1"); history.replaceState(null, "", url.toString()); }
    }
  }, [course, gateEnabled, isPaged, params]);

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

  // Persistent course progress (completed lessons + resume)
  const progressKey = useMemo(() => "courseProgress:" + window.location.hash.slice(1), []);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [lastLessonId, setLastLessonId] = useState<string | null>(null);

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

  const persistProgress = (nextCompleted: Set<string>, nextLast: string | null) => {
    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({ completed: Array.from(nextCompleted), lastLessonId: nextLast || undefined })
      );
    } catch {}
  };

  const toggleComplete = (lessonId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
      persistProgress(next, lastLessonId);
      window.dispatchEvent(new Event("course:progress:changed"));
      return next;
    });
  };

  useEffect(() => {
    const handler = () => loadProgress();
    window.addEventListener("course:progress:changed", handler as EventListener);
    return () => window.removeEventListener("course:progress:changed", handler as EventListener);
  }, [progressKey]);

  // Update last viewed lesson (resume)
  useEffect(() => {
    if (!currentLessonId) return;
    setLastLessonId(currentLessonId);
    persistProgress(completed, currentLessonId);
    window.dispatchEvent(new Event("course:progress:changed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLessonId]);

  // SCORM/LMS bridge: messaging (ready/resume/progress)
  useEffect(() => {
    if (!course) return;
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'ready' }, '*'); } catch {}
  }, [course]);
  useEffect(() => {
    if (!course) return;
    const onMsg = (event: MessageEvent) => {
      const data: any = (event as any).data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'resume') {
        const st = (data.state || {}) as { completed?: string[]; lastLessonId?: string };
        if (Array.isArray(st.completed)) setCompleted(new Set(st.completed));
        if (st.lastLessonId && course.lessons.some((l) => l.id === st.lastLessonId)) {
          setIsPaged(true);
          setCurrentLessonId(st.lastLessonId);
          const url = new URL(window.location.href);
          url.searchParams.set('paged', '1');
          url.searchParams.set('lesson', st.lastLessonId);
          history.replaceState(null, '', url.toString());
        }
      }
    };
    window.addEventListener('message', onMsg as any);
    return () => window.removeEventListener('message', onMsg as any);
  }, [course]);
  useEffect(() => {
    if (!course) return;
    const total = course.lessons.length || 0;
    const courseCompleted = total > 0 && completed.size >= total;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'progress', completed: Array.from(completed), lastLessonId, courseCompleted }, '*');
      }
    } catch {}
  }, [completed, lastLessonId, course]);

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

  // Per-lesson progress tracking in paged mode
  const lessonRef = useRef<HTMLElement | null>(null);
  const [lessonProgress, setLessonProgress] = useState(0);
  useEffect(() => {
    if (!isPaged) return;
    const onScroll = () => {
      const el = lessonRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const height = el.scrollHeight;
      const total = Math.max(height - window.innerHeight, 0);
      const scrolled = Math.min(Math.max(window.scrollY - top, 0), total);
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      setLessonProgress(Math.max(0, Math.min(100, pct)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isPaged, currentLessonId]);

  // Arrow key navigation in paged mode
  useEffect(() => {
    if (!isPaged) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go("prev"); }
      if (e.key === "ArrowRight") { e.preventDefault(); go("next"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPaged, currentLessonId, course]);

  if (error) {
    return (
      <main className="min-h-screen container mx-auto flex items-center justify-center">
        <article className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Invalid course data</h1>
          <p className="text-muted-foreground">{error}</p>
        </article>
      </main>
    );
  }

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
  const totalLessons = course.lessons.length;
  const courseProgress = totalLessons > 0 ? (completed.size / totalLessons) * 100 : 0;
  const canResume = !!(lastLessonId && course.lessons.some((l) => l.id === lastLessonId));
  const isCourseCompleted = totalLessons > 0 && completed.size >= totalLessons;

  return (
    <div>
      {isPaged && totalLessons > 1 && (
        <div className="fixed inset-x-0 top-0 z-50">
          <Progress value={courseProgress} aria-label={`Course progress ${Math.round(courseProgress)} percent`} className="h-1 rounded-none" />
        </div>
      )}
      <header className="border-b bg-hero">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gradient leading-tight">{course.title}</h1>
              {isCourseCompleted && (
                <Badge variant="secondary" aria-live="polite" className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </Badge>
              )}
            </div>
            <div role="group" aria-label="View mode" className="inline-flex items-center gap-2">
              {canResume && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!lastLessonId) return;
                    setIsPaged(true);
                    setCurrentLessonId(lastLessonId);
                    const url = new URL(window.location.href);
                    url.searchParams.set("paged", "1");
                    url.searchParams.set("lesson", lastLessonId);
                    history.replaceState(null, "", url.toString());
                  }}
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Resume
                </Button>
              )}
              <Button
                size="sm"
                variant={isPaged ? "default" : "secondary"}
                aria-pressed={isPaged}
                onClick={() => {
                  if (isPaged) return;
                  setIsPaged(true);
                  const url = new URL(window.location.href);
                  url.searchParams.set("paged", "1");
                  const target = currentLessonId ?? course.lessons[0]?.id ?? "";
                  if (target) url.searchParams.set("lesson", target);
                  history.replaceState(null, "", url.toString());
                }}
              >
                Paged
              </Button>
              <Button
                size="sm"
                variant={!isPaged ? "default" : "secondary"}
                aria-pressed={!isPaged}
                onClick={() => {
                  if (!isPaged) return;
                  setIsPaged(false);
                  const url = new URL(window.location.href);
                  url.searchParams.set("paged", "0");
                  url.searchParams.delete("lesson");
                  history.replaceState(null, "", url.toString());
                }}
              >
                View All
              </Button>
            </div>
          </div>
          {isPaged && currentLesson && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Lesson progress</span>
                <span aria-live="polite">{Math.round(lessonProgress)}%</span>
              </div>
              <Progress value={lessonProgress} aria-label={`Lesson progress ${Math.round(lessonProgress)} percent`} />
            </div>
          )}
          {flatNav.length > 1 && !isPaged && (
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
        </div>
      </header>

      <main className="container mx-auto py-8">
        {isPaged ? (
          currentLesson ? (
            <section key={currentLesson.id} ref={lessonRef as any} className="space-y-6">
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
                <div>
                  <Button
                    size="sm"
                    variant={completed.has(currentLesson.id) ? "secondary" : "outline"}
                    aria-pressed={completed.has(currentLesson.id)}
                    onClick={() => toggleComplete(currentLesson.id)}
                  >
                    {completed.has(currentLesson.id) ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Completed
                      </>
                    ) : (
                      <>
                        <Circle className="mr-2 h-4 w-4" /> Mark complete
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" disabled={!prevLesson} onClick={() => go("prev")}>Previous</Button>
                  <Button disabled={!nextLesson} onClick={() => go("next")}>Next</Button>
                </div>
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
