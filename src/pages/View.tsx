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
  const gateEnabled = useMemo(() => new URLSearchParams(window.location.search).get("gate") === "1", []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!course) return;
    if (gateEnabled) {
      setUnlocked(new Set(course.lessons[0] ? [course.lessons[0].id] : []));
    } else {
      setUnlocked(new Set(course.lessons.map((l) => l.id)));
    }
  }, [course, gateEnabled]);

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

  return (
    <div>
      <header className="border-b bg-hero">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold text-gradient leading-tight">{course.title}</h1>
          {flatNav.length > 1 && (
            <nav className="mt-3 text-sm text-muted-foreground">
              <ul className="flex flex-wrap gap-3">
                {flatNav.map((l) => (
                  <li key={l.id}><a className={l.id === activeId ? "text-primary font-medium" : "hover:text-foreground"} href={`#${l.id}`}>{l.title}</a></li>
                ))}
              </ul>
            </nav>
          )}
          <div className="mt-4 h-1 w-full rounded bg-muted">
            <div className="h-1 rounded bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 space-y-12">
        {course.lessons.map((l, idx) => {
          const isUnlocked = unlocked.has(l.id);
          const nextId = course.lessons[idx + 1]?.id as string | undefined;
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
                      const spec = getSpec(b.type as any);
                      const ViewComp = spec.View as any;
                      return (
                        <article key={b.id} className="prose prose-slate max-w-none dark:prose-invert">
                          <ViewComp block={b as any} />
                        </article>
                      );
                    })}
                  </div>
                  {gateEnabled && nextId && !unlocked.has(nextId) && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={() => setUnlocked((prev) => { const n = new Set(prev); n.add(nextId); return n; })}>
                        Continue
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
