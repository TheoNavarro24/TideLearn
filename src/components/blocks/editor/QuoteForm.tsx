import { QuoteBlock } from "@/types/course";
import { Input } from "@/components/ui/input";

export function QuoteForm({ block, onChange }: { block: QuoteBlock; onChange: (b: QuoteBlock) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Quote</label>
      <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      <label className="text-sm text-muted-foreground">Cite (optional)</label>
      <Input value={block.cite ?? ''} onChange={(e) => onChange({ ...block, cite: e.target.value })} />
    </div>
  );
}
