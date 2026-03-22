import { QuoteBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "./FieldLabel";

export function QuoteForm({ block, onChange }: { block: QuoteBlock; onChange: (b: QuoteBlock) => void }) {
  return (
    <div className="space-y-2">
      <FieldLabel required>Quote</FieldLabel>
      <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      <FieldLabel>Cite (optional)</FieldLabel>
      <Input value={block.cite ?? ''} onChange={(e) => onChange({ ...block, cite: e.target.value })} />
    </div>
  );
}
