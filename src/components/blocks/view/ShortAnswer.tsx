import { useState } from "react";
import { ShortAnswerBlock } from "@/types/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <div className="card-surface p-4">
      <p className="font-medium mb-2">{block.question}</p>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type your answer" />
      <div className="mt-3 flex gap-2 items-center">
        <Button size="sm" onClick={check} disabled={revealed && correct === true}>Check</Button>
        <Button size="sm" variant="secondary" onClick={() => { setValue(""); setRevealed(false); setCorrect(null); }}>Reset</Button>
        {revealed && (
          <span className={`text-sm ${correct ? 'text-green-600' : 'text-red-600'}`}>
            {correct ? 'Correct!' : `Try again.`}
          </span>
        )}
      </div>
    </div>
  );
}
