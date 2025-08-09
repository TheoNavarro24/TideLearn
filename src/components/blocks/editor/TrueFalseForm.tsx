import { TrueFalseBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function TrueFalseForm({ block, onChange }: { block: TrueFalseBlock; onChange: (b: TrueFalseBlock) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Question</label>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Correct answer is True</p>
          <p className="text-xs text-muted-foreground">Toggle to set whether the statement is true.</p>
        </div>
        <Switch checked={block.correct} onCheckedChange={(v) => onChange({ ...block, correct: v })} />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Feedback (Correct)</label>
        <Textarea value={block.feedbackCorrect ?? ""} onChange={(e) => onChange({ ...block, feedbackCorrect: e.target.value })} placeholder="Shown when the learner answers correctly" />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Feedback (Incorrect)</label>
        <Textarea value={block.feedbackIncorrect ?? ""} onChange={(e) => onChange({ ...block, feedbackIncorrect: e.target.value })} placeholder="Shown when the learner answers incorrectly" />
      </div>
    </div>
  );
}
