import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { decompressFromEncodedURIComponent } from "lz-string";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { Course, TocBlock } from "@/types/course";

export function TocView({ block }: { block: TocBlock }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const currentHash = location.hash.slice(1);
  useEffect(() => {
    try {
      const hash = currentHash;
      if (!hash) return;
      const json = decompressFromEncodedURIComponent(hash);
      if (json) setCourse(JSON.parse(json));
    } catch {
      /* ignored */
    }
  }, [currentHash]);

  const progressKey = useMemo(() => "courseProgress:" + currentHash, [currentHash]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const p = JSON.parse(raw) as { completed?: string[] };
        setCompleted(new Set(p.completed || []));
      } else {
        setCompleted(new Set());
      }
    } catch {
      /* ignored */
    }
  }, [progressKey]);
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(progressKey);
        if (raw) {
          const p = JSON.parse(raw) as { completed?: string[] };
          setCompleted(new Set(p.completed || []));
        } else {
          setCompleted(new Set());
        }
      } catch {
        /* ignored */
      }
    };
    window.addEventListener("course:progress:changed", handler as EventListener);
    return () => window.removeEventListener("course:progress:changed", handler as EventListener);
  }, [progressKey]);

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try {
        localStorage.setItem(progressKey, JSON.stringify({ completed: Array.from(next) }));
      } catch {
        /* ignored */
      }
      window.dispatchEvent(new Event("course:progress:changed"));
      return next;
    });
  };


  const lessons = useMemo(() => course?.lessons ?? [], [course]);

  const paged = searchParams.get("paged") !== "0";
  const currentLesson = searchParams.get("lesson");

  // Active lesson highlighting
  useEffect(() => {
    if (!lessons.length) return;
    if (paged) {
      const id = currentLesson ?? lessons[0]?.id ?? null;
      setActiveId(id);
      return;
    }
    // View-all: scrollspy
    const ids = lessons.map((l) => l.id);
    const io = new IntersectionObserver((entries) => {
      let vis: string | null = null;
      for (const e of entries) {
        if (e.isIntersecting) {
          vis = (e.target as HTMLElement).id;
          break;
        }
      }
      if (vis) {
        setActiveId((prev) => (vis !== prev ? vis : prev));
      }
    }, { threshold: 0.5 });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [lessons, paged, currentLesson]);

  if (!lessons.length) {
    return <div className="text-sm text-muted-foreground">Table of Contents will appear in the viewer.</div>;
  }

  return (
    <aside className="not-prose">
      <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
        <div className="sticky top-4 z-10 rounded-md border bg-card/80 backdrop-blur p-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
            <span>Table of contents</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`} aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent asChild>
            <nav aria-label="Table of contents" className="mt-3">
              <ul className="space-y-2">
                {lessons.map((l) => {
                  const href = paged
                    ? `?${(() => { const sp = new URLSearchParams(searchParams); sp.set("paged","1"); sp.set("lesson", l.id); return sp.toString(); })()}#${currentHash}`
                    : `#${currentHash}`;
                  const isActive = activeId === l.id;
                  const isDone = completed.has(l.id);
                  return (
                    <li key={l.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`${isDone ? "Unmark" : "Mark"} ${l.title} complete`}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border"
                        onClick={() => toggleComplete(l.id)}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
                      </button>
                      {paged ? (
                        <a
                          href={href}
                          className={`block flex-1 rounded px-2 py-1 text-sm hover:text-primary ${isActive ? "font-medium text-primary" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {l.title}
                        </a>
                      ) : (
                        <a
                          href={href}
                          className={`block flex-1 rounded px-2 py-1 text-sm hover:text-primary ${isActive ? "font-medium text-primary" : ""}`}
                          aria-current={isActive ? "true" : undefined}
                          onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                        >
                          {l.title}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </aside>
  );
}
