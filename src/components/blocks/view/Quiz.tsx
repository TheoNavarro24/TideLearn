import { useState } from "react";
import { QuizBlock } from "@/types/course";
import { Button } from "@/components/ui/button";

export function QuizView({ block }: { block: QuizBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="card-surface p-4">
      <p className="font-medium mb-2">{block.question}</p>
      <ul className="grid gap-2">
        {block.options.map((opt, i) => {
          const isCorrect = i === block.correctIndex;
          const isChosen = selected === i;
          return (
            <li key={i}>
              <button
                className={`w-full rounded-md border p-2 text-left hover:bg-muted/60 ${isChosen ? 'bg-muted' : ''} ${revealed && isCorrect ? 'bg-secondary' : ''}`}
                onClick={() => setSelected(i)}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => setRevealed(true)} disabled={revealed || selected == null}>Check</Button>
        <Button size="sm" variant="secondary" onClick={() => { setSelected(null); setRevealed(false); }}>Reset</Button>
      </div>
    </div>
  );
}
