import { useState } from "react";
import { FillInBlankBlock } from "@/types/course";
import { parseTemplate } from "../editor/fillInBlankUtils";

type Props = { block: FillInBlankBlock };

export function FillInBlankView({ block }: Props) {
  const segments = parseTemplate(block.template);
  const [inputs, setInputs] = useState<string[]>(block.blanks.map(() => ""));
  const [submitted, setSubmitted] = useState(false);

  function checkBlank(blank: FillInBlankBlock["blanks"][0], userInput: string): boolean {
    const accepted = blank.acceptable.filter(Boolean);
    if (blank.caseSensitive) return accepted.includes(userInput.trim());
    return accepted.map((a) => a.toLowerCase()).includes(userInput.trim().toLowerCase());
  }

  const allCorrect = submitted && block.blanks.every((b, i) => checkBlank(b, inputs[i] ?? ""));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="text-sm leading-relaxed flex flex-wrap items-baseline gap-y-1">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.value}</span>;
          }
          const blankIndex = seg.index - 1;
          const blank = block.blanks[blankIndex];
          const userInput = inputs[blankIndex] ?? "";
          const isCorrect = submitted && blank ? checkBlank(blank, userInput) : null;
          return (
            <input
              key={i}
              type="text"
              value={userInput}
              disabled={submitted}
              onChange={(e) => {
                const newInputs = [...inputs];
                newInputs[blankIndex] = e.target.value;
                setInputs(newInputs);
              }}
              className={`inline-block w-28 border-b-2 px-1 text-sm text-center bg-transparent outline-none ${
                isCorrect === true ? "border-[var(--accent-hex)] text-[var(--accent-hex)]" :
                isCorrect === false ? "border-destructive text-destructive" :
                "border-current"
              }`}
              aria-label={`Gap ${seg.index}`}
            />
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={inputs.some((v) => !v.trim())}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check answers
        </button>
      )}
      <div aria-live="polite" aria-atomic="true" role="status">
        {submitted && (
          <p className={`text-sm font-semibold ${allCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
            {allCorrect ? "All correct!" : "Some answers are incorrect — correct answers highlighted above"}
          </p>
        )}
      </div>
    </div>
  );
}
