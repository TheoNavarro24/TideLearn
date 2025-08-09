import { AudioBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function AudioForm({ block, onChange }: { block: AudioBlock; onChange: (b: AudioBlock) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Audio URL</label>
      <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="https://..." />
      <label className="text-sm text-muted-foreground">Title (optional)</label>
      <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} />
    </div>
  );
}
