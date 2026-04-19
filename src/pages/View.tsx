import { useEffect, useMemo, useRef, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { Menu } from "lucide-react";
import { loadCourseFromCloud } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { getSpec } from "@/components/blocks/registry";

import { courseSchemaPermissive as courseSchema, type Course } from "@/types/course";
import { AssessmentView } from "@/pages/AssessmentView";
import { ViewSidebar } from "@/pages/ViewSidebar";
import { ViewBottomNav } from "@/pages/ViewBottomNav";
import { useQuizAnswers } from "@/hooks/useQuizAnswers";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useScormBridge } from "@/hooks/useScormBridge";
import { useLessonNavigation } from "@/hooks/useLessonNavigation";

export default function View() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const mainContentRef = useRef<HTMLDivElement>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const courseId = useMemo(() => params.get("id") ?? "", [params]);
  const gateParam = useMemo(() => params.get("gate"), [params]);
  const gateEnabled = gateParam === "1" || gateParam === "quiz";
  const gateQuiz = gateParam === "quiz";

  useEffect(() => {
    async function loadCourse() {
      const id = params.get("id");
      if (id) {
        const loaded = await loadCourseFromCloud(id);
        if (loaded) {
          const result = courseSchema.safeParse(loaded);
          if (result.success) { setCourse(result.data as Course); return; }
        }
        setError("Course not found");
        return;
      }
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      try {
        const json = decompressFromEncodedURIComponent(hash);
        if (json) {
          const result = courseSchema.safeParse(JSON.parse(json));
          if (result.success) { setCourse(result.data as Course); }
          else { console.error("Invalid course data", result.error); setError("Invalid course data"); }
        }
      } catch (e) {
        console.error("Failed to parse course", e);
        setError("Failed to parse course");
      }
    }
    loadCourse();
  }, []);

  const { answers } = useQuizAnswers();
  const { completed, lastLessonId, toggleComplete, trackLesson, applyResumeState } = useCourseProgress();
  const {
    isPaged, setIsPaged, activeId,
    currentLessonId, setCurrentLessonId,
    go, goToLesson, switchToPaged, switchToScrollMode,
  } = useLessonNavigation(course);

  useScormBridge({
    course,
    completed,
    lastLessonId,
    answers,
    onResume: (completedIds, resumeLessonId) => {
      applyResumeState(completedIds, resumeLessonId);
      setIsPaged(true);
      setCurrentLessonId(resumeLessonId);
      const url = new URL(window.location.href);
      url.searchParams.set("paged", "1");
      url.searchParams.set("lesson", resumeLessonId);
      history.replaceState(null, "", url.toString());
    },
  });

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

  useEffect(() => {
    if (!currentLessonId) return;
    trackLesson(currentLessonId);
    requestAnimationFrame(() => mainContentRef.current?.focus());
  }, [currentLessonId]);

  if (error) {
    return (
      <main role="alert" className="min-h-screen flex items-center justify-center font-sans">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold mb-2">Invalid course data</h1>
          <p className="text-[var(--text-muted)]">{error}</p>
        </div>
      </main>
    );
  }
  if (!course) {
    return (
      <main role="alert" className="min-h-screen flex items-center justify-center font-sans">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold mb-2">No course data</h1>
          <p className="text-[var(--text-muted)]">Provide a valid course URL with data in the hash segment.</p>
        </div>
      </main>
    );
  }

  const flatNav = course.lessons.map((l) => ({ id: l.id, title: l.title }));
  const currentLesson = currentLessonId ? course.lessons.find((l) => l.id === currentLessonId) : null;
  const idx = currentLesson ? course.lessons.findIndex((l) => l.id === currentLesson.id) : -1;
  const prevLesson = idx > 0 ? course.lessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < course.lessons.length - 1 ? course.lessons[idx + 1] : null;
  const totalLessons = course.lessons.length;
  const courseProgress = totalLessons > 0 ? (completed.size / totalLessons) * 100 : 0;
  const canResume = !!(lastLessonId && course.lessons.some((l) => l.id === lastLessonId));
  const isCourseCompleted = totalLessons > 0 && completed.size >= totalLessons;

  return (
    <div className="font-sans h-screen flex flex-col overflow-hidden">

      <div role="progressbar" aria-label="Course progress" aria-valuenow={Math.round(courseProgress)} aria-valuemin={0} aria-valuemax={100} className="h-[3px] w-full bg-[hsl(var(--border))] shrink-0">
        <div className="h-full bg-[var(--accent-hex)] transition-all duration-300" style={{ width: `${courseProgress}%` }} />
      </div>

      <header className="h-[var(--topbar-h)] bg-[var(--sidebar-3)] flex items-center justify-between px-4 md:px-5 shrink-0 relative">
        <div className="flex items-center gap-2">
          <button className="md:hidden p-2 -ml-2 text-white/70 hover:text-white transition-colors" aria-label="Toggle lesson list" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </button>
          <a href="/courses" aria-label="TideLearn home" className="flex items-center gap-2 no-underline">
            <span aria-hidden="true" className="w-7 h-7 rounded-[7px] bg-[var(--accent-hex)] flex items-center justify-center text-sm font-extrabold text-white leading-none shrink-0">T</span>
            <span className="text-white font-extrabold text-sm tracking-tight">TideLearn</span>
          </a>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[13px] font-semibold whitespace-nowrap opacity-90 max-w-[calc(100%-300px)] overflow-hidden text-ellipsis hidden md:block">{course.title}</div>
        <div className="flex items-center gap-3">
          <div role="group" aria-label="View mode" className="flex items-center gap-2">
            {canResume && (
              <button className="bg-transparent border-none text-[var(--text-muted)] text-xs cursor-pointer px-2 py-0.5 rounded font-sans hover:text-[var(--accent-hex)] transition-colors" onClick={() => { if (lastLessonId) { setIsPaged(true); setCurrentLessonId(lastLessonId); const url = new URL(window.location.href); url.searchParams.set("paged", "1"); url.searchParams.set("lesson", lastLessonId); history.replaceState(null, "", url.toString()); } }}>Resume: {currentLesson?.title || "Continue"}</button>
            )}
            <button aria-pressed={isPaged} className={`bg-transparent border-none text-xs cursor-pointer px-2 py-0.5 rounded font-sans transition-colors ${isPaged ? "text-[var(--accent-hex)] font-semibold" : "text-[var(--text-muted)] hover:text-white/70"}`} onClick={() => { if (!isPaged) switchToPaged(); }}>Paged</button>
            <button aria-pressed={!isPaged} className={`bg-transparent border-none text-xs cursor-pointer px-2 py-0.5 rounded font-sans transition-colors ${!isPaged ? "text-[var(--accent-hex)] font-semibold" : "text-[var(--text-muted)] hover:text-white/70"}`} onClick={() => { if (isPaged) switchToScrollMode(); }}>View All</button>
          </div>
          <a href="/courses" className="text-[var(--accent-hex)] text-[13px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] no-underline font-sans hover:text-[var(--accent-hex)]/80 transition-colors">Exit</a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        <ViewSidebar
          flatNav={flatNav}
          currentLessonId={currentLessonId}
          activeId={activeId}
          completed={completed}
          isPaged={isPaged}
          sidebarOpen={sidebarOpen}
          onSelectLesson={(id) => { if (isPaged) goToLesson(id); else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        <main id="main-content" ref={mainContentRef} tabIndex={-1} className="flex-1 overflow-y-auto bg-white outline-none">
          <div className="max-w-[var(--reading-max-w)] mx-auto px-4 md:px-16 py-10 pb-32">

            {isPaged ? (
              currentLesson ? (
                <section key={currentLesson.id}>
                  <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--accent-hex)] mb-3">Lesson {idx + 1}</div>
                  {currentLesson.kind !== "assessment" && (
                    <h1 className="font-display text-[28px] font-bold text-[var(--ink)] leading-[1.3] mb-8 tracking-tight">{currentLesson.title}</h1>
                  )}
                  {currentLesson.kind === "content" && currentLesson.blocks.map((b) => { const spec = getSpec(b.type); return <article key={b.id}><spec.View block={b} /></article>; })}
                  {currentLesson.kind === "assessment" && <AssessmentView lesson={currentLesson} courseId={courseId} />}
                  {currentLesson.kind !== "assessment" && (
                    <div className="mt-8 flex justify-end">
                      <button aria-label={completed.has(currentLesson.id) ? "Completed" : "Mark as complete"} aria-pressed={completed.has(currentLesson.id)} onClick={() => toggleComplete(currentLesson.id)} className={cn("text-[13px] font-medium cursor-pointer px-4 py-2 rounded-[var(--radius-md)] font-sans transition-colors", completed.has(currentLesson.id) ? "bg-[var(--accent-hex)] text-white border-none" : "bg-transparent border border-[hsl(var(--border))] text-[var(--text-muted)] hover:border-[var(--accent-hex)] hover:text-[var(--accent-hex)]")}>
                        {completed.has(currentLesson.id) ? <><span aria-hidden="true">&#10003; </span>Completed</> : "Mark complete"}
                      </button>
                    </div>
                  )}
                </section>
              ) : <p className="text-[var(--text-muted)]">Select a lesson to begin.</p>
            ) : (
              <div>
                {course.lessons.map((l, lessonIdx) => {
                  const isUnlocked = unlocked.has(l.id);
                  const nextId = course.lessons[lessonIdx + 1]?.id as string | undefined;
                  const quizIds = l.kind === "content" ? l.blocks.filter((b) => ["quiz", "truefalse", "shortanswer"].includes(b.type)).map((b) => b.id) : [];
                  const totalChecks = quizIds.length;
                  const correctChecks = quizIds.filter((id: string) => answers[id]).length;
                  return (
                    <section key={l.id} id={l.id} className="mb-16 scroll-mt-24">
                      <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--accent-hex)] mb-3">Lesson {lessonIdx + 1}</div>
                      <h2 className="font-display text-[28px] font-bold text-[var(--ink)] leading-[1.3] mb-8 tracking-tight">{l.title}</h2>
                      {gateEnabled && !isUnlocked ? (
                        <div className="rounded-[var(--radius-md)] border border-[hsl(var(--border))] p-6 text-center bg-[var(--canvas)]">
                          <p className="text-[var(--text-muted)] text-sm">This section is locked. Continue the previous section to unlock.</p>
                          <button className="text-[var(--accent-hex)] hover:underline text-sm mt-1" onClick={() => { const prev = course.lessons.findLast((_l, i) => i < lessonIdx && unlocked.has(_l.id)); if (prev) { setCurrentLessonId(prev.id); setIsPaged(true); } }}>Go to previous section</button>
                        </div>
                      ) : (
                        <>
                          <div>
                            {l.kind === "content" && l.blocks.map((b) => { const spec = getSpec(b.type); return <article key={b.id}><spec.View block={b} /></article>; })}
                            {l.kind === "assessment" && (
                              <div className="italic text-[var(--text-muted)] text-sm py-4">Assessment: {l.questions?.length ?? 0} questions — <button className="text-[var(--accent-hex)] hover:underline font-medium not-italic" onClick={() => { setIsPaged(true); setCurrentLessonId(l.id); }}>Take assessment</button></div>
                            )}
                          </div>
                          <div className="mt-6 flex justify-end">
                            <button aria-label={completed.has(l.id) ? "Completed" : "Mark as complete"} aria-pressed={completed.has(l.id)} onClick={() => toggleComplete(l.id)} className={cn("text-[13px] font-medium cursor-pointer px-4 py-2 rounded-[var(--radius-md)] font-sans transition-colors", completed.has(l.id) ? "bg-[var(--accent-hex)] text-white border-none" : "bg-transparent border border-[hsl(var(--border))] text-[var(--text-muted)] hover:border-[var(--accent-hex)] hover:text-[var(--accent-hex)]")}>
                              {completed.has(l.id) ? <><span aria-hidden="true">&#10003; </span>Completed</> : "Mark complete"}
                            </button>
                          </div>
                          {gateEnabled && nextId && !unlocked.has(nextId) && (
                            <div className="mt-4 flex flex-col gap-2">
                              {gateQuiz && <p className="text-[13px] text-[var(--text-muted)]">Checks: {correctChecks}/{totalChecks} correct{totalChecks > 0 && correctChecks < totalChecks ? " — answer all to continue" : ""}</p>}
                              <div className="flex justify-end">
                                <button disabled={gateQuiz && totalChecks > 0 && correctChecks < totalChecks} onClick={() => setUnlocked((prev) => { const n = new Set(prev); if (nextId) n.add(nextId); return n; })} className={cn("bg-[var(--accent-hex)] border-none text-white text-[13px] font-semibold px-[18px] py-2 rounded-[var(--radius-md)] font-sans transition-opacity", (gateQuiz && totalChecks > 0 && correctChecks < totalChecks) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90")}>Continue</button>
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

      {isPaged && (
        <ViewBottomNav
          idx={idx}
          totalLessons={totalLessons}
          hasPrev={!!prevLesson}
          hasNext={!!nextLesson}
          isCourseCompleted={isCourseCompleted}
          onPrev={() => go("prev")}
          onNext={() => go("next")}
        />
      )}
    </div>
  );
}
