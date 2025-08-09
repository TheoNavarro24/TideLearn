import { useState } from "react";
import { TrueFalseBlock } from "@/types/course";
import { Button } from "@/components/ui/button";

export function TrueFalseView({ block }: { block: TrueFalseBlock }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);

  const wasCorrect = choice !== null && choice === block.correct;

  return (
    <div className="card-surface p-4">
      <p className="font-medium mb-2">{block.question}</p>
      <div className="grid grid-cols-2 gap-2">
        {([true, false] as const).map((val) => (
          <button
            key={String(val)}
            className={`w-full rounded-md border p-2 text-center hover:bg-muted/60 ${choice === val ? 'bg-muted' : ''} ${revealed && val === block.correct ? 'bg-secondary' : ''}`}
            onClick={() => setChoice(val)}
            aria-pressed={choice === val}
          >
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <Button
          size="sm"
          onClick={() => {
            setRevealed(true);
            const ok = wasCorrect;
            window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
          }}
          disabled={revealed || choice == null}
        >
          Check
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { setChoice(null); setRevealed(false); }}
        >
          Reset
        </Button>
        {revealed && (
          <span className={`text-sm ${wasCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {wasCorrect ? (block.feedbackCorrect || 'Correct!') : (block.feedbackIncorrect || 'Try again.')}
          </span>
        )}
      </div>
    </div>
  );
}
