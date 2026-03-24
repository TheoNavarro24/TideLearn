import { useState } from "react";
import { FlashcardBlock } from "@/types/course";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function FlashcardView({ block }: { block: FlashcardBlock }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="py-4">
      {block.hint && !flipped && (
        <p className="text-sm text-muted-foreground mb-3 text-center italic">Hint: {block.hint}</p>
      )}
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show front of card" : "Flip card to see answer"}
        className="w-full min-h-[160px] rounded-xl border-2 border-border bg-card p-6 text-center transition-all hover:border-[var(--accent-hex)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div style={{ transition: "transform 0.4s", transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", position: "relative", minHeight: "120px" }}>
          <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Front</span>
            <RichTextRenderer html={block.front} className="text-base" />
          </div>
          <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-medium text-[var(--accent-hex)] uppercase tracking-wide">Answer</span>
            <RichTextRenderer html={block.back} className="text-base" />
          </div>
        </div>
      </button>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Click to {flipped ? "see question" : "reveal answer"}
      </p>
    </div>
  );
}
