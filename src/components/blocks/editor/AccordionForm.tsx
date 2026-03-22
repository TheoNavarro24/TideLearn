import { AccordionBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
import { FieldLabel } from "./FieldLabel";

export function AccordionForm({ block, onChange }: { block: AccordionBlock; onChange: (b: AccordionBlock) => void }) {
  const updateItem = (idx: number, patch: Partial<AccordionBlock["items"][number]>) => {
    const items = block.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...block, items });
  };
  const addItem = () => onChange({ ...block, items: [...block.items, { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), title: "New section", content: "Details..." }] });
  const removeItem = (idx: number) => onChange({ ...block, items: block.items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {block.items.map((it, idx) => (
        <div key={it.id} className="space-y-2 border-b border-border pb-3 last:border-0">
          <div className="space-y-2">
            <FieldLabel>Title</FieldLabel>
            <Input value={it.title} onChange={(e) => updateItem(idx, { title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel>Content</FieldLabel>
            <RichTextEditor value={it.content} onChange={(html) => updateItem(idx, { content: html })} placeholder="Section content..." />
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>Remove section</Button>
        </div>
      ))}
      <Button variant="secondary" onClick={addItem}>Add section</Button>
    </div>
  );
}
