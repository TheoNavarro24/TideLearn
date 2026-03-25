import { QuizBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "./FieldLabel";
import { Trash2 } from "lucide-react";

export function QuizForm({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  const addOption = () => onChange({ ...block, options: [...block.options, ""] });

  const removeOption = (idx: number) => {
    const next = block.options.filter((_, i) => i !== idx);
    let ci = block.correctIndex;
    if (idx === ci) ci = -1;
    else if (idx < ci) ci--;
    onChange({ ...block, options: next, correctIndex: ci });
  };

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <FieldLabel required>Question</FieldLabel>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>

      {block.correctIndex === -1 && (
        <p className="text-xs text-amber-600">Select the correct answer below.</p>
      )}

      {block.options.map((opt, i) => (
        <div key={i} className="space-y-1">
          <FieldLabel required>Option {String.fromCharCode(65 + i)}</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${block.id}`}
              checked={i === block.correctIndex}
              onChange={() => onChange({ ...block, correctIndex: i })}
              className="accent-teal-600"
            />
            <Input
              className="flex-1"
              value={opt}
              onChange={(e) => {
                const next = [...block.options];
                next[i] = e.target.value;
                onChange({ ...block, options: next });
              }}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={block.options.length <= 2}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              title="Remove option"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addOption}>
        Add option
      </Button>

      {/* Feedback section */}
      <div className="border-t border-border pt-3 mt-1">
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
            <FieldLabel>Feedback message</FieldLabel>
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
