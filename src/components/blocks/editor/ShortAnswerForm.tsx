import { ShortAnswerBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "./FieldLabel";

export function ShortAnswerForm({ block, onChange }: { block: ShortAnswerBlock; onChange: (b: ShortAnswerBlock) => void }) {
  const acceptableCSV = (block.acceptable ?? []).join(", ");
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FieldLabel required>Question</FieldLabel>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      <div className="space-y-2">
        <FieldLabel required>Correct answer</FieldLabel>
        <Input value={block.answer} onChange={(e) => onChange({ ...block, answer: e.target.value })} />
      </div>
      <div className="space-y-2">
        <FieldLabel>Additional accepted answers (comma-separated)</FieldLabel>
        <Input
          value={acceptableCSV}
          onChange={(e) => onChange({
            ...block,
            acceptable: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          })}
          placeholder="e.g., color, colour, hue"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Case sensitive</p>
            <p className="text-xs text-muted-foreground">If enabled, answers must match case exactly.</p>
          </div>
          <Switch checked={!!block.caseSensitive} onCheckedChange={(v) => onChange({ ...block, caseSensitive: v })} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Trim whitespace</p>
            <p className="text-xs text-muted-foreground">Ignore leading/trailing spaces when checking.</p>
          </div>
          <Switch checked={block.trimWhitespace !== false} onCheckedChange={(v) => onChange({ ...block, trimWhitespace: v })} />
        </div>
      </div>

      {/* Feedback section */}
      <div className="border-t border-[color:hsl(var(--border))] pt-3 mt-1">
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
