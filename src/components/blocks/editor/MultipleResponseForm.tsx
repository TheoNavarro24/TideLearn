import { MultipleResponseBlock } from "@/types/course";
import { FieldLabel } from "./FieldLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";

type Props = { block: MultipleResponseBlock; onChange: (b: MultipleResponseBlock) => void };

export function MultipleResponseForm({ block, onChange }: Props) {
  function setOption(i: number, value: string) {
    const options = [...block.options];
    options[i] = value;
    onChange({ ...block, options });
  }

  function addOption() {
    if (block.options.length >= 6) return;
    onChange({ ...block, options: [...block.options, ""] });
  }

  function removeOption(i: number) {
    if (block.options.length <= 2) return;
    const options = block.options.filter((_, idx) => idx !== i);
    const correctIndices = block.correctIndices
      .filter((ci) => ci !== i)
      .map((ci) => (ci > i ? ci - 1 : ci));
    onChange({ ...block, options, correctIndices });
  }

  function toggleCorrect(i: number) {
    const has = block.correctIndices.includes(i);
    const correctIndices = has
      ? block.correctIndices.filter((ci) => ci !== i)
      : [...block.correctIndices, i];
    onChange({ ...block, correctIndices });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Question</FieldLabel>
        <Input
          value={block.question}
          onChange={(e) => onChange({ ...block, question: e.target.value })}
          placeholder="Select all that apply..."
        />
      </div>

      <div>
        <FieldLabel required>Options (mark all correct answers)</FieldLabel>
        <div className="space-y-2">
          {block.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                checked={block.correctIndices.includes(i)}
                onCheckedChange={() => toggleCorrect(i)}
                aria-label={`Mark option ${i + 1} as correct`}
              />
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(i)}
                disabled={block.options.length <= 2}
                aria-label="Remove option"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {block.options.length < 6 && (
          <Button variant="outline" size="sm" className="mt-2" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" /> Add option
          </Button>
        )}
        {block.correctIndices.filter(ci => ci >= 0).length < 2 && (
          <p className="text-xs text-destructive mt-1">Mark at least 2 correct answers</p>
        )}
      </div>
    </div>
  );
}
