import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Lesson } from "@/types/course";

interface EditorSidebarProps {
  courseTitle: string;
  lessons: Lesson[];
  selectedLessonId: string;
  blockCount: number;
  onSelectLesson: (id: string) => void;
  onAddLesson: (kind: "content" | "assessment") => void;
  onExportScorm: () => void;
  onLessonTitleChange: (id: string, title: string) => void;
  onRemoveLesson: (id: string) => void;
}

export function EditorSidebar({
  courseTitle, lessons, selectedLessonId, blockCount,
  onSelectLesson, onAddLesson, onExportScorm, onLessonTitleChange, onRemoveLesson,
}: EditorSidebarProps) {
  const navigate = useNavigate();
  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const startEdit = () => {
    setTitleDraft(selectedLesson?.title ?? "");
    setEditingTitle(true);
  };
  const commitEdit = () => {
    if (selectedLesson && titleDraft.trim()) {
      onLessonTitleChange(selectedLesson.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const readTime = Math.max(1, Math.round(blockCount * 0.3));

  return (
    <div className="lesson-list flex flex-col h-full overflow-hidden">
      {/* Back link */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-1 text-[11px] bg-transparent border-none cursor-pointer p-0 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ← {courseTitle}
        </button>
      </div>

      {/* Lesson info header */}
      <div className="px-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="text-[9px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
          {courseTitle}
        </div>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingTitle(false); }}
            className="font-display text-xl font-bold leading-snug w-full bg-transparent border-b outline-none"
            style={{ color: "var(--ink)", borderColor: "var(--accent-hex)" }}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename lesson"
            className="font-display text-xl font-bold leading-snug text-left w-full bg-transparent border-none cursor-text p-0"
            style={{ color: "var(--ink)" }}
          >
            {selectedLesson?.title ?? ""}
          </button>
        )}
        {selectedLesson?.kind === "content" && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {blockCount} block{blockCount !== 1 ? "s" : ""} · ~{readTime} min read
          </div>
        )}
      </div>

      {/* Lessons section label */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="text-[9px] font-bold tracking-[0.1em] uppercase" style={{ color: "var(--accent-hex)" }}>
          Lessons
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {lessons.map((l, idx) => {
          const isActive = l.id === selectedLessonId;
          return (
            <div key={l.id} className="group relative flex items-stretch">
              <button
                onClick={() => onSelectLesson(l.id)}
                className="flex items-center gap-2 flex-1 text-left border-none rounded-md py-[6px] px-2.5 pr-8 cursor-pointer mb-0.5 transition-colors text-xs font-medium"
                style={{
                  background: isActive ? "rgba(64,200,160,0.08)" : "transparent",
                  color: isActive ? "var(--accent-hex)" : "var(--ink)",
                }}
              >
                <span className="text-xs font-mono font-bold min-w-[16px]" style={{ color: isActive ? "var(--accent-hex)" : "var(--text-muted)" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate">{l.title}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {l.kind === "content" ? "doc" : "quiz"}
                </span>
              </button>
              {lessons.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveLesson(l.id); }}
                  aria-label={`Remove lesson ${l.title}`}
                  title="Remove lesson"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity border-none cursor-pointer"
                  style={{ background: "transparent", color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--destructive))")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: add + export */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => onAddLesson("content")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            + Lesson
          </button>
          <button
            onClick={() => onAddLesson("assessment")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            + Assessment
          </button>
        </div>
        <button
          onClick={onExportScorm}
          className="w-full text-left text-[11px] font-medium py-1.5 px-2 rounded-md cursor-pointer transition-colors border-none"
          style={{ color: "var(--text-muted)", background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(64,200,160,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          ↓ Export SCORM
        </button>
      </div>
    </div>
  );
}
