import { CalloutBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "./FieldLabel";

export function CalloutForm({ block, onChange }: { block: CalloutBlock; onChange: (b: CalloutBlock) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FieldLabel>Variant</FieldLabel>
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
        <FieldLabel>Text</FieldLabel>
        <Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      </div>
    </div>
  );
}
