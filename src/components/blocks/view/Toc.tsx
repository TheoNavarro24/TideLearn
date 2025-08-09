import { useEffect, useMemo, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import type { Course, TocBlock } from "@/types/course";

export function TocView({ block }: { block: TocBlock }) {
  const [course, setCourse] = useState<Course | null>(null);
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

if (!lessons.length) {
  return <div className="text-sm text-muted-foreground">Table of Contents will appear in the viewer.</div>;
}

  return (
    <nav aria-label="Table of contents" className="not-prose">
      <ul className="space-y-2">
        {lessons.map((l) => (
          <li key={l.id}>
            {paged ? (
              <a
                href={`?${(() => { const sp = new URLSearchParams(window.location.search); sp.set("paged","1"); sp.set("lesson", l.id); return sp.toString(); })()}#${currentHash}`}
                className="underline underline-offset-4 hover:text-primary"
              >
                {l.title}
              </a>
            ) : (
              <a
                href={`#${currentHash}`}
                className="underline underline-offset-4 hover:text-primary"
                onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              >
                {l.title}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
