import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

interface BlockItemProps {
  block: Block;
  spec: ReturnType<typeof getSpec>;
  selected: boolean;
  onSelect: () => void;
}

export function BlockItem({ block, spec, selected, onSelect }: BlockItemProps) {
  const ViewComp = spec.View as React.ComponentType<{ block: Block }>;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      aria-label={`${spec.label} block — click to edit`}
      className={cn(
        "block-item block-card w-full text-left relative mb-0",
        "rounded-lg p-4 px-5 cursor-pointer",
        "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
        selected
          ? "ring-2 ring-[var(--accent-hex)]"
          : "hover:ring-1 hover:ring-[hsl(var(--border))]"
      )}
      style={{ background: "transparent" }}
    >
      <ViewComp block={block} />
    </div>
  );
}
