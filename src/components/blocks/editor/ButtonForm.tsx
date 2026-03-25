import { ButtonBlock } from "@/types/course";
import { FieldLabel } from "./FieldLabel";

type Props = { block: ButtonBlock; onChange: (b: ButtonBlock) => void };

export function ButtonForm({ block, onChange }: Props) {
  const set = <K extends keyof ButtonBlock>(k: K, v: ButtonBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel required>Label</FieldLabel>
        <input type="text" value={block.label} onChange={(e) => set("label", e.target.value)}
          placeholder="Button text" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <FieldLabel required>URL</FieldLabel>
        <input type="url" value={block.url} onChange={(e) => set("url", e.target.value)}
          placeholder="https://" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Style</label>
        <select value={block.variant} onChange={(e) => set("variant", e.target.value as ButtonBlock["variant"])}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.openInNewTab} onChange={(e) => set("openInNewTab", e.target.checked)} />
        Open in new tab
      </label>
    </div>
  );
}
