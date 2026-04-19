import { useEffect } from "react";
import { X, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentQuestion } from "@/types/course";
import { QuestionForm } from "./QuestionForm";

interface QuestionInspectorProps {
  question: AssessmentQuestion;
  idx: number;
  total: number;
  onClose: () => void;
  onSave: (q: AssessmentQuestion) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function QuestionInspector({
  question, idx, total,
  onClose, onSave, onMove, onDuplicate, onRemove,
}: QuestionInspectorProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const footerBtnBase = "w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none";
  const footerBtnStyle = { background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" } as const;

  return (
    <aside
      className={cn(
        "fixed right-0 top-[var(--topbar-h)] bottom-0 z-40",
        "w-[320px] flex flex-col",
        "border-l shadow-[var(--shadow-popup)]",
        "animate-in slide-in-from-right duration-200"
      )}
      style={{ background: "var(--canvas-white)", borderColor: "hsl(var(--border))" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
        <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: "var(--accent-hex)" }}>
          {question.kind}
        </span>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="flex items-center justify-center w-6 h-6 rounded transition-colors border-none cursor-pointer"
          style={{ background: "transparent", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {question.kind === "mcq" ? (
          <QuestionForm
            key={question.id}
            initial={question}
            onSave={onSave}
            onCancel={onClose}
          />
        ) : (
          <div className="flex flex-col gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <p>
              <strong style={{ color: "var(--ink)" }}>{question.kind}</strong> questions
              can&apos;t be edited in this inspector yet — only MCQ questions are supported here.
            </p>
            <p>
              Use the TideLearn MCP tool <code className="font-mono">update_question</code>,
              or remove and re-import via the JSON panel below the canvas.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex gap-1">
          <button
            onClick={() => onMove(question.id, "up")}
            disabled={idx === 0}
            aria-label="Move question up"
            className={cn(footerBtnBase, idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(question.id, "down")}
            disabled={idx === total - 1}
            aria-label="Move question down"
            className={cn(footerBtnBase, idx === total - 1 ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(question.id)}
            aria-label="Duplicate question"
            className={cn(footerBtnBase, "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => onRemove(question.id)}
          aria-label="Delete question"
          className={cn(footerBtnBase, "hover:bg-red-50 hover:border-red-300 hover:text-red-500")}
          style={footerBtnStyle}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
