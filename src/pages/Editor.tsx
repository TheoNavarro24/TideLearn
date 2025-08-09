import { useMemo, useState } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Share2, Trash2 } from "lucide-react";
import { compressToEncodedURIComponent } from "lz-string";

// Shared types
import { Block, Lesson, uid } from "@/types/course";
import type { BlockType } from "@/types/course";
import { registry, createBlock, getSpec } from "@/components/blocks/registry";

// uid provided by shared types

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

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    setLessons((prev) => prev.map((l) => (l.id === selectedLesson.id ? { ...l, blocks: [...l.blocks, block] } : l)));
  };

  const updateBlock = (blockId: string, updater: (b: Block) => Block) => {
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.map(b => b.id === blockId ? updater(b) : b) } : l));
  };

  const removeBlock = (blockId: string) => {
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.filter(b => b.id !== blockId) } : l));
  };

  const courseData = { schemaVersion: 1, title: courseTitle, lessons };
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
                aria-label="Course title" placeholder="Course title"
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
                {registry.map((spec) => (
                  <Button key={spec.type} variant="secondary" onClick={() => addBlock(spec.type)}>
                    <spec.icon className="mr-2 h-4 w-4" /> Add {spec.label}
                  </Button>
                ))}
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

              {selectedLesson.blocks.map((b) => {
                const spec = getSpec(b.type as BlockType);
                const EditorComp = spec.Editor as any;
                return (
                  <article key={b.id} className="card-surface p-4">
                    <EditorComp block={b as any} onChange={(updated: any) => updateBlock(b.id, () => updated as Block)} />
                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" onClick={() => removeBlock(b.id)}><Trash2 /> Remove block</Button>
                    </div>
                  </article>
                );
              })}
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
