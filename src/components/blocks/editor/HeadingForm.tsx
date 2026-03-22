import { HeadingBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "./FieldLabel";

export function HeadingForm({ block, onChange }: { block: HeadingBlock; onChange: (b: HeadingBlock) => void }) {
  return (
    <div className="space-y-2">
      <FieldLabel>Heading</FieldLabel>
      <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
    </div>
  );
}
