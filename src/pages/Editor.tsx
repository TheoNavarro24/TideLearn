import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Share2, Trash2, ArrowUp, ArrowDown, Copy, PlusCircle, FileText, Type, Image as ImageIcon, List as ListIcon, Quote, CheckSquare, Edit3, ArrowLeft } from "lucide-react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { loadCourse, saveCourse } from "@/lib/courses";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportScorm12Zip, buildScormFileName, exportStaticWebZip, buildStaticFileName } from "@/lib/scorm12";
import JSZip from "jszip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Shared types
import { Block, Lesson, uid } from "@/types/course";
import type { BlockType } from "@/types/course";
import { registry, createBlock, getSpec } from "@/components/blocks/registry";

// uid provided by shared types

const defaultLesson: Lesson = {
  id: uid(),
  title: "Welcome",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome to My Course" },
    { id: uid(), type: "text", text: "This welcome page introduces your course. Use the Table of Contents below to jump to any lesson." },
    { id: uid(), type: "toc" as any },
  ],
};

export default function Editor() {
  const [courseTitle, setCourseTitle] = useState("My Course");
  const [lessons, setLessons] = useState<Lesson[]>([defaultLesson]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(defaultLesson.id);
  const [quickPickerOpen, setQuickPickerOpen] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("replace");
  const [isDragOver, setIsDragOver] = useState(false);
  const courseId = useMemo(() => new URLSearchParams(window.location.search).get("courseId"), []);

  const selectedLesson = useMemo(
    () => lessons.find(l => l.id === selectedLessonId)!,
    [lessons, selectedLessonId]
  );

  // Load course by id if provided, else legacy autosave
  useEffect(() => {
    try {
      if (courseId) {
        const loaded = loadCourse(courseId);
        if (loaded?.lessons?.length) {
          setCourseTitle(loaded.title || "My Course");
          setLessons(loaded.lessons);
          setSelectedLessonId(loaded.lessons[0]?.id ?? defaultLesson.id);
        }
        return;
      }
      const raw = localStorage.getItem("editor:course");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.lessons?.length) {
        setCourseTitle(saved.title || "My Course");
        setLessons(saved.lessons);
        setSelectedLessonId(saved.lessons[0]?.id ?? defaultLesson.id);
      }
    } catch (e) {
      console.warn("Failed to load autosave", e);
    }
  }, [courseId]);
// Keep the welcome heading in sync with the course title
useEffect(() => {
  setLessons((prev) => {
    if (!prev.length) return prev;
    const first = prev[0];
    const firstBlock: any = first.blocks[0];
    let changed = false;
    const nextFirst: Lesson = { ...first };
    if (first.title !== "Welcome") {
      nextFirst.title = "Welcome";
      changed = true;
    }
    if (firstBlock && firstBlock.type === "heading") {
      const expected = `Welcome to ${courseTitle}`;
      if (firstBlock.text !== expected) {
        nextFirst.blocks = [{ ...firstBlock, text: expected }, ...first.blocks.slice(1)];
        changed = true;
      }
    }
    if (changed) return [nextFirst, ...prev.slice(1)];
    return prev;
  });
}, [courseTitle]);


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

  const insertBlockAt = (index: number, type: BlockType) => {
    const block = createBlock(type);
    setLessons((prev) => prev.map((l) =>
      l.id === selectedLesson.id
        ? { ...l, blocks: [...l.blocks.slice(0, index), block, ...l.blocks.slice(index)] }
        : l
    ));
  };

  const moveBlock = (blockId: string, dir: "up" | "down") => {
    setLessons((prev) => prev.map((l) => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return l;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= l.blocks.length) return l;
      const blocks = [...l.blocks];
      const [item] = blocks.splice(idx, 1);
      blocks.splice(newIdx, 0, item);
      return { ...l, blocks };
    }));
  };

  const duplicateBlock = (blockId: string) => {
    setLessons((prev) => prev.map((l) => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return l;
      const copy = { ...(l.blocks[idx] as any), id: uid() } as Block;
      const blocks = [...l.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...l, blocks };
    }));
  };

  const courseData = { schemaVersion: 1, title: courseTitle, lessons };
  const compressedHash = useMemo(() => compressToEncodedURIComponent(JSON.stringify(courseData)), [courseData]);
  const publishUrl = useMemo(() => `${window.location.origin}/view#${compressedHash}`,[compressedHash]);
  const hashSize = compressedHash.length;

  // Autosave with debounce
  const saveTimer = useRef<number | null>(null);
  const saveNow = () => {
    try {
      if (courseId) {
        saveCourse(courseId, courseData as any);
      } else {
        localStorage.setItem("editor:course", JSON.stringify(courseData));
      }
      toast({ title: "Saved" });
    } catch (e) {
      toast({ title: "Save failed" });
    }
  };
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        if (courseId) {
          saveCourse(courseId, courseData as any);
        } else {
          localStorage.setItem("editor:course", JSON.stringify(courseData));
        }
      } catch {}
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current!);
    };
  }, [courseTitle, lessons, courseId]);

  // Keyboard shortcut to open full block picker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            (target as any).isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          setQuickPickerOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = async (text: string, label = "Copied to clipboard") => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  // Import helpers and modes
  const importInputRef = useRef<HTMLInputElement>(null);
  const scormImportInputRef = useRef<HTMLInputElement>(null);

  const onImportClick = () => importInputRef.current?.click();
  const onImportScormClick = () => scormImportInputRef.current?.click();

  const applyImportedCourse = (data: { title?: string; lessons: Lesson[] }, mode: "merge" | "replace") => {
    if (mode === "replace") {
      setCourseTitle(data.title || "Untitled Course");
      setLessons(data.lessons);
      setSelectedLessonId(data.lessons[0]?.id ?? uid());
      toast({ title: "Course imported" });
    } else {
      // Merge: append incoming lessons with fresh IDs to avoid collisions
      const incoming = data.lessons.map((l) => ({ ...l, id: uid() }));
      setLessons((prev) => [...prev, ...incoming]);
      toast({ title: `Merged ${data.lessons.length} lessons` });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course file");
      if (importMode === "replace" && !window.confirm("Replace current course with imported content? This cannot be undone.")) return;
      applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode);
    } catch (err) {
      toast({ title: "Import failed" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleImportScormFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      // Prefer embedded course.json if available
      const courseEntry = zip.file(/(^|\/)course\.json$/i)?.[0];
      if (courseEntry) {
        const json = await courseEntry.async("text");
        const data = JSON.parse(json);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace" && !window.confirm("Replace current course with imported content? This cannot be undone.")) return;
        applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode);
      } else {
        // Fallback: extract publish URL from HTML wrapper
        const indexEntry = zip.file(/index\.html$/i)?.[0] || zip.file(/\.html$/i)?.[0];
        if (!indexEntry) throw new Error("index.html not found");
        const html = await indexEntry.async("text");
        const m = html.match(/href=\"([^\"]*\/view#[^\"]+)\"/i) || html.match(/src=\"([^\"]*\/view#[^\"]+)\"/i);
        if (!m) throw new Error("Course URL not found");
        const url = new URL(m[1], window.location.origin);
        const hash = url.hash?.slice(1);
        if (!hash) throw new Error("Missing data hash");
        const jsonStr = decompressFromEncodedURIComponent(hash || "");
        if (!jsonStr) throw new Error("Failed to decode data");
        const data = JSON.parse(jsonStr);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace" && !window.confirm("Replace current course with imported content? This cannot be undone.")) return;
        applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode);
      }
    } catch (err) {
      toast({ title: "SCORM import failed" });
    } finally {
      if (scormImportInputRef.current) scormImportInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDropImport = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (/\.json$/i.test(file.name) || file.type.includes("json")) {
      // Simulate JSON import
      const fakeEvent = { target: { files: [file] } } as any as React.ChangeEvent<HTMLInputElement>;
      await handleImportFile(fakeEvent);
    } else if (/\.zip$/i.test(file.name) || file.type.includes("zip")) {
      const fakeEvent = { target: { files: [file] } } as any as React.ChangeEvent<HTMLInputElement>;
      await handleImportScormFile(fakeEvent);
    } else {
      toast({ title: "Unsupported file type" });
    }
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(courseData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseTitle || "course"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const exportSCORM12 = async () => {
    try {
      const blob = await exportScorm12Zip(courseData as any, publishUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildScormFileName(courseTitle || "course");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "SCORM 1.2 package exported" });
    } catch (e) {
      toast({ title: "Export failed" });
    }
  };
  const exportStaticZip = async () => {
    try {
      const blob = await exportStaticWebZip(courseData as any, publishUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildStaticFileName(courseTitle || "course");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Static web package exported" });
    } catch (e) {
      toast({ title: "Export failed" });
    }
  };
  const AddBlockMenu = ({
    onSelect,
    text = "Add block",
    open,
    onOpenChange,
  }: { onSelect: (t: BlockType) => void; text?: string; open?: boolean; onOpenChange?: (o: boolean) => void }) => (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost"><PlusCircle className="mr-2 h-4 w-4" /> {text}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50 w-56">
        <DropdownMenuLabel>Insert</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {registry.map((spec) => (
          <DropdownMenuItem key={spec.type} onClick={() => onSelect(spec.type)}>
            <spec.icon className="mr-2 h-4 w-4" /> {spec.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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

        <SidebarInset className="min-w-0">
          <header className="border-b bg-hero">
            <div className="container mx-auto flex items-center gap-3 py-3">
              <SidebarTrigger />
              <a href="/courses">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Courses
                </Button>
              </a>
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
                      <DialogTitle>Share & Export</DialogTitle>
                      <DialogDescription>
                        Share via URL or iframe, export packages, or import a course.
                      </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="share" className="mt-2">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="share">Share</TabsTrigger>
                        <TabsTrigger value="export">Export</TabsTrigger>
                        <TabsTrigger value="import">Import</TabsTrigger>
                      </TabsList>

                      <TabsContent value="share" className="space-y-4 mt-4">
                        {hashSize > 100000 && (
                          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                            Large course detected: link size is {hashSize.toLocaleString()} characters. Consider Export JSON for portability.
                          </div>
                        )}
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
                            value={`<iframe src="${publishUrl}" style="width:100%;height:700px;border:0" loading="lazy" allowfullscreen></iframe>`}
                          />
                          <div className="mt-2">
                            <Button variant="secondary" onClick={() => copy(`<iframe src=\"${publishUrl}\" style=\"width:100%;height:700px;border:0\" loading=\"lazy\" allowfullscreen></iframe>`, "Iframe copied!")}>Copy iframe</Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="export" className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Export options</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={exportJSON}>Export JSON</Button>
                            <Button variant="secondary" onClick={exportSCORM12}>Export SCORM 1.2</Button>
                            <Button variant="secondary" onClick={exportStaticZip}>Export Static Web Zip</Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">SCORM export wraps your course for LMS. Static zip is ideal for simple hosting.</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="import" className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Import mode</label>
                          <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)} className="mt-2 flex gap-6">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="replace" id="mode-replace" />
                              <Label htmlFor="mode-replace">Replace current course</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="merge" id="mode-merge" />
                              <Label htmlFor="mode-merge">Merge (append lessons)</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDropImport}
                          className={`rounded-md border-2 border-dashed p-6 text-center bg-muted/30 ${isDragOver ? "border-primary" : "border-muted"}`}
                        >
                          <p className="text-sm">Drag and drop a .json or .zip (SCORM 1.2) file here to import</p>
                          <p className="text-xs text-muted-foreground mt-1">JSON replaces or merges the raw course. SCORM restores a package exported from this editor.</p>
                        </div>

                        <div>
                          <label className="text-sm text-muted-foreground">Import JSON</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button variant="outline" onClick={onImportClick}>Choose file</Button>
                            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Import SCORM 1.2 (.zip)</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button variant="outline" onClick={onImportScormClick}>Choose SCORM file</Button>
                            <input ref={scormImportInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleImportScormFile} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Imports courses previously exported as SCORM from this editor.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                    <DialogFooter>
                      <Button onClick={() => window.open(publishUrl, "_blank")}>Preview</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={saveNow}><Save /> Save</Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto py-6">
            <section className="sticky top-0 z-50 border-b bg-background/95">
              <div className="flex flex-nowrap items-center gap-2 py-2 overflow-x-auto max-w-full">
                <Button size="sm" variant="secondary" onClick={() => addBlock("heading" as BlockType)}>
                  <FileText className="mr-2 h-4 w-4" /> Heading
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("text" as BlockType)}>
                  <Type className="mr-2 h-4 w-4" /> Text
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("image" as BlockType)}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Image
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("list" as BlockType)}>
                  <ListIcon className="mr-2 h-4 w-4" /> List
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("quote" as BlockType)}>
                  <Quote className="mr-2 h-4 w-4" /> Quote
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("truefalse" as BlockType)}>
                  <CheckSquare className="mr-2 h-4 w-4" /> True/False
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock("shortanswer" as BlockType)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Short Answer
                </Button>
                <AddBlockMenu
                  onSelect={(t) => { addBlock(t); setQuickPickerOpen(false); }}
                  text="More"
                  open={quickPickerOpen}
                  onOpenChange={setQuickPickerOpen}
                />
                <span className="text-xs text-muted-foreground hidden sm:inline-block">Press “/” for more</span>
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

              {selectedLesson.blocks.map((b, idx) => {
                const spec = getSpec(b.type as BlockType);
                const EditorComp = spec.Editor as any;
                const lastIndex = selectedLesson.blocks.length - 1;
                return (
                  <div key={b.id} className="space-y-2">
                    <article className="card-surface p-4">
                      <div className="flex justify-end gap-1 mb-2">
                        <Button size="sm" variant="ghost" onClick={() => moveBlock(b.id, "up")} disabled={idx === 0} aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveBlock(b.id, "down")} disabled={idx === lastIndex} aria-label="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicateBlock(b.id)} aria-label="Duplicate">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBlock(b.id)} aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <EditorComp block={b as any} onChange={(updated: any) => updateBlock(b.id, () => updated as Block)} />
                    </article>
                    <div className="flex justify-center">
                      <AddBlockMenu onSelect={(t) => insertBlockAt(idx + 1, t)} text="Add block here" />
                    </div>
                  </div>
                );
              })}
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
