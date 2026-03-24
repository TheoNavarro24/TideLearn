import { SortingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: SortingBlock; onChange: (b: SortingBlock) => void };

export function SortingForm({ block, onChange }: Props) {
  const addBucket = () => onChange({
    ...block,
    buckets: [...block.buckets, { id: uid(), label: `Category ${block.buckets.length + 1}` }],
  });
  const removeBucket = (bucketId: string) => {
    const remaining = block.buckets.filter(b => b.id !== bucketId);
    const fallbackId = remaining[0]?.id ?? "";
    onChange({
      ...block,
      buckets: remaining,
      items: block.items.map(item =>
        item.bucketId === bucketId ? { ...item, bucketId: fallbackId } : item
      ),
    });
  };
  const updateBucketLabel = (bucketId: string, label: string) => onChange({
    ...block,
    buckets: block.buckets.map(b => b.id === bucketId ? { ...b, label } : b),
  });

  const addItem = () => onChange({
    ...block,
    items: [...block.items, { id: uid(), text: "", bucketId: block.buckets[0]?.id ?? "" }],
  });
  const updateItem = (itemId: string, field: "text" | "bucketId", value: string) => onChange({
    ...block,
    items: block.items.map(item => item.id === itemId ? { ...item, [field]: value } : item),
  });
  const removeItem = (itemId: string) => onChange({
    ...block,
    items: block.items.filter(item => item.id !== itemId),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt</label>
        <textarea value={block.prompt} onChange={e => onChange({ ...block, prompt: e.target.value })}
          rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Buckets</p>
        <div className="space-y-2">
          {block.buckets.map(bucket => (
            <div key={bucket.id} className="flex gap-2 items-center">
              <input type="text" value={bucket.label}
                onChange={e => updateBucketLabel(bucket.id, e.target.value)}
                placeholder="Bucket label"
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
              {block.buckets.length > 2 && (
                <button onClick={() => removeBucket(bucket.id)} aria-label="Remove bucket"
                  className="text-destructive text-sm px-1">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addBucket} className="text-sm text-[var(--accent-hex)] mt-2">+ Add bucket</button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Items</p>
        <div className="space-y-2">
          {block.items.map(item => (
            <div key={item.id} className="flex gap-2 items-center">
              <input type="text" value={item.text}
                onChange={e => updateItem(item.id, "text", e.target.value)}
                placeholder="Item text"
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
              <select value={item.bucketId}
                onChange={e => updateItem(item.id, "bucketId", e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                {block.buckets.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              {block.items.length > 2 && (
                <button onClick={() => removeItem(item.id)} aria-label="Remove item"
                  className="text-destructive text-sm px-1">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addItem} className="text-sm text-[var(--accent-hex)] mt-2">+ Add item</button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.showFeedback}
          onChange={e => onChange({ ...block, showFeedback: e.target.checked })} />
        Show feedback after submit
      </label>
    </div>
  );
}
