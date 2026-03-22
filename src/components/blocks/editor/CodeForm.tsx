import { CodeBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "./FieldLabel";

export function CodeForm({ block, onChange }: { block: CodeBlock; onChange: (b: CodeBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <FieldLabel required>Language</FieldLabel>
        <Input value={block.language} onChange={(e) => onChange({ ...block, language: e.target.value })} placeholder="ts" />
      </div>
      <div className="space-y-2">
        <FieldLabel required>Code</FieldLabel>
        <Textarea
          value={block.code}
          onChange={(e) => onChange({ ...block, code: e.target.value })}
          className="font-mono"
          rows={6}
        />
      </div>
    </div>
  );
}
