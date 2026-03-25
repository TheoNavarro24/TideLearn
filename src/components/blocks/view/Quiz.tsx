import { useState } from "react";
import { QuizBlock } from "@/types/course";
import { cn } from "@/lib/utils";

export function QuizView({ block }: { block: QuizBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const unset = block.correctIndex === -1;
  const isCorrect = selected !== null && selected === block.correctIndex;

  const optBg = (i: number) => {
    if (revealed && i === block.correctIndex) return "var(--quiz-correct-bg)";
    if (selected === i) return "var(--quiz-selected-bg)";
    return "#fff";
  };
  const optBorder = (i: number) => {
    if (revealed && i === block.correctIndex) return "1.5px solid var(--quiz-correct-border)";
    if (selected === i) return "1.5px solid var(--quiz-selected-border)";
    return "1.5px solid var(--quiz-idle-border)";
  };
  const optColor = (i: number) => {
    if (revealed && i === block.correctIndex) return "var(--quiz-correct-text)";
    if (selected === i) return "var(--quiz-correct-text)";
    return "var(--quiz-idle-text)";
  };

  const isDisabled = revealed || selected == null || unset;

  return (
    <div className="my-6 p-6 rounded-xl border border-[var(--quiz-idle-border)] bg-[var(--canvas-white)]">
      <div className="text-[9px] font-bold tracking-[0.1em] uppercase mb-2.5 text-[var(--quiz-correct-text)]">
        Multiple Choice
      </div>
      <p className="text-[15px] font-semibold leading-[1.55] mb-[18px] text-[var(--ink)]">{block.question}</p>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {block.options.map((opt, i) => (
          <li key={i}>
            <button
              onClick={() => { if (!revealed) setSelected(i); }}
              style={{
                background: optBg(i),
                border: optBorder(i),
                color: optColor(i),
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg text-sm transition-[border-color,color,background] duration-150",
                "flex items-center gap-2.5",
                revealed || (selected === i) ? "font-semibold" : "font-normal",
                revealed ? "cursor-default" : "cursor-pointer",
              )}
            >
              <span
                className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ border: `1.5px solid ${optColor(i)}` }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3.5 flex gap-2 items-center">
        <button
          onClick={() => {
            if (revealed || selected == null || unset) return;
            setRevealed(true);
            const ok = selected === block.correctIndex;
            window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
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
          onClick={() => { setSelected(null); setRevealed(false); }}
          className="bg-transparent rounded-[7px] text-xs font-semibold px-3 py-[5px] cursor-pointer text-slate-500 border border-[var(--quiz-idle-border)]"
        >
          Reset
        </button>
        {unset && (
          <span className="text-[13px] text-slate-400 font-medium">
            No correct answer has been set for this question.
          </span>
        )}
        <div aria-live="polite" aria-atomic="true" role="status">
          {revealed && (
            <div className="flex flex-col gap-1">
              <span className={cn("text-[13px] font-medium", isCorrect ? "text-teal-600" : "text-red-500")}>
                {isCorrect ? "Correct!" : "Try again."}
              </span>
              {block.showFeedback && block.feedbackMessage && (
                <span className="text-[13px] text-slate-600 leading-[1.5]">
                  {block.feedbackMessage}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
