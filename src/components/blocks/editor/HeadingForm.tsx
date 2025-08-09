import { HeadingBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function HeadingForm({ block, onChange }: { block: HeadingBlock; onChange: (b: HeadingBlock) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Heading</label>
      <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
    </div>
  );
}
