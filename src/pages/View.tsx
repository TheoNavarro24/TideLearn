import { useEffect, useMemo, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { getSpec } from "@/components/blocks/registry";

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
                  <li key={l.id}><a className="hover:text-foreground" href={`#${l.id}`}>{l.title}</a></li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto py-8 space-y-12">
        {course.lessons.map((l) => (
          <section key={l.id} id={l.id} className="scroll-mt-24">
            <h2 className="text-2xl font-semibold mb-4">{l.title}</h2>
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
          </section>
        ))}
      </main>
    </div>
  );
}
