import { useEffect, useMemo, useRef, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { Menu } from "lucide-react";
import { loadCourseFromCloud } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { getSpec } from "@/components/blocks/registry";

import { courseSchemaPermissive as courseSchema, type Course } from "@/types/course";
import { AssessmentView } from "@/pages/AssessmentView";

interface QuizAnsweredDetail {
  blockId: string;
  correct: boolean;
}

type QuizAnsweredEvent = CustomEvent<QuizAnsweredDetail>;

interface ResumeState {
  completed?: string[];
  lastLessonId?: string;
}

interface ResumeMessage {
  type: "resume";
  state?: ResumeState;
}

interface ReadyMessage {
  type: "ready";
}

interface ProgressMessage {
  type: "progress";
  completed: string[];
  lastLessonId: string | null;
  courseCompleted: boolean;
  score: number | null;
  totalQuestions: number;
  correctAnswers: number;
}

export default function View() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      // Option 1: load by course ID (clean URL, requires Supabase)
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get("id");
      if (courseId) {
        const course = await loadCourseFromCloud(courseId);
        if (course) {
          const result = courseSchema.safeParse(course);
          if (result.success) {
            setCourse(result.data as Course);
            return;
          }
        }
        setError("Course not found");
        return;
      }

      // Option 2: load from URL hash (legacy / anonymous sharing)
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      try {
        const json = decompressFromEncodedURIComponent(hash);
        if (json) {
          const parsed = JSON.parse(json);
          const result = courseSchema.safeParse(parsed);
          if (result.success) {
            setCourse(result.data as Course);
          } else {
            console.error("Invalid course data", result.error);
            setError("Invalid course data");
          }
        }
      } catch (e) {
        console.error("Failed to parse course", e);
        setError("Failed to parse course");
      }
    }
    loadCourse();
  }, []);

  const flatNav = useMemo(() => course?.lessons.map((l) => ({ id: l.id, title: l.title })) ?? [], [course]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const courseId = useMemo(() => params.get("id") ?? "", [params]);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      const target = course.lessons.some((l) => l.id === paramLesson) ? (paramLesson as string) : first;
      setCurrentLessonId(target);
      const url = new URL(window.location.href);
      if (target) { url.searchParams.set("lesson", target); url.searchParams.set("paged", "1"); history.replaceState(null, "", url.toString()); }
    }
  }, [course, gateEnabled, isPaged, params]);

  const currentHash = useMemo(() => window.location.hash.slice(1), []);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const storageKey = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    return "quizAnswers:" + (id ? `id:${id}` : window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as QuizAnsweredEvent).detail;
      const blockId = detail?.blockId;
      const correct = detail?.correct;
      if (!blockId) return;
      setAnswers((prev) => {
        const next = { ...prev, [blockId]: !!correct };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener("quiz:answered", handler);
    return () => window.removeEventListener("quiz:answered", handler);
  }, [storageKey]);

  // Persistent course progress (completed lessons + resume)
  const progressKey = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    return "courseProgress:" + (id ? `id:${id}` : window.location.hash.slice(1));
  }, []);
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
    try {
      if (window.parent && window.parent !== window) {
        const msg: ReadyMessage = { type: "ready" };
        window.parent.postMessage(msg, "*");
      }
    } catch {}
  }, [course]);

  useEffect(() => {
    if (!course) return;
    const onMsg = (event: MessageEvent<ResumeMessage>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "resume") {
        const st = data.state || {};
        if (Array.isArray(st.completed)) setCompleted(new Set(st.completed));
        if (st.lastLessonId && course.lessons.some((l) => l.id === st.lastLessonId)) {
          setIsPaged(true);
          setCurrentLessonId(st.lastLessonId);
          const url = new URL(window.location.href);
          url.searchParams.set("paged", "1");
          url.searchParams.set("lesson", st.lastLessonId);
          history.replaceState(null, "", url.toString());
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [course]);

  useEffect(() => {
    if (!course) return;
    const total = course.lessons.length || 0;
    const courseCompleted = total > 0 && completed.size >= total;

    const allQuizIds: string[] = [];
    for (const lesson of course.lessons) {
      if (lesson.kind !== "content") continue;
      for (const block of lesson.blocks) {
        if (["quiz", "truefalse", "shortanswer"].includes((block as any).type)) {
          if (block.id) allQuizIds.push(block.id);
        }
      }
    }
    const totalQuestions = allQuizIds.length;
    const correctAnswers = allQuizIds.filter((id) => answers[id] === true).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;

    try {
      if (window.parent && window.parent !== window) {
        const msg: ProgressMessage = {
          type: "progress",
          completed: Array.from(completed),
          lastLessonId,
          courseCompleted,
          score,
          totalQuestions,
          correctAnswers,
        };
        window.parent.postMessage(msg, "*");
      }
    } catch {}
  }, [completed, lastLessonId, course, answers]);

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

  // ── Error / no-course states ──────────────────────────────────────────────

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Invalid course data</h1>
          <p style={{ color: "#64748b" }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No course data</h1>
          <p style={{ color: "#64748b" }}>Provide a valid course URL with data in the hash segment.</p>
        </div>
      </main>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getDotStyle = (lessonId: string, isCurrent: boolean): React.CSSProperties => {
    if (completed.has(lessonId)) {
      return { width: 8, height: 8, borderRadius: "50%", background: "#14b8a6", flexShrink: 0 };
    }
    if (isCurrent) {
      return {
        width: 8, height: 8, borderRadius: "50%", background: "#14b8a6", flexShrink: 0,
        boxShadow: "0 0 0 3px rgba(20,184,166,0.25)",
        animation: "pulse-ring 1.8s ease-in-out infinite",
      };
    }
    return { width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #b2d8d0", background: "transparent", flexShrink: 0 };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans h-screen flex flex-col overflow-hidden">

      {/* Progress stripe — very top */}
      <div
        role="progressbar"
        aria-label="Course progress"
        aria-valuenow={Math.round(courseProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[3px] w-full bg-[var(--border-subtle)] shrink-0"
      >
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-300"
          style={{ width: `${courseProgress}%` }}
        />
      </div>

      {/* Topbar */}
      <header className="h-[var(--topbar-h)] bg-[var(--ocean-surface)] flex items-center justify-between px-4 md:px-5 shrink-0 relative">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-2">
          <button
            className="md:hidden p-2 -ml-2 text-white/70 hover:text-white transition-colors"
            aria-label="Toggle lesson list"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <a href="/courses" aria-label="TideLearn home" className="flex items-center gap-2 no-underline">
            <span aria-hidden="true" className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-sm leading-none shrink-0">🌊</span>
            <span className="text-white font-extrabold text-sm tracking-tight">TideLearn</span>
          </a>
        </div>

        {/* Center: course title (absolute) */}
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[13px] font-semibold whitespace-nowrap opacity-90 max-w-[calc(100%-300px)] overflow-hidden text-ellipsis hidden md:block">
          {course.title}
        </div>

        {/* Right: view-mode toggle + exit */}
        <div className="flex items-center gap-3">
          {/* Subtle paged/view-all toggle */}
          <div role="group" aria-label="View mode" className="flex items-center gap-2">
            {canResume && (
              <button
                className="bg-transparent border-none text-slate-400 text-xs cursor-pointer px-2 py-0.5 rounded font-sans hover:text-teal-400 transition-colors"
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
                Resume: {currentLesson?.title || "Continue"}
              </button>
            )}
            <button
              aria-pressed={isPaged}
              className={`bg-transparent border-none text-xs cursor-pointer px-2 py-0.5 rounded font-sans transition-colors ${isPaged ? "text-teal-400 font-semibold" : "text-[var(--text-muted)] hover:text-slate-300"}`}
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
            </button>
            <button
              aria-pressed={!isPaged}
              className={`bg-transparent border-none text-xs cursor-pointer px-2 py-0.5 rounded font-sans transition-colors ${!isPaged ? "text-teal-400 font-semibold" : "text-[var(--text-muted)] hover:text-slate-300"}`}
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
            </button>
          </div>

          <a
            href="/courses"
            className="text-teal-400 text-[13px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] no-underline font-sans hover:text-teal-300 transition-colors"
          >
            Exit
          </a>
        </div>
      </header>

      {/* Main layout: sidebar + reading area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav
          aria-label="Lesson navigation"
          className={cn(
            "fixed md:relative z-30 md:z-auto",
            "w-[var(--sidebar-w-viewer)] h-full",
            "bg-[var(--surface-subtle)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 overflow-y-auto py-5",
            "transition-transform md:transition-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--teal-bright)] px-4 pb-2.5">
            Lessons
          </div>

          {flatNav.map((l, i) => {
            const isActive = isPaged ? l.id === currentLessonId : l.id === activeId;
            const isCurrent = l.id === currentLessonId;

            return (
              <button
                key={l.id}
                onClick={() => {
                  if (isPaged) {
                    setCurrentLessonId(l.id);
                    const url = new URL(window.location.href);
                    url.searchParams.set("paged", "1");
                    url.searchParams.set("lesson", l.id);
                    history.replaceState(null, "", url.toString());
                  } else {
                    document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full text-left flex items-start gap-2.5 py-2 px-4 pl-3 border-l-[3px] transition-colors",
                  isActive
                    ? "border-l-[var(--teal-bright)] bg-[var(--surface-tint)]"
                    : "border-l-transparent hover:bg-[var(--surface-tint)]"
                )}
              >
                {/* Dot */}
                <div className="shrink-0 w-4 flex items-center justify-center pt-[3px]">
                  <div style={getDotStyle(l.id, isCurrent)} />
                </div>
                {/* Number */}
                <span className={cn("text-[9px] font-semibold shrink-0 pt-px", isActive ? "text-[var(--teal-primary)]" : "text-slate-400")}>
                  {i + 1}
                </span>
                {/* Title */}
                <span className={cn("text-xs leading-[1.45]", isActive ? "text-[var(--teal-primary)] font-semibold" : "text-slate-600")}>
                  {l.title}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Reading area */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "#fff",
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{ width: "100%", maxWidth: 680, padding: "40px 64px 120px" }}>

            {isPaged ? (
              currentLesson ? (
                <section key={currentLesson.id} ref={lessonRef as React.RefObject<HTMLElement>}>
                  {/* Lesson breadcrumb */}
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#0d9488",
                    marginBottom: 12,
                  }}>
                    Lesson {idx + 1}
                  </div>

                  {/* Lesson title — hidden for assessment lessons (AssessmentView renders its own) */}
                  {currentLesson.kind !== "assessment" && (
                  <h1 style={{
                    fontFamily: "Lora, serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#0d2926",
                    lineHeight: 1.3,
                    marginBottom: 32,
                    letterSpacing: "-0.01em",
                  }}>
                    {currentLesson.title}
                  </h1>
                  )}

                  {/* Blocks */}
                  {currentLesson.kind === "content" && currentLesson.blocks.map((b) => {
                    const spec = getSpec((b as any).type);
                    const ViewComp = spec.View as any;
                    return (
                      <article key={b.id}>
                        <ViewComp block={b as any} />
                      </article>
                    );
                  })}
                  {currentLesson.kind === "assessment" && (
                    <AssessmentView lesson={currentLesson} courseId={courseId} />
                  )}

                  {/* Mark complete toggle — not shown for assessment lessons */}
                  {currentLesson.kind !== "assessment" && (
                  <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      aria-pressed={completed.has(currentLesson.id)}
                      onClick={() => toggleComplete(currentLesson.id)}
                      style={{
                        background: completed.has(currentLesson.id)
                          ? "linear-gradient(135deg, #14b8a6, #0891b2)"
                          : "none",
                        border: completed.has(currentLesson.id) ? "none" : "1.5px solid #e0fdf4",
                        color: completed.has(currentLesson.id) ? "#fff" : "#64748b",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {completed.has(currentLesson.id) ? "✓ Completed" : "Mark complete"}
                    </button>
                  </div>
                  )}
                </section>
              ) : (
                <p style={{ color: "#64748b" }}>Select a lesson to begin.</p>
              )
            ) : (
              /* View All mode */
              <div>
                {course.lessons.map((l, lessonIdx) => {
                  const isUnlocked = unlocked.has(l.id);
                  const nextId = course.lessons[lessonIdx + 1]?.id as string | undefined;
                  const quizIds = l.kind === "content"
                    ? l.blocks.filter((b: any) => ["quiz", "truefalse", "shortanswer"].includes((b as any).type)).map((b: any) => (b as any).id)
                    : [];
                  const totalChecks = quizIds.length;
                  const correctChecks = quizIds.filter((id: string) => answers[id]).length;

                  return (
                    <section key={l.id} id={l.id} style={{ marginBottom: 64, scrollMarginTop: 96 }}>
                      {/* Lesson breadcrumb */}
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#0d9488",
                        marginBottom: 12,
                      }}>
                        Lesson {lessonIdx + 1}
                      </div>

                      {/* Lesson title */}
                      <h2 style={{
                        fontFamily: "Lora, serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#0d2926",
                        lineHeight: 1.3,
                        marginBottom: 32,
                        letterSpacing: "-0.01em",
                      }}>
                        {l.title}
                      </h2>

                      {gateEnabled && !isUnlocked ? (
                        <div style={{
                          borderRadius: 8,
                          border: "1px solid #e0fdf4",
                          padding: 24,
                          textAlign: "center",
                          background: "#f8fffe",
                        }}>
                          <p style={{ color: "#64748b", fontSize: 14 }}>This section is locked. Continue the previous section to unlock.</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            {l.kind === "content" && l.blocks.map((b) => {
                              const spec = getSpec((b as any).type);
                              const ViewComp = spec.View as any;
                              return (
                                <article key={b.id}>
                                  <ViewComp block={b as any} />
                                </article>
                              );
                            })}
                            {l.kind === "assessment" && (
                              <div style={{ padding: "16px 0", color: "#64748b", fontSize: 14, fontStyle: "italic" }}>
                                Assessment: {(l as any).questions?.length ?? 0} questions — navigate to this lesson to take the assessment.
                              </div>
                            )}
                          </div>

                          {/* Mark complete toggle */}
                          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                            <button
                              aria-pressed={completed.has(l.id)}
                              onClick={() => toggleComplete(l.id)}
                              style={{
                                background: completed.has(l.id)
                                  ? "linear-gradient(135deg, #14b8a6, #0891b2)"
                                  : "none",
                                border: completed.has(l.id) ? "none" : "1.5px solid #e0fdf4",
                                color: completed.has(l.id) ? "#fff" : "#64748b",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                padding: "8px 16px",
                                borderRadius: 8,
                                fontFamily: "Inter, sans-serif",
                              }}
                            >
                              {completed.has(l.id) ? "✓ Completed" : "Mark complete"}
                            </button>
                          </div>

                          {gateEnabled && nextId && !unlocked.has(nextId) && (
                            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                              {gateQuiz && (
                                <p style={{ fontSize: 13, color: "#64748b" }}>
                                  Checks: {correctChecks}/{totalChecks} correct{totalChecks > 0 && correctChecks < totalChecks ? " — answer all to continue" : ""}
                                </p>
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                  disabled={gateQuiz && totalChecks > 0 && correctChecks < totalChecks}
                                  onClick={() => setUnlocked((prev) => { const n = new Set(prev); if (nextId) n.add(nextId); return n; })}
                                  style={{
                                    background: "linear-gradient(135deg, #14b8a6, #0891b2)",
                                    border: "none",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: (gateQuiz && totalChecks > 0 && correctChecks < totalChecks) ? "not-allowed" : "pointer",
                                    padding: "8px 18px",
                                    borderRadius: 8,
                                    fontFamily: "Inter, sans-serif",
                                    opacity: (gateQuiz && totalChecks > 0 && correctChecks < totalChecks) ? 0.5 : 1,
                                  }}
                                >
                                  Continue
                                </button>
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

          </div>
        </main>
      </div>

      {/* Bottom nav — fixed, only shown in paged mode */}
      {isPaged && (
        <nav style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "#fff",
          borderTop: "1px solid #e0fdf4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          zIndex: 100,
        }}>
          {/* Previous */}
          <button
            disabled={!prevLesson}
            onClick={() => go("prev")}
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              color: prevLesson ? "#64748b" : "#cbd5e1",
              cursor: prevLesson ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => {
              if (prevLesson) {
                (e.currentTarget as HTMLButtonElement).style.background = "#f0fdfb";
                (e.currentTarget as HTMLButtonElement).style.color = "#0d9488";
              }
            }}
            onMouseLeave={(e) => {
              if (prevLesson) {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
                (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
              }
            }}
          >
            ← Previous lesson
          </button>

          {/* Counter */}
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
            {isCourseCompleted
              ? "Course complete ✓"
              : `Lesson ${idx + 1} of ${totalLessons}`}
          </span>

          {/* Next */}
          {isCourseCompleted && !nextLesson ? (
            <button
              disabled
              style={{
                background: "linear-gradient(135deg, #14b8a6, #0891b2)",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                opacity: 0.75,
              }}
            >
              Completed ✓
            </button>
          ) : (
            <button
              disabled={!nextLesson}
              onClick={() => go("next")}
              style={{
                background: nextLesson
                  ? "linear-gradient(135deg, #14b8a6, #0891b2)"
                  : "#e2e8f0",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                color: nextLesson ? "#fff" : "#94a3b8",
                cursor: nextLesson ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => {
                if (nextLesson) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                if (nextLesson) (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
            >
              Next lesson →
            </button>
          )}
        </nav>
      )}

    </div>
  );
}
