import { useState } from "react";
import { MultipleResponseBlock } from "@/types/course";

type Props = { block: MultipleResponseBlock };

export function MultipleResponseView({ block }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(i: number) {
    if (submitted) return;
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i]
    );
  }

  function submit() {
    if (selected.length === 0) return;
    setSubmitted(true);
  }

  const isCorrect =
    submitted &&
    block.correctIndices.every((ci) => selected.includes(ci)) &&
    selected.every((s) => block.correctIndices.includes(s));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">{block.question}</p>
      <p className="text-xs text-muted-foreground">Select all that apply</p>
      <div className="space-y-2">
        {block.options.map((opt, i) => {
          const isSelected = selected.includes(i);
          const isCorrectOption = block.correctIndices.includes(i);
          let className = "flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-colors ";
          if (submitted) {
            if (isCorrectOption) className += "border-[var(--accent-hex)] bg-[var(--accent-bg)] text-[var(--accent-hex)] font-medium";
            else if (isSelected) className += "border-destructive bg-destructive/10 text-destructive";
            else className += "border-border text-muted-foreground";
          } else {
            className += isSelected ? "border-[var(--accent-hex)] bg-[var(--accent-bg)]" : "border-border hover:border-[var(--accent-hex)]";
          }
          return (
            <button key={i} className={className} onClick={() => toggle(i)}>
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-[var(--accent-hex)] border-[var(--accent-hex)]" : "border-current"}`}>
                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              {opt}
            </button>
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={submit}
          disabled={selected.length === 0}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check answers
        </button>
      )}
      {submitted && (
        <p className={`text-sm font-semibold ${isCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
          {isCorrect ? "Correct!" : "Not quite — correct answers highlighted"}
        </p>
      )}
      {submitted && block.showFeedback && block.feedbackMessage && (
        <p className="text-sm text-muted-foreground">{block.feedbackMessage}</p>
      )}
    </div>
  );
}
