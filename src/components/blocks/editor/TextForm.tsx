import { TextBlock } from "@/types/course";
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
import { FieldLabel } from "./FieldLabel";

export function TextForm({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  return (
    <div className="space-y-2">
      <FieldLabel required>Text</FieldLabel>
      <RichTextEditor value={block.text} onChange={(html) => onChange({ ...block, text: html })} placeholder="Write rich text..." />
    </div>
  );
}
