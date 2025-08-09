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

  if (!lessons.length) {
    return <div className="text-sm text-muted-foreground">Table of Contents will appear in the viewer.</div>;
  }

  return (
    <nav aria-label="Table of contents" className="not-prose">
      <ul className="space-y-2">
        {lessons.map((l) => (
          <li key={l.id}>
            <a href={`#${l.id}`} className="underline underline-offset-4 hover:text-primary">{l.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
