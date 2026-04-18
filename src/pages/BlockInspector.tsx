import { useEffect } from "react";
import { X, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

interface BlockInspectorProps {
  block: Block;
  spec: ReturnType<typeof getSpec>;
  idx: number;
  total: number;
  onClose: () => void;
  onUpdate: (id: string, updater: (b: Block) => Block) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function BlockInspector({
  block, spec, idx, total,
  onClose, onUpdate, onMove, onDuplicate, onRemove,
}: BlockInspectorProps) {
  const EditorComp = spec.Editor as React.ComponentType<{
    block: Block;
    onChange: (updated: Block) => void;
  }>;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <aside
      className={cn(
        "fixed right-0 top-[var(--topbar-h)] bottom-0 z-40",
        "w-[320px] flex flex-col",
        "border-l shadow-[var(--shadow-popup)]",
        "animate-in slide-in-from-right duration-200"
      )}
      style={{
        background: "var(--canvas-white)",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span
          className="text-[10px] font-extrabold uppercase tracking-wide"
          style={{ color: "var(--accent-hex)" }}
        >
          {spec.label}
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

      {/* Body: EditorComp form */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <EditorComp
          block={block}
          onChange={(updated) => onUpdate(block.id, () => updated)}
        />
      </div>

      {/* Footer: block controls */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="flex gap-1">
          {[
            { Icon: ArrowUp, ariaLabel: "Move block up", action: () => onMove(block.id, "up"), disabled: idx === 0 },
            { Icon: ArrowDown, ariaLabel: "Move block down", action: () => onMove(block.id, "down"), disabled: idx === total - 1 },
            { Icon: Copy, ariaLabel: "Duplicate block", action: () => onDuplicate(block.id), disabled: false },
          ].map(({ Icon, ariaLabel, action, disabled }) => (
            <button
              key={ariaLabel}
              onClick={action}
              disabled={disabled}
              aria-label={ariaLabel}
              className={cn(
                "w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none",
                disabled ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]"
              )}
              style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <button
          onClick={() => { onRemove(block.id); onClose(); }}
          aria-label="Delete block"
          className="w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none hover:bg-red-50 hover:border-red-300 hover:text-red-500"
          style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
