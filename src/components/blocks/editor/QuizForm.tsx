import { QuizBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function QuizForm({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Question</label>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {block.options.map((opt, i) => (
          <Input
            key={i}
            value={opt}
            onChange={(e) => onChange({ ...block, options: block.options.map((o, idx) => (idx === i ? e.target.value : o)) })}
            aria-label={`Option ${i + 1}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Correct answer (0-{Math.max(0, block.options.length - 1)})</label>
        <Input
          type="number"
          min={0}
          max={Math.max(0, block.options.length - 1)}
          value={block.correctIndex}
          onChange={(e) => onChange({ ...block, correctIndex: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
