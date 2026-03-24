import { SortingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: SortingBlock; onChange: (b: SortingBlock) => void };

export function SortingForm({ block, onChange }: Props) {
  const updateItem = (index: number, text: string) => {
    const items = block.items.map((item, i) => i === index ? { ...item, text } : item);
    onChange({ ...block, items });
  };
  const addItem = () => onChange({
    ...block,
    items: [...block.items.map((item, i) => ({ ...item, correctPosition: i })),
      { id: uid(), text: "", correctPosition: block.items.length }],
  });
  const removeItem = (index: number) => onChange({
    ...block,
    items: block.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, correctPosition: i })),
  });
  const moveItem = (from: number, to: number) => {
    const items = [...block.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    onChange({ ...block, items: items.map((item, i) => ({ ...item, correctPosition: i })) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt</label>
        <textarea value={block.prompt} onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Items (top = position 1, correct order)</p>
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={item.id} className="flex gap-2 items-center rounded-md border border-border px-3 py-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <input type="text" value={item.text} onChange={(e) => updateItem(i, e.target.value)}
                placeholder="Item text" className="flex-1 bg-transparent text-sm focus:outline-none" />
              <div className="flex gap-1">
                {i > 0 && <button onClick={() => moveItem(i, i - 1)} aria-label="Move up" className="text-muted-foreground text-xs px-1">↑</button>}
                {i < block.items.length - 1 && <button onClick={() => moveItem(i, i + 1)} aria-label="Move down" className="text-muted-foreground text-xs px-1">↓</button>}
                {block.items.length > 2 && <button onClick={() => removeItem(i)} aria-label="Remove" className="text-destructive text-xs px-1">✕</button>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="text-sm text-[--color-teal-500] mt-2">+ Add item</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.showFeedback} onChange={(e) => onChange({ ...block, showFeedback: e.target.checked })} />
        Show feedback after submit
      </label>
    </div>
  );
}
