import { useEffect, useMemo, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { Course, TocBlock } from "@/types/course";

export function TocView({ block }: { block: TocBlock }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const json = decompressFromEncodedURIComponent(hash);
      if (json) setCourse(JSON.parse(json));
    } catch {}
  }, []);

  const lessons = useMemo(() => course?.lessons ?? [], [course]);

  const paged = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("paged");
    // Default to paged view unless explicitly disabled (?paged=0)
    if (p === "0") return false;
    return true;
  }, []);
  const currentHash = useMemo(() => window.location.hash.slice(1), []);

  // Active lesson highlighting
  useEffect(() => {
    if (!lessons.length) return;
    if (paged) {
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get("lesson") ?? lessons[0]?.id ?? null;
      setActiveId(id);
      return;
    }
    // View-all: scrollspy
    const ids = lessons.map((l) => l.id);
    const io = new IntersectionObserver((entries) => {
      let vis: string | null = null;
      for (const e of entries) {
        if (e.isIntersecting) { vis = (e.target as HTMLElement).id; break; }
      }
      if (vis && vis !== activeId) setActiveId(vis);
    }, { threshold: 0.5 });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [lessons, paged]);

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
                    ? `?${(() => { const sp = new URLSearchParams(window.location.search); sp.set("paged","1"); sp.set("lesson", l.id); return sp.toString(); })()}#${currentHash}`
                    : `#${currentHash}`;
                  const isActive = activeId === l.id;
                  return (
                    <li key={l.id}>
                      {paged ? (
                        <a
                          href={href}
                          className={`block rounded px-2 py-1 text-sm hover:text-primary ${isActive ? "font-medium text-primary" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {l.title}
                        </a>
                      ) : (
                        <a
                          href={href}
                          className={`block rounded px-2 py-1 text-sm hover:text-primary ${isActive ? "font-medium text-primary" : ""}`}
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
