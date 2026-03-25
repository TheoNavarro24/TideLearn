import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

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

export function BlockItem({ block, idx, total, spec, EditorComp, onMove, onDuplicate, onRemove, onUpdate }: BlockItemProps) {
  return (
    <div className="block-item relative mb-0">
      {/* Block card */}
      <div className="block-card border-[1.5px] border-transparent rounded-lg p-4 px-5 transition-colors hover:border-[hsl(var(--border))]" style={{ background: "var(--canvas-white)" }}>
        {/* Block type chip */}
        <div className="text-xs font-extrabold uppercase tracking-wide mb-1.5" style={{ color: "var(--accent-hex)" }}>
          {spec.label}
        </div>

        <EditorComp
          block={block}
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
              "bctrl-btn relative w-[26px] h-[26px] border rounded-[5px] text-xs flex items-center justify-center transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none",
              "after:content-[''] after:absolute after:inset-[-9px]",
              btn.disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer opacity-100",
              btn.cls === "del" ? "hover:bg-red-100 hover:border-red-300 hover:text-red-500" : "hover:border-[var(--accent-hex)]"
            )}
            style={{
              background: "var(--canvas-white)",
              borderColor: "hsl(var(--border))",
              color: "var(--ink)",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
