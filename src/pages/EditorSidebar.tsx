import { useNavigate } from "react-router-dom";
import type { Lesson } from "@/types/course";

interface EditorSidebarProps {
  courseTitle: string;
  lessons: Lesson[];
  selectedLessonId: string;
  onSelectLesson: (id: string) => void;
  onAddLesson: (kind: "content" | "assessment") => void;
  onExportScorm: () => void;
}

export function EditorSidebar({ courseTitle, lessons, selectedLessonId, onSelectLesson, onAddLesson, onExportScorm }: EditorSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className="lesson-list flex flex-col h-full overflow-hidden">
      {/* Header: back link + course title */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--accent-bg)" }}>
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer transition-colors p-0 mb-2"
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-hex)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)"; }}
        >
          ← All courses
        </button>
        <div className="font-display text-sm font-semibold leading-tight" style={{ color: "hsl(var(--sidebar-foreground))" }}>
          {courseTitle}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--sidebar-text)" }}>
          {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
          {(() => {
            const quizCount = lessons.filter(l => l.kind === "assessment").length;
            return quizCount > 0 ? ` · ${quizCount} quiz${quizCount !== 1 ? "zes" : ""}` : "";
          })()}
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {lessons.map((l, idx) => {
          const isActive = l.id === selectedLessonId;
          return (
            <button
              key={l.id}
              onClick={() => onSelectLesson(l.id)}
              className="flex items-center gap-2 w-full text-left border-none rounded-md py-[6px] px-2.5 cursor-pointer mb-0.5 transition-colors text-xs font-medium"
              style={{
                background: isActive ? "var(--accent-bg)" : "transparent",
                color: isActive ? "var(--accent-hex)" : "var(--sidebar-text)",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text-hover)"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)"; }}
            >
              <span className="text-xs font-mono font-bold min-w-[16px]" style={{ color: isActive ? "var(--accent-hex)" : "var(--sidebar-text)", opacity: isActive ? 1 : 0.6 }}>
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{l.title}</span>
              <span className="text-xs opacity-50" aria-label={l.kind === "assessment" ? "Assessment lesson" : undefined}>{l.kind === "content" ? "doc" : "quiz"}</span>
            </button>
          );
        })}
      </div>

      {/* Add lesson buttons */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid var(--accent-bg)" }}>
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => onAddLesson("content")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "var(--accent-bg)", color: "var(--sidebar-text)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-hex)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)"; }}
          >
            + Lesson
          </button>
          <button
            onClick={() => onAddLesson("assessment")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "var(--accent-bg)", color: "var(--sidebar-text)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-hex)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)"; }}
          >
            + Assessment
          </button>
        </div>
        <button
          onClick={onExportScorm}
          className="w-full text-left text-[11px] font-medium py-1.5 px-2 rounded-md cursor-pointer transition-colors border-none"
          style={{ color: "var(--sidebar-text)", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          ↓ Export SCORM
        </button>
      </div>
    </div>
  );
}
