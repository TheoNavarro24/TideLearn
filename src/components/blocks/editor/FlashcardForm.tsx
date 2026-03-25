import { FlashcardBlock } from "@/types/course";
import { FieldLabel } from "./FieldLabel";

type Props = { block: FlashcardBlock; onChange: (b: FlashcardBlock) => void };

export function FlashcardForm({ block, onChange }: Props) {
  const set = <K extends keyof FlashcardBlock>(k: K, v: FlashcardBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel required>Front (question or term)</FieldLabel>
        <textarea value={block.front} onChange={(e) => set("front", e.target.value)}
          rows={3} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <FieldLabel required>Back (answer or definition)</FieldLabel>
        <textarea value={block.back} onChange={(e) => set("back", e.target.value)}
          rows={3} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Hint <span className="text-muted-foreground font-normal">(optional — shown before flip)</span>
        </label>
        <input type="text" value={block.hint ?? ""} onChange={(e) => set("hint", e.target.value || undefined)}
          placeholder="Give learners a nudge…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
