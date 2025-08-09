import { ShortAnswerBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function ShortAnswerForm({ block, onChange }: { block: ShortAnswerBlock; onChange: (b: ShortAnswerBlock) => void }) {
  const acceptableCSV = (block.acceptable ?? []).join(", ");
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Question</label>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Correct answer</label>
        <Input value={block.answer} onChange={(e) => onChange({ ...block, answer: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Additional accepted answers (comma-separated)</label>
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
    </div>
  );
}
