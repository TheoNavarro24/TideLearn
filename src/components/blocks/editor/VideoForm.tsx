import { VideoBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function VideoForm({ block, onChange }: { block: VideoBlock; onChange: (b: VideoBlock) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Video URL (YouTube, Vimeo, or .mp4)</label>
      <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
    </div>
  );
}
