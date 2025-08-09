import { ListBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function ListForm({ block, onChange }: { block: ListBlock; onChange: (b: ListBlock) => void }) {
  const updateItem = (idx: number, val: string) => {
    onChange({ ...block, items: block.items.map((it, i) => (i === idx ? val : it)) });
  };
  const addItem = () => onChange({ ...block, items: [...block.items, "New item"] });
  const removeItem = (idx: number) => onChange({ ...block, items: block.items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Style</label>
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
        <label className="text-sm text-muted-foreground">Items</label>
        <div className="space-y-2">
          {block.items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <Input value={it} onChange={(e) => updateItem(idx, e.target.value)} />
              <Button variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={addItem}>Add item</Button>
      </div>
    </div>
  );
}
