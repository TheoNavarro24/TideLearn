import { ListBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
import { FieldLabel } from "./FieldLabel";
import { Trash2 } from "lucide-react";

export function ListForm({ block, onChange }: { block: ListBlock; onChange: (b: ListBlock) => void }) {
  const updateItem = (idx: number, val: string) => {
    onChange({ ...block, items: block.items.map((it, i) => (i === idx ? val : it)) });
  };
  const addItem = () => onChange({ ...block, items: [...block.items, "New item"] });
  const removeItem = (idx: number) => onChange({ ...block, items: block.items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FieldLabel>Style</FieldLabel>
        <Select value={block.style} onValueChange={(v) => onChange({ ...block, style: v as ListBlock["style"] })}>
          <SelectTrigger>
            <SelectValue placeholder="List style" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="bulleted">Bulleted</SelectItem>
              <SelectItem value="numbered">Numbered</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <FieldLabel required>Items</FieldLabel>
        <div className="space-y-2">
          {block.items.map((it, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                <RichTextEditor value={it} onChange={(html) => updateItem(idx, html)} placeholder={`Item ${idx + 1}`} />
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="mt-2 text-muted-foreground hover:text-destructive"
                title="Remove item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={addItem}>Add item</Button>
      </div>
    </div>
  );
}
