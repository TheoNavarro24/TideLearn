import { useNavigate } from "react-router-dom";
import { Undo2, Redo2 } from "lucide-react";

interface EditorTopBarProps {
  courseTitle: string;
  lessonTitle: string;
  onLessonTitleChange: (title: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  publishUrl: string;
  isSaving: boolean;
  onPublish: () => void;
}

export function EditorTopBar({
  courseTitle,
  lessonTitle,
  onLessonTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  publishUrl,
  isSaving,
  onPublish,
}: EditorTopBarProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center w-full gap-3 h-full">
      {/* Left: two-line breadcrumb + lesson title */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/courses")}
            className="text-xs bg-transparent border-none cursor-pointer transition-colors p-0"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-hex)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            ← {courseTitle || "My Courses"}
          </button>
        </div>
        {/* Editable lesson title */}
        <input
          value={lessonTitle}
          onChange={(e) => onLessonTitleChange(e.target.value)}
          aria-label="Lesson title"
          className="bg-transparent border-none outline-none w-full truncate"
          style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--ink)" }}
        />
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 flex-shrink-0 toolbar">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="hidden md:flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors"
          style={{ background: "transparent", color: canUndo ? "var(--ink)" : "var(--text-muted)", opacity: canUndo ? 1 : 0.4 }}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          className="hidden md:flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors"
          style={{ background: "transparent", color: canRedo ? "var(--ink)" : "var(--text-muted)", opacity: canRedo ? 1 : 0.4 }}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Preview button */}
        <button
          onClick={() => window.open(publishUrl, "_blank")}
          className="hidden md:block text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer border transition-colors"
          style={{ background: "transparent", color: "var(--text-muted)", borderColor: "hsl(var(--border))" }}
        >
          Preview
        </button>

        {/* Autosave indicator */}
        <span
          className="hidden md:flex items-center gap-1 text-[11px] font-medium"
          style={{
            color: isSaving ? "var(--text-muted)" : "var(--accent-hex)",
            animation: !isSaving ? "fade-in 200ms var(--ease-out)" : undefined,
          }}
        >
          {isSaving ? "Saving…" : "✓ Saved"}
        </span>

        {/* Publish button */}
        <button
          onClick={onPublish}
          className="text-xs font-bold py-1.5 px-3.5 rounded-md border-none cursor-pointer"
          style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
