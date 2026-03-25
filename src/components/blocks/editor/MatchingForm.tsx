import { MatchingBlock } from "@/types/course";
import { uid } from "@/types/course";
import { FieldLabel } from "./FieldLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

type Props = { block: MatchingBlock; onChange: (b: MatchingBlock) => void };

export function MatchingForm({ block, onChange }: Props) {
  function setLeft(i: number, label: string) {
    const left = block.left.map((item, idx) => idx === i ? { ...item, label } : item);
    onChange({ ...block, left });
  }

  function setRight(i: number, label: string) {
    const right = block.right.map((item, idx) => idx === i ? { ...item, label } : item);
    onChange({ ...block, right });
  }

  function addPair() {
    const leftId = uid();
    const rightId = uid();
    onChange({
      ...block,
      left: [...block.left, { id: leftId, label: "" }],
      right: [...block.right, { id: rightId, label: "" }],
      pairs: [...block.pairs, { leftId, rightId }],
    });
  }

  function removePair(i: number) {
    if (block.left.length <= 2) return;
    const leftId = block.left[i]?.id;
    const left = block.left.filter((_, idx) => idx !== i);
    const right = block.right.filter((_, idx) => idx !== i);
    const pairs = block.pairs.filter((p) => p.leftId !== leftId);
    onChange({ ...block, left, right, pairs });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Prompt</FieldLabel>
        <Input
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          placeholder="Match each item to its pair."
        />
      </div>

      <div>
        <FieldLabel required>Pairs (left ↔ right)</FieldLabel>
        <p className="text-xs text-muted-foreground mb-2">Each row is a correct pair. The right column will be shuffled for learners.</p>
        <div className="space-y-2">
          {block.left.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={block.left[i]?.label ?? ""}
                onChange={(e) => setLeft(i, e.target.value)}
                placeholder={`Left ${i + 1}`}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">↔</span>
              <Input
                value={block.right[i]?.label ?? ""}
                onChange={(e) => setRight(i, e.target.value)}
                placeholder={`Right ${i + 1}`}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePair(i)}
                disabled={block.left.length <= 2}
                aria-label={`Remove pair ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={addPair}>
          <Plus className="h-4 w-4 mr-1" /> Add pair
        </Button>
        {block.left.length < 2 && (
          <p className="text-xs text-destructive mt-1">Add at least 2 items to each column</p>
        )}
        {block.pairs.length < block.left.length && (
          <p className="text-xs text-destructive mt-1">All left-column items must be matched</p>
        )}
      </div>
    </div>
  );
}
