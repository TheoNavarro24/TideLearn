import { TimelineBlock } from "@/types/course";
import { uid } from "@/types/course";
import { FieldLabel } from "./FieldLabel";

type Props = { block: TimelineBlock; onChange: (b: TimelineBlock) => void };

export function TimelineForm({ block, onChange }: Props) {
  const updateItem = (index: number, field: string, value: string) => {
    const items = block.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    onChange({ ...block, items });
  };
  const addItem = () =>
    onChange({ ...block, items: [...block.items, { id: uid(), date: "", title: "", description: "" }] });
  const removeItem = (index: number) =>
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Events</FieldLabel>
        {block.items.length < 2 && (
          <p className="text-xs text-destructive mt-1">Add at least 2 events</p>
        )}
      </div>
      {block.items.map((item, i) => (
        <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={item.date} onChange={(e) => updateItem(i, "date", e.target.value)}
              placeholder="Date or period" className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <input type="text" value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Event title" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            {block.items.length > 2 && (
              <button onClick={() => removeItem(i)} aria-label="Remove item" className="text-destructive text-sm px-2">✕</button>
            )}
          </div>
          <textarea value={item.description ?? ""} onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Description (optional)" rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
        </div>
      ))}
      <button onClick={addItem} className="text-sm text-[var(--accent-hex)]">+ Add event</button>
    </div>
  );
}
