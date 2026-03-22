import { TabsBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
import { FieldLabel } from "./FieldLabel";

export function TabsForm({ block, onChange }: { block: TabsBlock; onChange: (b: TabsBlock) => void }) {
  const updateItem = (idx: number, patch: Partial<TabsBlock["items"][number]>) => {
    const items = block.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...block, items });
  };
  const addItem = () => onChange({ ...block, items: [...block.items, { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), label: "New tab", content: "Content..." }] });
  const removeItem = (idx: number) => onChange({ ...block, items: block.items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {block.items.map((it, idx) => (
        <div key={it.id} className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Label</FieldLabel>
            <Input value={it.label} onChange={(e) => updateItem(idx, { label: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel>Content</FieldLabel>
            <RichTextEditor value={it.content} onChange={(html) => updateItem(idx, { content: html })} placeholder="Tab content..." />
          </div>
          <div className="sm:col-span-2">
            <Button variant="ghost" onClick={() => removeItem(idx)}>Remove tab</Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={addItem}>Add tab</Button>
    </div>
  );
}
