import { CalloutBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
import { FieldLabel } from "./FieldLabel";

export function CalloutForm({ block, onChange }: { block: CalloutBlock; onChange: (b: CalloutBlock) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FieldLabel required>Variant</FieldLabel>
        <Select value={block.variant} onValueChange={(v) => onChange({ ...block, variant: v as CalloutBlock["variant"] })}>
          <SelectTrigger>
            <SelectValue placeholder="Variant" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="danger">Danger</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <FieldLabel>Title (optional)</FieldLabel>
        <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </div>
      <div className="space-y-2">
        <FieldLabel required>Text</FieldLabel>
        <RichTextEditor value={block.text} onChange={(html) => onChange({ ...block, text: html })} placeholder="Callout content..." />
      </div>
    </div>
  );
}
