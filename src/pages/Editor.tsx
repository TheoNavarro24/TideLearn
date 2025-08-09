import { useMemo, useState } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Share2, Trash2 } from "lucide-react";
import { compressToEncodedURIComponent } from "lz-string";

// Types
interface HeadingBlock { id: string; type: "heading"; text: string }
interface TextBlock { id: string; type: "text"; text: string }
interface ImageBlock { id: string; type: "image"; src: string; alt: string }
interface QuizBlock { id: string; type: "quiz"; question: string; options: string[]; correctIndex: number }

type Block = HeadingBlock | TextBlock | ImageBlock | QuizBlock;

interface Lesson { id: string; title: string; blocks: Block[] }

function uid() { return Math.random().toString(36).slice(2, 9) }

const defaultLesson: Lesson = {
  id: uid(),
  title: "Lesson 1",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome" },
    { id: uid(), type: "text", text: "Start writing your lesson content here." },
  ],
};

export default function Editor() {
  const [courseTitle, setCourseTitle] = useState("My Course");
  const [lessons, setLessons] = useState<Lesson[]>([defaultLesson]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(defaultLesson.id);

  const selectedLesson = useMemo(
    () => lessons.find(l => l.id === selectedLessonId)!,
    [lessons, selectedLessonId]
  );

  const addLesson = () => {
    const newLesson: Lesson = { id: uid(), title: `Lesson ${lessons.length + 1}`, blocks: [] };
    setLessons(prev => [...prev, newLesson]);
    setSelectedLessonId(newLesson.id);
  };

  const updateLessonTitle = (id: string, title: string) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, title } : l));
  };

  const removeLesson = (id: string) => {
    if (lessons.length === 1) return;
    const idx = lessons.findIndex(l => l.id === id);
    const newLessons = lessons.filter(l => l.id !== id);
    setLessons(newLessons);
    setSelectedLessonId(newLessons[Math.max(0, idx - 1)].id);
  };

  const addBlock = (type: Block["type"]) => {
    const block: Block =
      type === "heading" ? { id: uid(), type, text: "New Heading" } :
      type === "text" ? { id: uid(), type, text: "New paragraph..." } :
      type === "image" ? { id: uid(), type, src: "", alt: "" } :
      { id: uid(), type: "quiz", question: "Your question?", options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0 };

    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { ...l, blocks: [...l.blocks, block] } : l));
  };

  const updateBlock = (blockId: string, updater: (b: Block) => Block) => {
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.map(b => b.id === blockId ? updater(b) : b) } : l));
  };

  const removeBlock = (blockId: string) => {
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.filter(b => b.id !== blockId) } : l));
  };

  const courseData = { title: courseTitle, lessons };
  const publishUrl = useMemo(() => {
    const compressed = compressToEncodedURIComponent(JSON.stringify(courseData));
    return `${window.location.origin}/view#${compressed}`;
  }, [courseData]);

  const copy = async (text: string, label = "Copied to clipboard") => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="w-60">
          <SidebarHeader>
            <div className="px-2 py-1">
              <h2 className="text-sm font-medium text-muted-foreground">Course Outline</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {lessons.map((l) => (
                    <SidebarMenuItem key={l.id}>
                      <SidebarMenuButton asChild>
                        <button
                          className={`w-full text-left ${selectedLessonId === l.id ? "bg-muted text-primary" : "hover:bg-muted/60"}`}
                          onClick={() => setSelectedLessonId(l.id)}
                        >
                          <span className="truncate">{l.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
                <div className="p-2">
                  <Button variant="secondary" className="w-full" onClick={addLesson}>
                    <Plus /> Add lesson
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <header className="border-b bg-hero">
            <div className="container mx-auto flex items-center gap-3 py-3">
              <SidebarTrigger />
              <h1 className="sr-only">Rapid E-learning Authoring Editor</h1>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="max-w-sm bg-background/80"
                aria-label="Course title"
              />
              <div className="ml-auto flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="hero"><Share2 /> Publish</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Publish & Embed</DialogTitle>
                      <DialogDescription>
                        Use this URL in Google Sites (Insert → Embed → By URL), or use the iframe snippet below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Shareable URL</label>
                        <Input value={publishUrl} readOnly />
                        <div className="mt-2">
                          <Button variant="secondary" onClick={() => copy(publishUrl, "URL copied!")}>Copy URL</Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Iframe embed</label>
                        <Textarea
                          readOnly
                          value={`<iframe src=\"${publishUrl}\" style=\"width:100%;height:700px;border:0\" loading=\"lazy\" allowfullscreen></iframe>`}
                        />
                        <div className="mt-2">
                          <Button variant="secondary" onClick={() => copy(`<iframe src=\"${publishUrl}\" style=\"width:100%;height:700px;border:0\" loading=\"lazy\" allowfullscreen></iframe>`, "Iframe copied!")}>Copy iframe</Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => window.open(publishUrl, "_blank")}>Preview</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline"><Save /> Save</Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto py-6">
            <section className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => addBlock("heading")}>Add Heading</Button>
                <Button variant="secondary" onClick={() => addBlock("text")}>Add Text</Button>
                <Button variant="secondary" onClick={() => addBlock("image")}>Add Image</Button>
                <Button variant="secondary" onClick={() => addBlock("quiz")}>Add Quiz</Button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={selectedLesson.title}
                  onChange={(e) => updateLessonTitle(selectedLesson.id, e.target.value)}
                  aria-label="Lesson title"
                />
                <Button variant="destructive" onClick={() => removeLesson(selectedLesson.id)} disabled={lessons.length === 1}>
                  <Trash2 /> Remove lesson
                </Button>
              </div>

              {selectedLesson.blocks.length === 0 && (
                <p className="text-muted-foreground">No blocks yet. Use the buttons above to add content.</p>
              )}

              {selectedLesson.blocks.map((b) => (
                <article key={b.id} className="card-surface p-4">
                  {b.type === "heading" && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Heading</label>
                      <Input value={b.text} onChange={(e) => updateBlock(b.id, () => ({ ...b, text: e.target.value }))} />
                    </div>
                  )}
                  {b.type === "text" && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Text</label>
                      <Textarea value={b.text} onChange={(e) => updateBlock(b.id, () => ({ ...b, text: e.target.value }))} />
                    </div>
                  )}
                  {b.type === "image" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Image URL</label>
                        <Input value={b.src} onChange={(e) => updateBlock(b.id, () => ({ ...b, src: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Alt text</label>
                        <Input value={b.alt} onChange={(e) => updateBlock(b.id, () => ({ ...b, alt: e.target.value }))} />
                      </div>
                    </div>
                  )}
                  {b.type === "quiz" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Question</label>
                        <Input value={b.question} onChange={(e) => updateBlock(b.id, () => ({ ...b, question: e.target.value }))} />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {b.options.map((opt, i) => (
                          <Input
                            key={i}
                            value={opt}
                            onChange={(e) => updateBlock(b.id, (prev) => ({
                              ...prev,
                              options: (prev as QuizBlock).options.map((o, idx) => idx === i ? e.target.value : o)
                            }))}
                            aria-label={`Option ${i + 1}`}
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Correct answer (0-3)</label>
                        <Input
                          type="number"
                          min={0}
                          max={Math.max(0, (b as QuizBlock).options.length - 1)}
                          value={(b as QuizBlock).correctIndex}
                          onChange={(e) => updateBlock(b.id, () => ({ ...b as QuizBlock, correctIndex: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" onClick={() => removeBlock(b.id)}><Trash2 /> Remove block</Button>
                  </div>
                </article>
              ))}
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
