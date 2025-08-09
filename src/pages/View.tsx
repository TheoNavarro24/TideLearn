import { useEffect, useMemo, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; alt: string }
  | { id: string; type: "quiz"; question: string; options: string[]; correctIndex: number };

interface Lesson { id: string; title: string; blocks: Block[] }
interface Course { title: string; lessons: Lesson[] }

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
              {l.blocks.map((b) => (
                <article key={b.id} className="prose prose-slate max-w-none dark:prose-invert">
                  {b.type === "heading" && (
                    <h3 className="text-xl font-semibold">{b.text}</h3>
                  )}
                  {b.type === "text" && (
                    <p className="text-base leading-7 text-foreground/90">{b.text}</p>
                  )}
                  {b.type === "image" && (
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(b as any).src} alt={(b as any).alt || "Course image"} loading="lazy" className="w-full rounded-lg border" />
                      {(b as any).alt && <figcaption className="text-sm text-muted-foreground mt-2">{(b as any).alt}</figcaption>}
                    </figure>
                  )}
                  {b.type === "quiz" && (
                    <div className="card-surface p-4">
                      <p className="font-medium mb-2">{(b as any).question}</p>
                      <ul className="grid gap-2">
                        {(b as any).options.map((opt: string, i: number) => (
                          <li key={i} className={`rounded-md border p-2 ${i === (b as any).correctIndex ? 'bg-secondary' : ''}`}>{opt}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">Correct answer: option {(b as any).correctIndex + 1}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
