import { useState } from "react";
import { TrueFalseBlock } from "@/types/course";
import { cn } from "@/lib/utils";

export function TrueFalseView({ block }: { block: TrueFalseBlock }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);

  const wasCorrect = choice !== null && choice === block.correct;

  const choiceBg = (val: boolean) => {
    if (revealed && val === block.correct) return "var(--quiz-correct-bg)";
    if (choice === val) return "var(--quiz-selected-bg)";
    return "#fff";
  };
  const choiceBorder = (val: boolean) => {
    if (revealed && val === block.correct) return "1.5px solid var(--quiz-correct-border)";
    if (choice === val) return "1.5px solid var(--quiz-selected-border)";
    return "1.5px solid var(--quiz-idle-border)";
  };
  const choiceColor = (val: boolean) => {
    if (revealed && val === block.correct) return "var(--quiz-correct-text)";
    if (choice === val) return "var(--quiz-correct-text)";
    return "var(--quiz-idle-text)";
  };

  const isDisabled = revealed || choice == null;

  return (
    <div className="my-6 p-6 rounded-xl border border-[var(--quiz-idle-border)] bg-[var(--canvas-white)]">
      <div className="text-[9px] font-bold tracking-[0.1em] uppercase mb-2.5 text-[var(--quiz-correct-text)]">
        True or False
      </div>
      <p className="text-[15px] font-semibold leading-[1.55] mb-[18px] text-[var(--ink)]">{block.question}</p>
      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map((val) => (
          <button
            key={String(val)}
            onClick={() => { if (!revealed) setChoice(val); }}
            aria-pressed={choice === val}
            style={{
              background: choiceBg(val),
              border: choiceBorder(val),
              color: choiceColor(val),
            }}
            className={cn(
              "p-4 rounded-[10px] text-sm font-semibold transition-[border-color,color,background] duration-150",
              "flex items-center justify-center gap-2",
              revealed ? "cursor-default" : "cursor-pointer",
            )}
          >
            <span className="text-base">{val ? "✓" : "✗"}</span>
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
      <div className="mt-3.5 flex gap-2 items-center">
        <button
          onClick={() => {
            if (revealed || choice == null) return;
            setRevealed(true);
            window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: wasCorrect } }));
          }}
          disabled={isDisabled}
          className={cn(
            "border-none rounded-[7px] text-xs font-bold px-3.5 py-1.5",
            isDisabled
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-br from-teal-600 to-sky-500 text-white cursor-pointer"
          )}
        >
          Check
        </button>
        <button
          onClick={() => { setChoice(null); setRevealed(false); }}
          className="bg-transparent rounded-[7px] text-xs font-semibold px-3 py-[5px] cursor-pointer text-slate-500 border border-[var(--quiz-idle-border)]"
        >
          Reset
        </button>
        <div aria-live="polite" aria-atomic="true" role="status">
          {block.showFeedback && revealed && (
            <span className={cn("text-[13px] font-medium", wasCorrect ? "text-teal-600" : "text-red-500")}>
              {wasCorrect ? (block.feedbackCorrect || "Correct!") : (block.feedbackIncorrect || "Incorrect.")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
