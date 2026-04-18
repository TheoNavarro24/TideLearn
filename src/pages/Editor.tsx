import { useEffect, useMemo, useState } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { toast } from "@/hooks/use-toast";
import { useDeepLinkIntents } from "@/hooks/useDeepLinkIntents";
import { useBlockOperations } from "@/hooks/useBlockOperations";
import { useCourseAutosave } from "@/hooks/useCourseAutosave";
import { useBlockPicker } from "@/hooks/useBlockPicker";
import { useEditorKeyboard } from "@/hooks/useEditorKeyboard";
import { useCourseImportExport } from "@/hooks/useCourseImportExport";
import { compressToEncodedURIComponent } from "lz-string";
import { loadCourse, saveCourse, saveCourseToCloud, loadCourseFromCloud } from "@/lib/courses";
import { useAuth } from "@/components/auth/AuthContext";
import { cn } from "@/lib/utils";

import { validateCourseBlocks, type BlockWarning } from "@/lib/validate-blocks";

// Shared types
import { ContentLesson, Lesson, uid } from "@/types/course";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
import type { BlockType } from "@/types/course";
import { getSpec } from "@/components/blocks/registry";

// Extracted editor components
import { ConfirmModal } from "@/components/editor/ConfirmModal";
import { PublishModal } from "@/components/editor/PublishModal";
import { AddBlockRow } from "@/components/editor/BlockPicker";
import { EditorSidebar } from "@/pages/EditorSidebar";
import { EditorTopBar } from "@/pages/EditorTopBar";
import { BlockItem } from "@/pages/BlockItem";
import { BlockInspector } from "@/pages/BlockInspector";

// AppShell
import { AppShell } from "@/components/AppShell";

const defaultLesson: ContentLesson = {
  kind: "content",
  id: uid(),
  title: "Welcome",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome to My Course" },
    { id: uid(), type: "text", text: "This welcome page introduces your course. Use the Table of Contents below to jump to any lesson." },
    { id: uid(), type: "toc" as BlockType },
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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("replace");
  const [isDragOver, setIsDragOver] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishWarnings, setPublishWarnings] = useState<BlockWarning[]>([]);
  const [showImportSection, setShowImportSection] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [lessonToRemove, setLessonToRemove] = useState<string | null>(null);

  const courseId = useMemo(() => new URLSearchParams(window.location.search).get("courseId"), []);
  const deepLink = useDeepLinkIntents();

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
        if (!loaded) loaded = loadCourse(courseId);
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

  const handleSelectLesson = (id: string) => {
    setSelectedLessonId(id);
    setSelectedBlockId(null);
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

  const selectedContentLesson = selectedLesson?.kind === "content" ? selectedLesson : null;

  const { addBlock, updateBlock, removeBlock, insertBlockAt, moveBlock, duplicateBlock } = useBlockOperations(
    selectedContentLesson, courseTitle, lessons, pushHistory
  );

  const courseData = { schemaVersion: 1 as const, title: courseTitle, lessons };
  const { isSaving } = useCourseAutosave(courseId, courseData, user);

  const compressedHash = useMemo(() => compressToEncodedURIComponent(JSON.stringify(courseData)), [courseData]);
  const publishUrl = useMemo(() => {
    if (user && courseId) return `${window.location.origin}/view?id=${courseId}`;
    return `${window.location.origin}/view#${compressedHash}`;
  }, [user, courseId, compressedHash]);
  const hashSize = compressedHash.length;

  const {
    pickerState, setPickerState, pickerSearch, setPickerSearch,
    filteredRegistry, pickerRef, pickerSearchRef, openPickerAt,
  } = useBlockPicker(selectedContentLesson);

  useEditorKeyboard({
    onSlash: () => { if (selectedContentLesson) openPickerAt(selectedContentLesson.blocks.length); },
    onUndo: undoHistory,
    onRedo: redoHistory,
    canOpenPicker: selectedLesson?.kind === "content",
  });

  const {
    importInputRef, scormImportInputRef,
    onImportClick, onImportScormClick,
    handleImportFile, handleImportScormFile,
    handleDrop, exportJSON, exportSCORM12, exportStaticZip,
  } = useCourseImportExport({
    courseTitle,
    courseData,
    publishUrl,
    importMode,
    onApplyImport: applyImportedCourse,
    onConfirmReplace: (action) => setConfirmAction(() => action),
  });

  const openPublish = () => {
    const contentLessons = lessons.filter(l => l.kind === "content") as ContentLesson[];
    setPublishWarnings(validateCourseBlocks(contentLessons));
    setPublishOpen(true);
    setShowImportSection(false);
  };

  const copy = async (text: string, label = "Copied to clipboard") => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const blocks = selectedContentLesson?.blocks ?? [];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      <input ref={scormImportInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleImportScormFile} />

      <AppShell
        lightSidebar
        sidebar={
          <EditorSidebar
            courseTitle={courseTitle}
            lessons={lessons}
            selectedLessonId={selectedLessonId}
            blockCount={blocks.length}
            onSelectLesson={handleSelectLesson}
            onAddLesson={addLesson}
            onExportScorm={exportSCORM12}
            onLessonTitleChange={updateLessonTitle}
            onRemoveLesson={(id) => setLessonToRemove(id)}
          />
        }
        topBar={
          <EditorTopBar
            courseTitle={courseTitle}
            lessonTitle={selectedLesson?.title ?? ""}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoHistory}
            onRedo={redoHistory}
            publishUrl={publishUrl}
            isSaving={isSaving}
            onPublish={openPublish}
          />
        }
      >
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "var(--canvas)" }}>
          <div key={selectedLessonId} style={{ animation: "fade-in 150ms var(--ease-out)" }}>
            {/* Canvas body */}
            <div className="flex-1 px-4 md:px-12 py-6 pb-20">
              {selectedLesson?.kind === "assessment" ? (
                <AssessmentEditor
                  lesson={selectedLesson}
                  onChange={(updated) => pushHistory({ courseTitle, lessons: lessons.map(l => l.id === updated.id ? updated : l) })}
                />
              ) : (
                <div className="max-w-[var(--reading-max-w)] mx-auto flex flex-col">
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
                    const spec = getSpec(b.type);
                    return (
                      <div key={b.id} className={cn("transition-opacity", pickerState !== null && pickerState.rowIndex <= idx && "opacity-25")}>
                        <BlockItem
                          block={b}
                          spec={spec}
                          selected={selectedBlockId === b.id}
                          onSelect={() => setSelectedBlockId(b.id)}
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
                    <p className="text-[11px] text-center py-8" style={{ color: "var(--text-muted)" }}>
                      No blocks yet. Use the + button or press / to add your first block.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>

      {/* Block Inspector */}
      {(() => {
        if (!selectedBlockId || !selectedContentLesson) return null;
        const selIdx = blocks.findIndex(b => b.id === selectedBlockId);
        if (selIdx === -1) return null;
        const selBlock = blocks[selIdx];
        const selSpec = getSpec(selBlock.type);
        return (
          <BlockInspector
            key={selectedBlockId}
            block={selBlock}
            spec={selSpec}
            idx={selIdx}
            total={blocks.length}
            onClose={() => setSelectedBlockId(null)}
            onUpdate={updateBlock}
            onMove={moveBlock}
            onDuplicate={(id) => { duplicateBlock(id); }}
            onRemove={(id) => { removeBlock(id); setSelectedBlockId(null); }}
          />
        );
      })()}

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
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={async (e) => { setIsDragOver(false); await handleDrop(e); }}
          hasAssessments={lessons.some(l => l.kind === "assessment")}
          warnings={publishWarnings}
          isPublished={!!(user && courseId)}
        />
      )}

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
    </>
  );
}
