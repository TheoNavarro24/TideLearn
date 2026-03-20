import { QuizBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuizForm({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Question</label>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      {block.options.map((opt, i) => (
        <div key={i} className="space-y-1">
          <label className="text-sm text-muted-foreground">
            Option {String.fromCharCode(65 + i)}{i === block.correctIndex ? " ✓ Correct" : ""}
          </label>
          <div className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => {
                const next = [...block.options];
                next[i] = e.target.value;
                onChange({ ...block, options: next });
              }}
            />
            <button
              type="button"
              onClick={() => onChange({ ...block, correctIndex: i })}
              style={{
                padding: "0 10px",
                borderRadius: 6,
                border: "1.5px solid",
                borderColor: i === block.correctIndex ? "#0d9488" : "#e2e8f0",
                background: i === block.correctIndex ? "#f0fdfb" : "transparent",
                color: i === block.correctIndex ? "#0d9488" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✓
            </button>
          </div>
        </div>
      ))}

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
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Feedback message</label>
            <Textarea
              value={block.feedbackMessage ?? ""}
              onChange={(e) => onChange({ ...block, feedbackMessage: e.target.value })}
              placeholder="Explain the correct answer..."
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
}
