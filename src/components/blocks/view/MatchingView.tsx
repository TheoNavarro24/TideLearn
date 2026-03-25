import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MatchingBlock } from "@/types/course";

type Props = { block: MatchingBlock };

export function MatchingView({ block }: Props) {
  const shuffledRight = useMemo(() => {
    const r = [...block.right];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }, [block.id]);

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function select(leftId: string, rightId: string) {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [leftId]: rightId }));
  }

  const correctPairs = new Map(block.pairs.map((p) => [p.leftId, p.rightId]));
  const allCorrect = submitted && block.left.every((l) => selections[l.id] === correctPairs.get(l.id));
  const allSelected = block.left.every((l) => selections[l.id]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">{block.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Match</p>
          {block.left.map((l) => (
            <div key={l.id} className="px-3 py-2 border rounded text-sm bg-background">
              {l.label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">With</p>
          {block.left.map((l) => {
            const isCorrect = submitted && selections[l.id] === correctPairs.get(l.id);
            const isWrong = submitted && selections[l.id] && selections[l.id] !== correctPairs.get(l.id);
            return (
              <div key={l.id} className="flex items-center gap-2">
                <select
                  value={selections[l.id] ?? ""}
                  disabled={submitted}
                  onChange={(e) => select(l.id, e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded text-sm bg-background ${
                    isCorrect ? "border-[var(--accent-hex)] text-[var(--accent-hex)]" :
                    isWrong ? "border-destructive text-destructive" : ""
                  }`}
                  aria-label={`Match for ${l.label}`}
                >
                  <option value="">Choose...</option>
                  {shuffledRight.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                {(isCorrect || isWrong) && (
                  <span className={cn("text-xs font-bold", isCorrect ? "text-teal-600" : "text-destructive")} aria-hidden="true">
                    {isCorrect ? "✓" : "✗"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allSelected}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check matches
        </button>
      )}
      <div aria-live="polite" aria-atomic="true" role="status">
        {submitted && (
          <p className={`text-sm font-semibold ${allCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
            {allCorrect ? "All correct!" : "Some matches are wrong — correct matches shown"}
          </p>
        )}
      </div>
    </div>
  );
}
