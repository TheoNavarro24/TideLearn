import { useNavigate } from "react-router-dom";
import { Undo2, Redo2 } from "lucide-react";

interface EditorTopBarProps {
  courseTitle: string;
  lessonTitle: string;
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
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <button
          onClick={() => navigate("/courses")}
          className="text-xs bg-transparent border-none cursor-pointer p-0 transition-colors shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          {courseTitle || "My Courses"}
        </button>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>/</span>
        <span className="text-xs font-semibold truncate" style={{ color: "var(--ink)" }}>
          {lessonTitle}
        </span>
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
