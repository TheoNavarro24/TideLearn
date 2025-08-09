import { ImageBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function ImageForm({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Image URL</label>
        <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Alt text</label>
        <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
      </div>
    </div>
  );
}
