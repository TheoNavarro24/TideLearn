import { TrueFalseBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

      {/* Feedback section */}
      <div style={{ borderTop: "1px solid #e0fdf4", paddingTop: 12, marginTop: 4 }}>
        <div className="flex items-center gap-2 mb-2">
          <Switch
            id={`feedback-${block.id}`}
            checked={block.showFeedback ?? false}
            onCheckedChange={(v) => onChange({ ...block, showFeedback: v })}
          />
          <Label htmlFor={`feedback-${block.id}`} className="text-sm text-muted-foreground">
            Show feedback after answer
          </Label>
        </div>
        {block.showFeedback && (
          <div className="grid gap-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Correct feedback</label>
              <Input
                value={block.feedbackCorrect ?? ""}
                onChange={(e) => onChange({ ...block, feedbackCorrect: e.target.value })}
                placeholder="Great job!"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Incorrect feedback</label>
              <Input
                value={block.feedbackIncorrect ?? ""}
                onChange={(e) => onChange({ ...block, feedbackIncorrect: e.target.value })}
                placeholder="Not quite — the answer is..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
