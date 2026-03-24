import { EmbedBlock } from "@/types/course";

type Props = { block: EmbedBlock; onChange: (b: EmbedBlock) => void };

export function EmbedForm({ block, onChange }: Props) {
  const set = <K extends keyof EmbedBlock>(k: K, v: EmbedBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Embed URL</label>
        <input type="url" value={block.url} onChange={(e) => set("url", e.target.value)}
          placeholder="https://" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-muted-foreground font-normal">(required for accessibility)</span>
        </label>
        <input type="text" value={block.title} onChange={(e) => set("title", e.target.value)}
          placeholder="Describe the embedded content" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Height (px)</label>
        <input type="number" min={100} max={2000} value={block.height}
          onChange={(e) => set("height", parseInt(e.target.value, 10) || 400)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
