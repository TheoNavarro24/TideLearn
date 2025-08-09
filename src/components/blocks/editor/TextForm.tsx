import { TextBlock } from "@/types/course";
import { Textarea } from "@/components/ui/textarea";

export function TextForm({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Text</label>
      <Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
    </div>
  );
}
