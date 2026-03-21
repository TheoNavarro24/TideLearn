import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { toast } from "@/hooks/use-toast";
import { useDeepLinkIntents } from "@/hooks/useDeepLinkIntents";
import { ArrowLeft } from "lucide-react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { loadCourse, saveCourse, saveCourseToCloud, loadCourseFromCloud } from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";
import { exportScorm12Zip, buildScormFileName, exportStaticWebZip, buildStaticFileName } from "@/lib/scorm12";
import JSZip from "jszip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Shared types
import { Block, Lesson, uid } from "@/types/course";
import type { BlockType } from "@/types/course";
import { registry, createBlock, getSpec } from "@/components/blocks/registry";

const defaultLesson: Lesson = {
  id: uid(),
  title: "Welcome",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome to My Course" },
    { id: uid(), type: "text", text: "This welcome page introduces your course. Use the Table of Contents below to jump to any lesson." },
    { id: uid(), type: "toc" as any },
  ],
};

const CATEGORY_META: Record<string, { label: string; iconBg: string }> = {
  Text: { label: "Text", iconBg: "#f0fdf4" },
  Media: { label: "Media", iconBg: "#eff6ff" },
  Interactive: { label: "Interactive", iconBg: "#faf5ff" },
  Knowledge: { label: "Knowledge Check", iconBg: "#fff7ed" },
};

const CATEGORIES = ["Text", "Media", "Interactive", "Knowledge"] as const;

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
  const [showImportSection, setShowImportSection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
          // When logged in, Supabase is the source of truth
          loaded = await loadCourseFromCloud(courseId);
          if (loaded) saveCourse(courseId, loaded);
        }
        if (!loaded) {
          // Fallback: offline or unauthenticated
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

  // Helper: returns lessons with the welcome heading synced to a given title
  function syncWelcomeHeading(title: string, currentLessons: Lesson[]): Lesson[] {
    if (!currentLessons.length) return currentLessons;
    const first = currentLessons[0];
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

  const addLesson = () => {
    const newLesson: Lesson = { id: uid(), title: `Lesson ${lessons.length + 1}`, blocks: [] };
    pushHistory({ courseTitle, lessons: [...lessons, newLesson] });
    setSelectedLessonId(newLesson.id);
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
          setPickerState({ rowIndex: selectedLesson?.blocks.length ?? 0 });
          setPickerSearch("");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLesson]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
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

  // Import helpers and modes
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
      const courseEntry = zip.file(/(^|\/)course\.json$/i)?.[0];
      if (courseEntry) {
        const json = await courseEntry.async("text");
        const data = JSON.parse(json);
        if (!data || !Array.isArray(data.lessons)) throw new Error("Invalid course data");
        if (importMode === "replace" && !window.confirm("Replace current course with imported content? This cannot be undone.")) return;
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

  const blocks = selectedLesson?.blocks ?? [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gridTemplateRows: "48px 1fr",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Hidden file inputs */}
      <input ref={importInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} />
      <input ref={scormImportInputRef} type="file" accept=".zip,application/zip" style={{ display: "none" }} onChange={handleImportScormFile} />

      {/* ── Topbar ── */}
      <div
        style={{
          gridColumn: "1 / -1",
          background: "var(--ocean-surface)",
          borderBottom: "1px solid rgba(20,184,166,0.15)",
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 0,
          zIndex: 10,
        }}
      >
        {/* Back button */}
        <a
          href="/courses"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(94,234,212,0.5)",
            textDecoration: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 8px",
            whiteSpace: "nowrap",
          }}
        >
          <ArrowLeft size={13} style={{ opacity: 0.7 }} />
          My Courses
        </a>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(20,184,166,0.15)", margin: "0 12px" }} />

        {/* Course title input */}
        <input
          value={courseTitle}
          onChange={e => pushHistory({ courseTitle: e.target.value, lessons: syncWelcomeHeading(e.target.value, lessons) })}
          aria-label="Course title"
          placeholder="Course title"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            fontFamily: "Inter, sans-serif",
            flex: 1,
            minWidth: 0,
          }}
        />

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          {/* Undo/Redo buttons */}
          <button
            onClick={() => undoHistory()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              background: "none",
              border: "none",
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.35,
              padding: "6px 8px",
              borderRadius: 6,
              color: "#5eead4",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ↩ Undo
          </button>
          <button
            onClick={() => redoHistory()}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{
              background: "none",
              border: "none",
              cursor: canRedo ? "pointer" : "not-allowed",
              opacity: canRedo ? 1 : 0.35,
              padding: "6px 8px",
              borderRadius: 6,
              color: "#5eead4",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ↪ Redo
          </button>

          {/* Saved indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: isSaving ? "rgba(94,234,212,0.4)" : "var(--teal-bright)",
              transition: "background 0.2s",
            }} />
            <span style={{ fontSize: 11, color: "rgba(94,234,212,0.4)", fontWeight: 500 }}>
              {isSaving ? "Saving…" : "Saved"}
            </span>
          </div>

          {/* Preview button */}
          <button
            onClick={() => window.open(publishUrl, "_blank")}
            style={{
              background: "none",
              border: "1.5px solid rgba(20,184,166,0.35)",
              borderRadius: 6,
              color: "var(--teal-bright)",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Preview
          </button>

          {/* Save button */}
          <button
            onClick={saveNow}
            style={{
              background: "none",
              border: "1.5px solid rgba(20,184,166,0.35)",
              borderRadius: 6,
              color: "var(--teal-bright)",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Save
          </button>

          {/* Publish button */}
          <button
            onClick={() => { setPublishOpen(true); setShowImportSection(false); }}
            style={{
              background: "var(--gradient-primary)",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            Publish
          </button>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div
        style={{
          background: "var(--ocean-mid)",
          borderRight: "1px solid rgba(20,184,166,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: "14px 16px 8px" }}>
          <span style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: "rgba(94,234,212,0.45)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}>
            Lessons
          </span>
        </div>

        {/* Lesson list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {lessons.map((l, idx) => {
            const isActive = l.id === selectedLessonId;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLessonId(l.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  background: isActive ? "rgba(20,184,166,0.18)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 10px",
                  cursor: "pointer",
                  color: isActive ? "#ccfbf1" : "rgba(204,251,241,0.6)",
                  marginBottom: 2,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(20,184,166,0.1)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isActive ? "var(--teal-bright)" : "rgba(94,234,212,0.4)",
                  minWidth: 16,
                  fontFamily: "Inter, monospace",
                }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.title}
                </span>
                <span style={{ fontSize: 10, color: "rgba(94,234,212,0.35)", whiteSpace: "nowrap" }}>
                  {l.blocks.length}b
                </span>
              </button>
            );
          })}
        </div>

        {/* Add lesson button */}
        <div style={{ padding: "8px 8px" }}>
          <button
            onClick={addLesson}
            style={{
              width: "100%",
              background: "none",
              border: "1.5px dashed rgba(20,184,166,0.25)",
              borderRadius: 6,
              color: "rgba(94,234,212,0.45)",
              fontSize: 11,
              fontWeight: 600,
              padding: "7px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            + Add lesson
          </button>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(20,184,166,0.12)", padding: "8px" }}>
          <button
            onClick={() => { setPublishOpen(true); setShowImportSection(false); }}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              borderRadius: 6,
              color: "rgba(94,234,212,0.45)",
              fontSize: 11,
              fontWeight: 500,
              padding: "6px 10px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            ⚙️ Course settings
          </button>
          <button
            onClick={exportSCORM12}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              borderRadius: 6,
              color: "rgba(94,234,212,0.45)",
              fontSize: 11,
              fontWeight: 500,
              padding: "6px 10px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            📦 Export SCORM
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        style={{
          background: "var(--surface-subtle)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Lesson header */}
        {selectedLesson && (
          <div style={{
            background: "white",
            borderBottom: "1px solid #e0fdf4",
            padding: "16px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <input
              value={selectedLesson.title}
              onChange={e => updateLessonTitle(selectedLesson.id, e.target.value)}
              aria-label="Lesson title"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "Lora, Georgia, serif",
                fontSize: 19,
                fontWeight: 700,
                color: "#0d2926",
                width: "100%",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </span>
              {lessons.length > 1 && (
                <button
                  onClick={() => removeLesson(selectedLesson.id)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 11,
                    color: "#fca5a5",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Remove lesson
                </button>
              )}
            </div>
          </div>
        )}

        {/* Canvas body */}
        <div style={{ padding: "20px 64px 80px", maxWidth: 700 + 128, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column" }}>

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
                <div key={b.id} style={{ opacity: isPickerBelowThis ? 0.25 : 1, transition: "opacity 0.15s" }}>
                  {/* Block item */}
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

                  {/* Add-block row after this block */}
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
              <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
                No blocks yet. Click "+ Add block" above to get started, or press "/" anywhere.
              </p>
            )}
          </div>
        </div>
      </div>

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
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

interface AddBlockRowProps {
  rowIndex: number;
  pickerState: { rowIndex: number } | null;
  onOpen: () => void;
  pickerRef: (rowIndex: number) => React.RefObject<HTMLDivElement> | undefined;
  pickerSearch: string;
  setPickerSearch: (s: string) => void;
  filteredRegistry: typeof registry;
  pickerSearchRef: React.RefObject<HTMLInputElement>;
  onPickerSelect: (type: BlockType) => void;
  onPickerClose: () => void;
}

function AddBlockRow({
  rowIndex,
  pickerState,
  onOpen,
  pickerRef,
  pickerSearch,
  setPickerSearch,
  filteredRegistry,
  pickerSearchRef,
  onPickerSelect,
  onPickerClose,
}: AddBlockRowProps) {
  const isOpen = pickerState?.rowIndex === rowIndex;
  const ref = pickerRef(rowIndex);

  return (
    <div
      className="abr-container"
      style={{ position: "relative", margin: "4px 0" }}
    >
      <style>{`
        .abr { opacity: 0; transition: opacity 0.15s; }
        .abr-container:hover .abr { opacity: 1; }
        .abr.open { opacity: 1; }
        .abr-pill:hover { background: #f0fdfb !important; border-color: #5eead4 !important; }
        .bctrl { opacity: 0; transition: opacity 0.15s; }
        .block-item:hover .bctrl { opacity: 1; }
        .bctrl-btn:hover { background: #f8fafc !important; border-color: #c7f5ee !important; }
        .bctrl-btn.del:hover { background: #fee2e2 !important; border-color: #fca5a5 !important; color: #ef4444 !important; }
        .block-item:hover .block-card { border-color: #e0fdf4 !important; }
        .picker-tile:hover { background: #f0fdfb !important; border-color: #99f6e4 !important; }
        .sidebar-footer-btn:hover { background: rgba(20,184,166,0.08) !important; }
      `}</style>

      <div
        className={`abr${isOpen ? " open" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: 0,
        }}
      >
        {/* Left line */}
        <div style={{ flex: 1, height: 1, background: "rgba(20,184,166,0.15)" }} />

        {/* Pill button */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            className="abr-pill"
            onClick={onOpen}
            style={{
              background: "white",
              border: "1.5px solid #99f6e4",
              borderRadius: 20,
              color: "#0d9488",
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 13px",
              cursor: "pointer",
              margin: "0 10px",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            + Add block
          </button>

          {/* Picker popup */}
          {isOpen && (
            <div
              ref={ref}
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                width: 420,
                background: "white",
                border: "1px solid #c7f5ee",
                borderRadius: 12,
                boxShadow: "0 24px 60px rgba(0,0,0,0.13)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {/* Search */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0fdf4", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>🔍</span>
                <input
                  ref={pickerSearchRef}
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search blocks…"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    color: "#0f172a",
                    width: "100%",
                    background: "transparent",
                  }}
                />
              </div>

              {/* Categories */}
              <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
                {CATEGORIES.map(cat => {
                  const catSpecs = filteredRegistry.filter(s => s.category === cat || (cat === "Knowledge" && s.category === "Knowledge"));
                  if (catSpecs.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat} style={{ padding: "0 14px 10px" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>
                        {meta.label}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        {catSpecs.map(spec => (
                          <button
                            key={spec.type}
                            className="picker-tile"
                            onClick={() => onPickerSelect(spec.type)}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 5,
                              background: "white",
                              border: "1.5px solid #e0fdf4",
                              borderRadius: 8,
                              padding: "8px 4px",
                              cursor: "pointer",
                              transition: "background 0.12s, border-color 0.12s",
                            }}
                          >
                            <div style={{
                              width: 34,
                              height: 34,
                              background: meta.iconBg,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              <spec.icon size={16} style={{ color: "#0d9488" }} />
                            </div>
                            <span style={{ fontSize: 10, color: "#334155", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                              {spec.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredRegistry.length === 0 && (
                  <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                    No blocks found
                  </div>
                )}
              </div>

              {/* Footer close */}
              <div style={{ borderTop: "1px solid #f0fdf4", padding: "8px 14px", textAlign: "right" }}>
                <button
                  onClick={onPickerClose}
                  style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right line */}
        <div style={{ flex: 1, height: 1, background: "rgba(20,184,166,0.15)" }} />
      </div>
    </div>
  );
}

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
    <div
      className="block-item"
      style={{ position: "relative", marginBottom: 0 }}
    >
      {/* Block card */}
      <div
        className="block-card"
        style={{
          background: "white",
          border: "1.5px solid transparent",
          borderRadius: 8,
          padding: "16px 20px",
          transition: "border-color 0.15s",
          position: "relative",
        }}
      >
        {/* Block type chip */}
        <div style={{
          fontSize: 9,
          fontWeight: 800,
          color: "var(--teal-bright)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}>
          {spec.label}
        </div>

        <EditorComp
          block={block as any}
          onChange={(updated: any) => onUpdate(block.id, () => updated as Block)}
        />
      </div>

      {/* Block controls */}
      <div
        className="bctrl"
        style={{
          position: "absolute",
          right: -40,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {[
          { label: "↑", action: () => onMove(block.id, "up"), disabled: idx === 0, cls: "" },
          { label: "↓", action: () => onMove(block.id, "down"), disabled: idx === total - 1, cls: "" },
          { label: "⧉", action: () => onDuplicate(block.id), disabled: false, cls: "" },
          { label: "✕", action: () => onRemove(block.id), disabled: false, cls: "del" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={btn.disabled}
            className={`bctrl-btn${btn.cls ? ` ${btn.cls}` : ""}`}
            style={{
              width: 26,
              height: 26,
              background: "white",
              border: "1px solid #e0fdf4",
              borderRadius: 5,
              fontSize: 10,
              cursor: btn.disabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: btn.disabled ? 0.35 : 1,
              transition: "background 0.12s, border-color 0.12s, color 0.12s",
              color: "#334155",
            }}
            aria-label={btn.label}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PublishModalProps {
  publishUrl: string;
  courseTitle: string;
  hashSize: number;
  onClose: () => void;
  onCopy: (text: string, label?: string) => void;
  onExportJSON: () => void;
  onExportSCORM12: () => void;
  onExportStaticZip: () => void;
  showImport: boolean;
  onToggleImport: () => void;
  importMode: "merge" | "replace";
  setImportMode: (m: "merge" | "replace") => void;
  onImportClick: () => void;
  onImportScormClick: () => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

function PublishModal({
  publishUrl,
  courseTitle,
  hashSize,
  onClose,
  onCopy,
  onExportJSON,
  onExportSCORM12,
  onExportStaticZip,
  showImport,
  onToggleImport,
  importMode,
  setImportMode,
  onImportClick,
  onImportScormClick,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: PublishModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,22,18,0.72)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 500,
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
        }}
      >
        {/* Teal stripe */}
        <div style={{ height: 3, background: "linear-gradient(135deg, #0d9488, #0891b2)" }} />

        {/* Modal top */}
        <div style={{ padding: "28px 32px 24px" }}>
          {/* Success circle */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0d9488, #0891b2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Title */}
          <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 22, fontWeight: 700, color: "#0d2926", margin: "0 0 6px" }}>
            Your course is live
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
            <strong>{courseTitle}</strong> is published and ready to share.
          </p>

          {/* Large URL warning */}
          {hashSize > 100000 && (
            <div style={{ background: "#fefce8", border: "1px solid #fbbf24", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
              Large course: link is {hashSize.toLocaleString()} chars. Use Export JSON for better portability.
            </div>
          )}

          {/* Share link row */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Share Link
            </div>
            <div style={{ display: "flex", gap: 0, border: "1.5px solid #d1faf4", borderRadius: 8, overflow: "hidden" }}>
              <input
                value={publishUrl}
                readOnly
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  fontFamily: "monospace",
                  padding: "8px 12px",
                  color: "#334155",
                  background: "#f8fffe",
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => onCopy(publishUrl, "URL copied!")}
                style={{
                  background: "linear-gradient(135deg, #0d9488, #0891b2)",
                  border: "none",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "0 16px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 32px", margin: "0 0 20px" }}>
          <div style={{ flex: 1, height: 1, background: "#e0fdf4" }} />
          <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>Export for offline & LMS</span>
          <div style={{ flex: 1, height: 1, background: "#e0fdf4" }} />
        </div>

        {/* Export grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "0 32px 24px" }}>
          {[
            {
              icon: "📦",
              iconBg: "#f0fdf4",
              label: "SCORM 1.2",
              desc: "Upload to any LMS",
              action: "Export .zip →",
              onClick: onExportSCORM12,
            },
            {
              icon: "🌐",
              iconBg: "#eff6ff",
              label: "HTML Export",
              desc: "Self-hosted web package",
              action: "Download .html →",
              onClick: onExportStaticZip,
            },
            {
              icon: "📄",
              iconBg: "#fff7ed",
              label: "Course JSON",
              desc: "Portable course data",
              action: "Download .json →",
              onClick: onExportJSON,
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: "#fafffe",
                border: "1.5px solid #e0fdf4",
                borderRadius: 10,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                background: card.iconBg,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}>
                {card.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0d2926" }}>{card.label}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{card.desc}</div>
              <button
                onClick={card.onClick}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 11,
                  color: "#0d9488",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                  marginTop: "auto",
                }}
              >
                {card.action}
              </button>
            </div>
          ))}
        </div>

        {/* Import section (collapsible) */}
        {showImport && (
          <div style={{ borderTop: "1px solid #e0fdf4", padding: "16px 32px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0d2926", marginBottom: 10 }}>Import course</div>

            {/* Import mode */}
            <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)} className="flex gap-6 mb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="mode-replace" />
                <Label htmlFor="mode-replace" style={{ fontSize: 12 }}>Replace current course</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="mode-merge" />
                <Label htmlFor="mode-merge" style={{ fontSize: 12 }}>Merge (append lessons)</Label>
              </div>
            </RadioGroup>

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${isDragOver ? "#0d9488" : "#c7f5ee"}`,
                borderRadius: 8,
                padding: "16px",
                textAlign: "center",
                background: isDragOver ? "#f0fdfb" : "#f8fffe",
                marginBottom: 10,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Drag & drop a .json or .zip (SCORM) file here</p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onImportClick}
                style={{
                  background: "none",
                  border: "1.5px solid #c7f5ee",
                  borderRadius: 6,
                  color: "#0d9488",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Import JSON
              </button>
              <button
                onClick={onImportScormClick}
                style={{
                  background: "none",
                  border: "1.5px solid #c7f5ee",
                  borderRadius: 6,
                  color: "#0d9488",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Import SCORM .zip
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #e0fdf4",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={onToggleImport}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "#94a3b8",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {showImport ? "Hide import" : "Import course"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#0d9488",
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: 6,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f0fdfb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
