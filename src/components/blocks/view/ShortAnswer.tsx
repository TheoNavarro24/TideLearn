import { useState } from "react";
import { ShortAnswerBlock } from "@/types/course";
import { cn } from "@/lib/utils";

export function ShortAnswerView({ block }: { block: ShortAnswerBlock }) {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const norm = (s: string) => {
    let t = block.trimWhitespace === false ? s : s.trim();
    if (!block.caseSensitive) t = t.toLowerCase();
    return t;
  };

  const check = () => {
    const candidates = [block.answer, ...(block.acceptable ?? [])];
    const ok = candidates.map(norm).includes(norm(value));
    setCorrect(ok);
    setRevealed(true);
    window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
  };

  const isDisabled = revealed && correct === true;

  return (
    <div className="my-6 p-6 rounded-xl border border-[var(--quiz-idle-border)] bg-[var(--canvas-white)]">
      <div className="text-[9px] font-bold tracking-[0.1em] uppercase mb-2.5 text-[var(--quiz-correct-text)]">
        Short Answer
      </div>
      <p className="text-[15px] font-semibold leading-[1.55] mb-[14px] text-[var(--ink)]">{block.question}</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        disabled={isDisabled}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm text-[var(--ink)] bg-white outline-none box-border border-[1.5px] border-[var(--quiz-idle-border)] focus:border-[var(--quiz-selected-border)] transition-[border-color] duration-150"
      />
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={check}
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
            onClick={() => { setValue(""); setRevealed(false); setCorrect(null); }}
            className="bg-transparent rounded-[7px] text-xs font-semibold px-3 py-[5px] cursor-pointer text-slate-500 border border-[var(--quiz-idle-border)]"
          >
            Reset
          </button>
          <div aria-live="polite" aria-atomic="true" role="status">
            {revealed && (
              <span className={cn("text-[13px] font-medium", correct ? "text-teal-600" : "text-red-500")}>
                {correct ? "Correct!" : "Try again."}
              </span>
            )}
          </div>
        </div>
        {block.showFeedback && block.feedbackMessage && revealed && (
          <span className="text-[13px] text-slate-600">
            {block.feedbackMessage}
          </span>
        )}
      </div>
    </div>
  );
}
