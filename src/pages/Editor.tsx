import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { toast } from "@/hooks/use-toast";
import { useDeepLinkIntents } from "@/hooks/useDeepLinkIntents";
import { ArrowLeft, Menu, Settings, Package } from "lucide-react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { loadCourse, saveCourse, saveCourseToCloud, loadCourseFromCloud } from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";
import { exportScorm12Zip, buildScormFileName, exportStaticWebZip, buildStaticFileName } from "@/lib/scorm12";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

import { validateCourseBlocks, type BlockWarning } from "@/lib/validate-blocks";

// Shared types
import { Block, ContentLesson, AssessmentLesson, Lesson, uid } from "@/types/course";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
import type { BlockType } from "@/types/course";
import { registry, createBlock, getSpec } from "@/components/blocks/registry";

// Extracted editor components
import { ConfirmModal } from "@/components/editor/ConfirmModal";
import { PublishModal } from "@/components/editor/PublishModal";
import { AddBlockRow } from "@/components/editor/BlockPicker";

const defaultLesson: ContentLesson = {
  kind: "content",
  id: uid(),
  title: "Welcome",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome to My Course" },
    { id: uid(), type: "text", text: "This welcome page introduces your course. Use the Table of Contents below to jump to any lesson." },
    { id: uid(), type: "toc" as any },
  ],
};

export default function Editor() {
  const { user } = useAuth();
  const {
    current: editorState,
    push: pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useUndoRedo({ courseTitle: "My Course", lessons: [defaultLesson] });

  const courseTitle = editorState.courseTitle;
  const lessons = editorState.lessons;
  const [selectedLessonId, setSelectedLessonId] = useState<string>(defaultLesson.id);
  const [pickerState, setPickerState] = useState<{ rowIndex: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("replace");
  const [isDragOver, setIsDragOver] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishWarnings, setPublishWarnings] = useState<BlockWarning[]>([]);
  const [showImportSection, setShowImportSection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [lessonToRemove, setLessonToRemove] = useState<string | null>(null);

  const openPublish = () => {
    const contentLessons = lessons.filter(l => l.kind === "content") as ContentLesson[];
    setPublishWarnings(validateCourseBlocks(contentLessons));
    setPublishOpen(true);
    setShowImportSection(false);
  };

  const courseId = useMemo(() => new URLSearchParams(window.location.search).get("courseId"), []);
  const deepLink = useDeepLinkIntents();
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (deepLink.status !== "idle") {
      toast({ description: deepLink.summary });
    }
  }, [deepLink]);

  const selectedLesson = useMemo(
    () => lessons.find(l => l.id === selectedLessonId)!,
    [lessons, selectedLessonId]
  );

  // Load course by id if provided, else legacy autosave
  useEffect(() => {
    async function loadInitialCourse() {
      if (courseId) {
        let loaded: Course | null = null;
        if (user) {
          loaded = await loadCourseFromCloud(courseId);
          if (loaded) saveCourse(courseId, loaded);
        }
        if (!loaded) {
          loaded = loadCourse(courseId);
        }
        if (loaded?.lessons?.length) {
          const loadedTitle = loaded.title || "My Course";
          pushHistory({ courseTitle: loadedTitle, lessons: syncWelcomeHeading(loadedTitle, loaded.lessons) });
          setSelectedLessonId(loaded.lessons[0]?.id ?? defaultLesson.id);
        }
        return;
      }
      const raw = localStorage.getItem("editor:course");
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved?.lessons?.length) {
          const savedTitle = saved.title || "My Course";
          pushHistory({ courseTitle: savedTitle, lessons: syncWelcomeHeading(savedTitle, saved.lessons) });
          setSelectedLessonId(saved.lessons[0]?.id ?? defaultLesson.id);
        }
      } catch (e) {
        console.warn("Failed to load autosave", e);
      }
    }
    loadInitialCourse();
  }, [courseId, user?.id]);

  function syncWelcomeHeading(title: string, currentLessons: Lesson[]): Lesson[] {
    if (!currentLessons.length) return currentLessons;
    const first = currentLessons[0];
    if (first.kind !== "content") return currentLessons;
    const firstBlock: any = first.blocks[0];
    let changed = false;
    const nextFirst: Lesson = { ...first };
    if (first.title !== "Welcome") { nextFirst.title = "Welcome"; changed = true; }
    if (firstBlock?.type === "heading") {
      const expected = `Welcome to ${title}`;
      if (firstBlock.text !== expected) {
        nextFirst.blocks = [{ ...firstBlock, text: expected }, ...first.blocks.slice(1)];
        changed = true;
      }
    }
    return changed ? [nextFirst, ...currentLessons.slice(1)] : currentLessons;
  }

  const addLesson = (kind: "content" | "assessment" = "content") => {
    const id = uid();
    const newLesson: Lesson = kind === "assessment"
      ? { kind: "assessment", id, title: `Assessment ${lessons.filter(l => l.kind === "assessment").length + 1}`, questions: [], config: { passingScore: 80, examSize: 20 } }
      : { kind: "content", id, title: `Lesson ${lessons.length + 1}`, blocks: [] };
    pushHistory({ courseTitle, lessons: [...lessons, newLesson] });
    setSelectedLessonId(id);
  };

  const updateLessonTitle = (id: string, title: string) => {
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === id ? { ...l, title } : l) });
  };

  const removeLesson = (id: string) => {
    if (lessons.length === 1) return;
    const idx = lessons.findIndex(l => l.id === id);
    const newLessons = lessons.filter(l => l.id !== id);
    pushHistory({ courseTitle, lessons: newLessons });
    setSelectedLessonId(newLessons[Math.max(0, idx - 1)].id);
  };

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: [...l.blocks, block] } : l) });
  };

  const updateBlock = (blockId: string, updater: (b: Block) => Block) => {
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.map(b => b.id === blockId ? updater(b) : b) } : l) });
  };

  const removeBlock = (blockId: string) => {
    pushHistory({ courseTitle, lessons: lessons.map(l => l.id === selectedLesson.id ? { ...l, blocks: l.blocks.filter(b => b.id !== blockId) } : l) });
  };

  const insertBlockAt = (index: number, type: BlockType) => {
    const block = createBlock(type);
    pushHistory({ courseTitle, lessons: lessons.map(l =>
      l.id === selectedLesson.id
        ? { ...l, blocks: [...l.blocks.slice(0, index), block, ...l.blocks.slice(index)] }
        : l
    ) });
  };

  const moveBlock = (blockId: string, dir: "up" | "down") => {
    pushHistory({ courseTitle, lessons: lessons.map(l => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return l;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= l.blocks.length) return l;
      const blocks = [...l.blocks];
      const [item] = blocks.splice(idx, 1);
      blocks.splice(newIdx, 0, item);
      return { ...l, blocks };
    }) });
  };

  const duplicateBlock = (blockId: string) => {
    pushHistory({ courseTitle, lessons: lessons.map(l => {
      if (l.id !== selectedLesson.id) return l;
      const idx = l.blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return l;
      const copy = { ...(l.blocks[idx] as any), id: uid() } as Block;
      const blocks = [...l.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...l, blocks };
    }) });
  };

  const courseData = { schemaVersion: 1, title: courseTitle, lessons };
  const compressedHash = useMemo(() => compressToEncodedURIComponent(JSON.stringify(courseData)), [courseData]);
  const publishUrl = useMemo(() => {
    if (user && courseId) {
      return `${window.location.origin}/view?id=${courseId}`;
    }
    return `${window.location.origin}/view#${compressedHash}`;
  }, [user, courseId, compressedHash]);
  const hashSize = compressedHash.length;

  // Autosave with debounce
  const saveTimer = useRef<number | null>(null);
  const saveNow = async () => {
    setIsSaving(true);
    try {
      if (courseId) {
        saveCourse(courseId, courseData as any);
        if (user) {
          await saveCourseToCloud(courseId, courseData as any, user.id);
        }
      } else {
        localStorage.setItem("editor:course", JSON.stringify(courseData));
      }
      toast({ title: "Saved" });
    } catch (e) {
      toast({ title: "Save failed" });
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      try {
        if (courseId) {
          saveCourse(courseId, courseData as any);
          if (user) {
            await saveCourseToCloud(courseId, courseData as any, user.id);
          }
        } else {
          localStorage.setItem("editor:course", JSON.stringify(courseData));
        }
      } catch (e) {
        console.error("Autosave failed:", e);
        toast({ title: "Autosave failed", description: "Your changes may not be saved", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current!);
    };
  }, [editorState, courseId, user]);

  // Keyboard shortcut to open block picker
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
          if (selectedLesson?.kind === "content") {
            setPickerState({ rowIndex: selectedLesson.blocks.length });
            setPickerSearch("");
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLesson]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = (navigator as any).userAgentData?.platform === "macOS"
        || navigator.platform?.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoHistory();
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redoHistory();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoHistory, redoHistory]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerState) return;
    const onMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerState(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [pickerState]);

  // Focus search when picker opens
  useEffect(() => {
    if (pickerState && pickerSearchRef.current) {
      requestAnimationFrame(() => pickerSearchRef.current?.focus());
    }
  }, [pickerState]);

  const copy = async (text: string, label = "Copied to clipboard") => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  // Import helpers
  const importInputRef = useRef<HTMLInputElement>(null);
  const scormImportInputRef = useRef<HTMLInputElement>(null);

  const onImportClick = () => importInputRef.current?.click();
  const onImportScormClick = () => scormImportInputRef.current?.click();

  const applyImportedCourse = (data: { title?: string; lessons: Lesson[] }, mode: "merge" | "replace") => {
    if (mode === "replace") {
      const importedTitle = data.title || "Untitled Course";
      pushHistory({ courseTitle: importedTitle, lessons: syncWelcomeHeading(importedTitle, data.lessons) });
      setSelectedLessonId(data.lessons[0]?.id ?? uid());
      toast({ title: "Course imported" });
    } else {
      const incoming = data.lessons.map((l) => ({ ...l, id: uid() }));
      pushHistory({ courseTitle, lessons: [...lessons, ...incoming] });
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
      if (importMode === "replace") {
        setConfirmAction(() => () => applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode));
        return;
      }
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
      const courseEntry = zip.file(/(^|\/)course\.json$/i)?.[0];
      if (courseEntry) {
        const json = await courseEntry.async("text");
        const data = JSON.parse(json);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace") {
          setConfirmAction(() => () => applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode));
          return;
        }
        applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode);
      } else {
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
        if (importMode === "replace") {
          setConfirmAction(() => () => applyImportedCourse({ title: data.title, lessons: data.lessons }, importMode));
          return;
        }
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

  // Filtered registry for picker search
  const filteredRegistry = useMemo(() => {
    if (!pickerSearch.trim()) return registry;
    const q = pickerSearch.toLowerCase();
    return registry.filter(s => s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [pickerSearch]);

  const blocks = selectedLesson?.kind === "content" ? selectedLesson.blocks : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[var(--sidebar-w-editor)_1fr] grid-rows-[var(--topbar-h)_1fr] h-screen overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      <input ref={scormImportInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleImportScormFile} />

      {/* ── Topbar ── */}
      <div className="col-span-1 md:col-span-2 flex items-center px-4 gap-0 z-10 bg-[var(--ocean-surface)] border-b border-[rgba(20,184,166,0.15)] h-[var(--topbar-h)]">
        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[var(--teal-light)]"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back button */}
        <a
          href="/courses"
          className="flex items-center gap-1 text-xs font-semibold text-[rgba(94,234,212,0.5)] no-underline px-2 whitespace-nowrap hover:text-[var(--teal-bright)] transition-colors"
        >
          <ArrowLeft size={13} className="opacity-70" />
          My Courses
        </a>

        {/* Divider */}
        <div className="w-px h-5 bg-[rgba(20,184,166,0.15)] mx-3" />

        {/* Course title input */}
        <input
          value={courseTitle}
          onChange={e => pushHistory({ courseTitle: e.target.value, lessons: syncWelcomeHeading(e.target.value, lessons) })}
          aria-label="Course title"
          placeholder="Course title"
          className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded text-[13px] font-semibold text-white font-sans flex-1 min-w-0"
        />

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* Undo/Redo — hidden on mobile (keyboard shortcuts still work) */}
          <button
            onClick={() => undoHistory()}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className={cn(
              "hidden md:flex bg-none border-none py-1.5 px-2 rounded-md text-[var(--teal-light)] text-[13px] font-semibold items-center gap-1",
              "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none",
              canUndo ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-35"
            )}
          >
            ↩ Undo
          </button>
          <button
            onClick={() => redoHistory()}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className={cn(
              "hidden md:flex bg-none border-none py-1.5 px-2 rounded-md text-[var(--teal-light)] text-[13px] font-semibold items-center gap-1",
              "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none",
              canRedo ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-35"
            )}
          >
            ↪ Redo
          </button>

          {/* Saved indicator — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className={cn(
              "w-[5px] h-[5px] rounded-full transition-colors",
              isSaving ? "bg-[rgba(94,234,212,0.4)]" : "bg-[var(--teal-bright)]"
            )} />
            <span className="text-[11px] text-[rgba(94,234,212,0.4)] font-medium">
              {isSaving ? "Saving…" : "Saved"}
            </span>
          </div>

          {/* Preview button — hidden on mobile */}
          <button
            onClick={() => window.open(publishUrl, "_blank")}
            className="hidden md:block bg-none border-[1.5px] border-[rgba(20,184,166,0.35)] rounded-md text-[var(--teal-bright)] text-xs font-semibold py-[5px] px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
          >
            Preview
          </button>

          {/* Save button */}
          <button
            onClick={saveNow}
            className="bg-none border-[1.5px] border-[rgba(20,184,166,0.35)] rounded-md text-[var(--teal-bright)] text-xs font-semibold py-[5px] px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
          >
            Save
          </button>

          {/* Publish button */}
          <button
            onClick={openPublish}
            className="bg-[var(--gradient-primary)] border-none rounded-md text-white text-xs font-bold py-[5px] px-3.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
          >
            Publish
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed md:relative z-30 md:z-auto",
        "w-[var(--sidebar-w-editor)] h-full",
        "bg-[var(--ocean-mid)] text-white flex flex-col",
        "border-r border-[rgba(20,184,166,0.18)]",
        "transition-transform md:transition-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar header */}
        <div className="px-4 pt-3.5 pb-2">
          <span className="text-[9.5px] font-bold text-[rgba(94,234,212,0.45)] uppercase tracking-widest">
            Lessons
          </span>
        </div>

        {/* Lesson list */}
        <div className="flex-1 overflow-y-auto px-2">
          {lessons.map((l, idx) => {
            const isActive = l.id === selectedLessonId;
            return (
              <button
                key={l.id}
                onClick={() => { setSelectedLessonId(l.id); setSidebarOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full text-left border-none rounded-md py-[7px] px-2.5 cursor-pointer mb-0.5 transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none",
                  isActive
                    ? "bg-[rgba(20,184,166,0.18)] text-[var(--text-on-dark)]"
                    : "bg-transparent text-[var(--text-on-dark-dim)] hover:bg-[rgba(20,184,166,0.1)]"
                )}
              >
                <span className={cn(
                  "text-[10px] font-bold min-w-[16px] font-mono",
                  isActive ? "text-[var(--teal-bright)]" : "text-[rgba(94,234,212,0.4)]"
                )}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {l.title}
                </span>
                <span className="text-[10px] text-[rgba(94,234,212,0.35)] whitespace-nowrap">
                  {l.kind === "content" ? `${l.blocks.length}b` : "quiz"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add lesson buttons */}
        <div className="px-2 py-2">
          <div className="flex gap-1">
            <button
              onClick={() => addLesson("content")}
              className="flex-1 bg-none border-[1.5px] border-dashed border-[rgba(20,184,166,0.25)] rounded-md text-[rgba(94,234,212,0.45)] text-[11px] font-semibold py-[7px] cursor-pointer flex items-center justify-center gap-1 hover:border-[var(--teal-bright)] hover:text-[var(--teal-light)] transition-colors"
            >
              + Lesson
            </button>
            <button
              onClick={() => addLesson("assessment")}
              title="Add an adaptive assessment lesson"
              className="flex-1 bg-none border-[1.5px] border-dashed border-[rgba(20,184,166,0.25)] rounded-md text-[rgba(94,234,212,0.45)] text-[11px] font-semibold py-[7px] cursor-pointer flex items-center justify-center gap-1 hover:border-[var(--teal-bright)] hover:text-[var(--teal-light)] transition-colors"
            >
              + Assessment
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(20,184,166,0.12)] p-2">
          <button
            onClick={openPublish}
            className="w-full bg-none border-none rounded-md text-[rgba(94,234,212,0.45)] text-[11px] font-medium py-1.5 px-2.5 cursor-pointer text-left flex items-center gap-2 hover:bg-[rgba(20,184,166,0.08)] transition-colors"
          >
            <Settings className="w-4 h-4" /> Publish & Export
          </button>
          <button
            onClick={exportSCORM12}
            className="w-full bg-none border-none rounded-md text-[rgba(94,234,212,0.45)] text-[11px] font-medium py-1.5 px-2.5 cursor-pointer text-left flex items-center gap-2 hover:bg-[rgba(20,184,166,0.08)] transition-colors"
          >
            <Package className="w-4 h-4" /> Export SCORM
          </button>
        </div>
      </aside>

      {/* ── Canvas ── */}
      <main
        id="main-content"
        className="bg-[var(--surface-subtle)] overflow-y-auto flex flex-col"
      >
        {/* Lesson header */}
        {selectedLesson && (
          <div className="bg-white border-b border-[var(--border-subtle)] px-4 md:px-8 py-4 flex flex-col gap-1">
            <input
              value={selectedLesson.title}
              onChange={e => updateLessonTitle(selectedLesson.id, e.target.value)}
              aria-label="Lesson title"
              className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded font-display text-[19px] font-bold text-[var(--text-primary)] w-full"
            />
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--text-muted)]">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </span>
              {lessons.length > 1 && (
                <button
                  onClick={() => setLessonToRemove(selectedLesson.id)}
                  className="bg-none border-none text-[11px] text-destructive/70 cursor-pointer p-0 hover:text-destructive transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none rounded"
                >
                  Remove lesson
                </button>
              )}
            </div>
          </div>
        )}

        {/* Canvas body */}
        <div className="flex-1 px-4 md:px-16 py-5 pb-20">
          <div className="max-w-[var(--canvas-max-w)] mx-auto">
            {selectedLesson?.kind === "assessment" ? (
              <AssessmentEditor
                lesson={selectedLesson}
                onChange={(updated) => {
                  pushHistory({ courseTitle, lessons: lessons.map(l => l.id === updated.id ? updated : l) });
                }}
              />
            ) : (
            <div className="max-w-[700px] mx-auto flex flex-col">
              {/* Add-block row before first block */}
              <AddBlockRow
                rowIndex={0}
                pickerState={pickerState}
                onOpen={() => { setPickerState({ rowIndex: 0 }); setPickerSearch(""); }}
                pickerRef={rowIndex => pickerState?.rowIndex === rowIndex ? pickerRef : undefined}
                pickerSearch={pickerSearch}
                setPickerSearch={setPickerSearch}
                filteredRegistry={filteredRegistry}
                pickerSearchRef={pickerSearchRef}
                onPickerSelect={(type) => { insertBlockAt(0, type); setPickerState(null); }}
                onPickerClose={() => setPickerState(null)}
              />

              {blocks.map((b, idx) => {
                const spec = getSpec(b.type as BlockType);
                const EditorComp = spec.Editor as any;
                const isPickerBelowThis = pickerState !== null && pickerState.rowIndex <= idx;
                return (
                  <div key={b.id} className={cn("transition-opacity", isPickerBelowThis && "opacity-25")}>
                    <BlockItem
                      block={b}
                      idx={idx}
                      total={blocks.length}
                      spec={spec}
                      EditorComp={EditorComp}
                      onMove={moveBlock}
                      onDuplicate={duplicateBlock}
                      onRemove={removeBlock}
                      onUpdate={updateBlock}
                    />

                    <AddBlockRow
                      rowIndex={idx + 1}
                      pickerState={pickerState}
                      onOpen={() => { setPickerState({ rowIndex: idx + 1 }); setPickerSearch(""); }}
                      pickerRef={rowIndex => pickerState?.rowIndex === rowIndex ? pickerRef : undefined}
                      pickerSearch={pickerSearch}
                      setPickerSearch={setPickerSearch}
                      filteredRegistry={filteredRegistry}
                      pickerSearchRef={pickerSearchRef}
                      onPickerSelect={(type) => { insertBlockAt(idx + 1, type); setPickerState(null); }}
                      onPickerClose={() => setPickerState(null)}
                    />
                  </div>
                );
              })}

              {blocks.length === 0 && (
                <p className="text-[var(--text-muted)] text-[13px] text-center py-8">
                  No blocks yet. Use the + button or press / to add your first block.
                </p>
              )}
            </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Publish Modal ── */}
      {publishOpen && (
        <PublishModal
          publishUrl={publishUrl}
          courseTitle={courseTitle}
          hashSize={hashSize}
          onClose={() => { setPublishOpen(false); setShowImportSection(false); }}
          onCopy={copy}
          onExportJSON={exportJSON}
          onExportSCORM12={exportSCORM12}
          onExportStaticZip={exportStaticZip}
          showImport={showImportSection}
          onToggleImport={() => setShowImportSection(v => !v)}
          importMode={importMode}
          setImportMode={setImportMode}
          onImportClick={onImportClick}
          onImportScormClick={onImportScormClick}
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropImport}
          hasAssessments={lessons.some(l => l.kind === "assessment")}
          warnings={publishWarnings}
          isPublished={!!(user && courseId)}
        />
      )}

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        open={confirmAction !== null}
        title="Replace course?"
        description="Replace current course with imported content? This cannot be undone."
        confirmLabel="Replace"
        onConfirm={() => { confirmAction?.(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={lessonToRemove !== null}
        title="Remove lesson?"
        description="This lesson and all its content will be permanently removed."
        confirmLabel="Remove"
        onConfirm={() => { if (lessonToRemove) removeLesson(lessonToRemove); setLessonToRemove(null); }}
        onCancel={() => setLessonToRemove(null)}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

interface BlockItemProps {
  block: Block;
  idx: number;
  total: number;
  spec: ReturnType<typeof getSpec>;
  EditorComp: any;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updater: (b: Block) => Block) => void;
}

function BlockItem({ block, idx, total, spec, EditorComp, onMove, onDuplicate, onRemove, onUpdate }: BlockItemProps) {
  return (
    <div className="block-item relative mb-0">
      {/* Block card */}
      <div className="block-card bg-white border-[1.5px] border-transparent rounded-lg p-4 px-5 transition-colors hover:border-[var(--border-subtle)]">
        {/* Block type chip */}
        <div className="text-xs font-extrabold text-[var(--teal-bright)] uppercase tracking-wide mb-1.5">
          {spec.label}
        </div>

        <EditorComp
          block={block as any}
          onChange={(updated: any) => onUpdate(block.id, () => updated as Block)}
        />
      </div>

      {/* Block controls — right side on desktop, bottom-right inside card on mobile */}
      <div className="bctrl absolute md:-right-10 md:top-1/2 md:-translate-y-1/2 right-2 -bottom-3 flex md:flex-col flex-row gap-[3px]">
        {[
          { label: "↑", ariaLabel: "Move block up", action: () => onMove(block.id, "up"), disabled: idx === 0, cls: "" },
          { label: "↓", ariaLabel: "Move block down", action: () => onMove(block.id, "down"), disabled: idx === total - 1, cls: "" },
          { label: "⧉", ariaLabel: "Duplicate block", action: () => onDuplicate(block.id), disabled: false, cls: "" },
          { label: "✕", ariaLabel: "Delete block", action: () => onRemove(block.id), disabled: false, cls: "del" },
        ].map((btn) => (
          <button
            key={btn.ariaLabel}
            onClick={btn.action}
            disabled={btn.disabled}
            aria-label={btn.ariaLabel}
            className={cn(
              "bctrl-btn w-[26px] h-[26px] bg-white border border-[var(--border-subtle)] rounded-[5px] text-[10px] flex items-center justify-center transition-colors text-[var(--text-body)]",
              "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none",
              btn.disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer opacity-100",
              btn.cls === "del" ? "hover:bg-red-100 hover:border-red-300 hover:text-red-500" : "hover:bg-slate-50 hover:border-[var(--border-emphasis)]"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
