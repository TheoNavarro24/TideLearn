import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FillInBlankBlock } from "@/types/course";
import { uid } from "@/types/course";
import { FieldLabel } from "./FieldLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripHorizontal, Plus } from "lucide-react";
import { parseTemplate, segmentsToTemplate, type Segment } from "./fillInBlankUtils";

type Props = { block: FillInBlankBlock; onChange: (b: FillInBlankBlock) => void };

function GapChip({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `gap-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition, display: "inline-flex" };
  return (
    <span ref={setNodeRef} style={style} {...attributes}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-bg)] border border-[var(--accent-hex)] text-[var(--accent-hex)] text-xs font-semibold cursor-default mx-1"
    >
      <span {...listeners} className="cursor-grab" aria-label="Drag to reorder gap">
        <GripHorizontal className="h-3 w-3" />
      </span>
      Gap {index}
      <button onClick={onRemove} aria-label="Remove gap" className="ml-1 hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function FillInBlankForm({ block, onChange }: Props) {
  const segments = parseTemplate(block.template);
  const gapIndices = (segments.filter((s) => s.type === "gap") as Extract<Segment, { type: "gap" }>[]).map((s) => s.index);
  const gapIds = gapIndices.map((i) => `gap-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = gapIds.indexOf(active.id as string);
    const newIndex = gapIds.indexOf(over.id as string);
    const newGapOrder = arrayMove(gapIndices, oldIndex, newIndex);
    let gapCounter = 0;
    const newSegments = segments.map((s) => {
      if (s.type === "gap") {
        return { type: "gap" as const, index: newGapOrder[gapCounter++] };
      }
      return s;
    });
    onChange({ ...block, template: segmentsToTemplate(newSegments) });
  }

  function insertGap() {
    const nextIndex = gapIndices.length + 1;
    const newTemplate = block.template + `{{${nextIndex}}}`;
    const newBlanks = [...block.blanks, { id: uid(), acceptable: [""], caseSensitive: false }];
    onChange({ ...block, template: newTemplate, blanks: newBlanks });
  }

  function removeGap(gapIndex: number) {
    const newSegments = segments.filter((s) => !(s.type === "gap" && (s as Extract<Segment, { type: "gap" }>).index === gapIndex));
    let counter = 1;
    const renumbered = newSegments.map((s) => {
      if (s.type === "gap") return { type: "gap" as const, index: counter++ };
      return s;
    });
    const newBlanks = block.blanks.filter((_, i) => i !== gapIndex - 1);
    onChange({ ...block, template: segmentsToTemplate(renumbered), blanks: newBlanks });
  }

  function updateBlankAcceptable(blankIndex: number, value: string) {
    const acceptable = value.split(",").map((s) => s.trim()).filter(Boolean);
    const newBlanks = block.blanks.map((b, i) => i === blankIndex ? { ...b, acceptable } : b);
    onChange({ ...block, blanks: newBlanks });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Template</FieldLabel>
        <div className="border rounded-md p-3 bg-background min-h-[60px] flex flex-wrap items-center gap-y-1 text-sm">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={gapIds} strategy={horizontalListSortingStrategy}>
              {segments.map((seg, i) => {
                if (seg.type === "text") {
                  return (
                    <span
                      key={i}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newText = e.currentTarget.textContent ?? "";
                        const newSegs = segments.map((s, idx) =>
                          idx === i ? { type: "text" as const, value: newText } : s
                        );
                        onChange({ ...block, template: segmentsToTemplate(newSegs) });
                      }}
                      className="outline-none min-w-[4px]"
                    >
                      {seg.value}
                    </span>
                  );
                }
                return (
                  <GapChip
                    key={`gap-${seg.index}`}
                    index={seg.index}
                    onRemove={() => removeGap(seg.index)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={insertGap}>
          <Plus className="h-4 w-4 mr-1" /> Insert gap
        </Button>
        {gapIndices.length === 0 && (
          <p className="text-xs text-destructive mt-1">Template must contain at least one gap</p>
        )}
      </div>

      {block.blanks.length > 0 && (
        <div className="space-y-3">
          <FieldLabel required>Acceptable answers per gap</FieldLabel>
          {block.blanks.map((blank, i) => (
            <div key={blank.id} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Gap {i + 1}</p>
              <Input
                value={blank.acceptable.join(", ")}
                onChange={(e) => updateBlankAcceptable(i, e.target.value)}
                placeholder="answer1, answer2, ..."
              />
              {blank.acceptable.filter(Boolean).length === 0 && (
                <p className="text-xs text-destructive">Gap {i + 1} needs at least one acceptable answer</p>
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={blank.caseSensitive ?? false}
                  onChange={(e) => {
                    const newBlanks = block.blanks.map((b, idx) =>
                      idx === i ? { ...b, caseSensitive: e.target.checked } : b
                    );
                    onChange({ ...block, blanks: newBlanks });
                  }}
                />
                Case sensitive
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
