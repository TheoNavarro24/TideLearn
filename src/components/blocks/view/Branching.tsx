import { useState } from "react";
import { BranchingBlock } from "@/types/course";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function BranchingView({ block }: { block: BranchingBlock }) {
  const [selected, setSelected] = useState<string | null>(null);
  const choice = block.choices.find((c) => c.id === selected);

  return (
    <div className="py-2 space-y-4">
      <p className="text-sm font-medium">{block.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {block.choices.map((c) => (
          <button key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
            aria-pressed={selected === c.id}
            className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected === c.id
                ? "bg-[--color-teal-500] text-white border-[--color-teal-500]"
                : "bg-background border-border hover:border-[--color-teal-400]"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      {choice && choice.content && (
        <div className="rounded-lg border border-border bg-card p-4">
          <RichTextRenderer html={choice.content} className="text-sm prose prose-sm max-w-none" />
        </div>
      )}
    </div>
  );
}
