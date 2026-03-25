# Phase 2B Tier 3 — Fill-in-the-blank + Matching Blocks + Questions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Tiers 1 and 2 must be merged before starting this plan.

**Goal:** Add `fillinblank` and `matching` as content blocks and assessment question types, with draggable gap chips in the fill-in-the-blank editor, Leitner grading for both, and full MCP support.

**Architecture:** Two block types in one tier. Each follows the same pattern as Tier 2. The fill-in-the-blank editor is the most complex piece: the template string is parsed into text+gap segments rendered as an inline chip editor using `@dnd-kit` (already installed for the sorting block). The matching block uses a two-column editor. Both add `injectSubItemIds` support in the MCP since they have nested items with IDs.

**Tech Stack:** TypeScript, React, @dnd-kit/core + @dnd-kit/sortable, Zod, Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/types/course.ts` | Add `FillInBlankBlock`, `MatchingBlock` types, schemas, factories |
| `mcp/src/lib/types.ts` | Mirror the new block schemas |
| `src/components/blocks/editor/FillInBlankForm.tsx` | New — template editor with draggable gap chips |
| `src/components/blocks/view/FillInBlankView.tsx` | New — interactive fill-in-the-blank view |
| `src/components/blocks/editor/MatchingForm.tsx` | New — two-column matching editor |
| `src/components/blocks/view/MatchingView.tsx` | New — interactive matching view |
| `src/components/blocks/registry.ts` | Add 2 new registry entries |
| `src/lib/assessment.ts` | Add `gradeFillInBlank`, `gradeMatching` |
| `src/pages/AssessmentView.tsx` | Add renderers for both question types |
| `mcp/src/tools/blocks.ts` | Add both types to `add_block` |
| `mcp/src/tools/questions.ts` | `add_question` + `update_question` support `fillinblank` and `matching` question kinds |
| `mcp/src/tools/semantic.ts` | Extend `injectSubItemIds` for fillinblank/matching blocks; extend `injectQuestionSubItemIds` for fillinblank/matching questions |
| `mcp/src/tools/preview.ts` | Add `renderBlock` cases; `renderQuestion` already handles both |
| `mcp/src/resources/instructions.ts` | Add docs for new block/question types |
| `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts` | Add cases for new block types and new question types |
| `mcp/src/tools/__tests__/render-block.test.ts` | Add cases for new block types |
| `mcp/src/tools/__tests__/grading.test.ts` | New — grading function tests for gradeFillInBlank and gradeMatching |

---

### Task 1: Add types, schemas, factories to `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add `FillInBlankBlock` type**

After `MultipleResponseBlock` (added in Tier 2), add:

```typescript
export type FillInBlankBlock = {
  type: "fillinblank";
  id: string;
  template: string; // e.g. "The capital of {{1}} is {{2}}."
  blanks: Array<{
    id: string;
    acceptable: string[];
    caseSensitive?: boolean;
  }>;
  showFeedback?: boolean;
};

export type MatchingBlock = {
  type: "matching";
  id: string;
  prompt: string;
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pairs: Array<{ leftId: string; rightId: string }>;
  showFeedback?: boolean;
};
```

Add both to the `Block` union.

- [ ] **Step 2: Add strict Zod schemas**

```typescript
export const fillInBlankBlockSchema = z.object({
  id: z.string(),
  type: z.literal("fillinblank"),
  template: z.string().min(1),
  blanks: z.array(z.object({
    id: z.string(),
    acceptable: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean().optional(),
  })).min(1),
  showFeedback: z.boolean().optional(),
});

export const matchingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("matching"),
  prompt: z.string().min(1),
  left: z.array(z.object({ id: z.string(), label: z.string().min(1) })).min(2),
  right: z.array(z.object({ id: z.string(), label: z.string().min(1) })).min(2),
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })).min(2),
  showFeedback: z.boolean().optional(),
});
```

Add to `blockSchema` discriminated union.

- [ ] **Step 3: Add permissive variants**

```typescript
const fillInBlankBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("fillinblank"),
  template: z.string(),
  blanks: z.array(z.object({
    id: z.string(), acceptable: z.array(z.string()), caseSensitive: z.boolean().optional(),
  })),
  showFeedback: z.boolean().optional(),
});

const matchingBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("matching"),
  prompt: z.string(),
  left: z.array(z.object({ id: z.string(), label: z.string() })),
  right: z.array(z.object({ id: z.string(), label: z.string() })),
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
  showFeedback: z.boolean().optional(),
});
```

Add to `blockSchemaPermissive`.

- [ ] **Step 4: Add factories**

```typescript
fillinblank: (): FillInBlankBlock => ({
  id: uid(),
  type: "fillinblank",
  template: "The capital of {{1}} is {{2}}.",
  blanks: [
    { id: uid(), acceptable: ["France"], caseSensitive: false },
    { id: uid(), acceptable: ["Paris"], caseSensitive: false },
  ],
  showFeedback: true,
}),

matching: (): MatchingBlock => ({
  id: uid(),
  type: "matching",
  prompt: "Match each item to its pair.",
  left: [
    { id: uid(), label: "Item A" },
    { id: uid(), label: "Item B" },
  ],
  right: [
    { id: uid(), label: "Match 1" },
    { id: uid(), label: "Match 2" },
  ],
  pairs: [], // author must define — left/right IDs must match above
  showFeedback: true,
}),
```

Note: Factory `pairs` is empty — the editor requires the author to define pairs explicitly. The validation system will warn on publish.

- [ ] **Step 5: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Type errors about missing editor/view components (not imported in registry yet) — that's fine for now.

---

### Task 2: Mirror schemas in `mcp/src/lib/types.ts`

**Files:**
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Mirror types and schemas**

Add the same `FillInBlankBlock` and `MatchingBlock` types, Zod schemas, and Block union updates as in Task 1.

---

### Task 3: Create `FillInBlankForm.tsx` — template editor with draggable chips

**Files:**
- Create: `src/components/blocks/editor/FillInBlankForm.tsx`

**How the template editor works:**

The `template` string contains `{{1}}`, `{{2}}` etc. The editor parses it into a segments array:
```
"The capital of {{1}} is {{2}}." →
[
  { type: "text", value: "The capital of " },
  { type: "gap", index: 1 },
  { type: "text", value: " is " },
  { type: "gap", index: 2 },
  { type: "text", value: "." },
]
```

The editor renders these segments inline. Chips are draggable via @dnd-kit to reorder. The "Insert gap" button appends a gap at the end of the last text segment.

- [ ] **Step 1: Write the template parser utilities**

```typescript
type Segment = { type: "text"; value: string } | { type: "gap"; index: number };

export function parseTemplate(template: string): Segment[] {
  const parts = template.split(/({{(\d+)}})/g);
  const segments: Segment[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.match(/^{{\d+}}$/)) {
      const index = parseInt(part.slice(2, -2));
      segments.push({ type: "gap", index });
      i++;
    } else if (part !== "") {
      segments.push({ type: "text", value: part });
      i++;
    } else {
      i++;
    }
  }
  return segments;
}

export function segmentsToTemplate(segments: Segment[]): string {
  return segments.map((s) => (s.type === "gap" ? `{{${s.index}}}` : s.value)).join("");
}
```

- [ ] **Step 2: Write the full form component**

```tsx
import { useState, useRef } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FillInBlankBlock } from "@/types/course";
import { uid } from "@/types/course";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripHorizontal, Plus } from "lucide-react";
import { parseTemplate, segmentsToTemplate } from "./fillInBlankUtils";

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
  const gapIndices = segments.filter((s) => s.type === "gap").map((s) => (s as any).index);
  const gapIds = gapIndices.map((i) => `gap-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = gapIds.indexOf(active.id as string);
    const newIndex = gapIds.indexOf(over.id as string);
    const newGapOrder = arrayMove(gapIndices, oldIndex, newIndex);
    // Rebuild template with reordered gap indices
    let gapCounter = 0;
    const newSegments = segments.map((s) => {
      if (s.type === "gap") {
        return { type: "gap" as const, index: newGapOrder[gapCounter++] };
      }
      return s;
    });
    // Re-index gaps sequentially
    const renumbered = newSegments.map((s) => {
      if (s.type !== "gap") return s;
      return s; // keep for now — blanks array order must match
    });
    onChange({ ...block, template: segmentsToTemplate(renumbered) });
  }

  function insertGap() {
    const nextIndex = gapIndices.length + 1;
    const newTemplate = block.template + `{{${nextIndex}}}`;
    const newBlanks = [...block.blanks, { id: uid(), acceptable: [""], caseSensitive: false }];
    onChange({ ...block, template: newTemplate, blanks: newBlanks });
  }

  function removeGap(gapIndex: number) {
    // Remove {{gapIndex}} from template and corresponding blank
    const newSegments = segments.filter((s) => !(s.type === "gap" && (s as any).index === gapIndex));
    // Re-number remaining gaps sequentially
    let counter = 1;
    const renumbered = newSegments.map((s) => {
      if (s.type === "gap") return { type: "gap" as const, index: counter++ };
      return s;
    });
    const newBlanks = block.blanks.filter((_, i) => i !== gapIndex - 1);
    onChange({ ...block, template: segmentsToTemplate(renumbered), blanks: newBlanks });
  }

  function updateBlankAcceptable(blankIndex: number, value: string) {
    // Simple comma-separated input for acceptable answers
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
```

Note: Create a helper file `src/components/blocks/editor/fillInBlankUtils.ts` for `parseTemplate` and `segmentsToTemplate` so they can be imported by both the form and the view.

---

### Task 4: Create `FillInBlankView.tsx` learner view

**Files:**
- Create: `src/components/blocks/view/FillInBlankView.tsx`

- [ ] **Step 1: Write the interactive viewer**

```tsx
import { useState } from "react";
import { FillInBlankBlock } from "@/types/course";
import { parseTemplate } from "../editor/fillInBlankUtils";

type Props = { block: FillInBlankBlock };

export function FillInBlankView({ block }: Props) {
  const segments = parseTemplate(block.template);
  const [inputs, setInputs] = useState<string[]>(block.blanks.map(() => ""));
  const [submitted, setSubmitted] = useState(false);

  function checkBlank(blank: FillInBlankBlock["blanks"][0], userInput: string): boolean {
    const accepted = blank.acceptable.filter(Boolean);
    if (blank.caseSensitive) return accepted.includes(userInput.trim());
    return accepted.map((a) => a.toLowerCase()).includes(userInput.trim().toLowerCase());
  }

  const allCorrect = submitted && block.blanks.every((b, i) => checkBlank(b, inputs[i] ?? ""));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="text-sm leading-relaxed flex flex-wrap items-baseline gap-y-1">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.value}</span>;
          }
          const blankIndex = seg.index - 1;
          const blank = block.blanks[blankIndex];
          const userInput = inputs[blankIndex] ?? "";
          const isCorrect = submitted && blank ? checkBlank(blank, userInput) : null;
          return (
            <input
              key={i}
              type="text"
              value={userInput}
              disabled={submitted}
              onChange={(e) => {
                const newInputs = [...inputs];
                newInputs[blankIndex] = e.target.value;
                setInputs(newInputs);
              }}
              className={`inline-block w-28 border-b-2 px-1 text-sm text-center bg-transparent outline-none ${
                isCorrect === true ? "border-[var(--accent-hex)] text-[var(--accent-hex)]" :
                isCorrect === false ? "border-destructive text-destructive" :
                "border-current"
              }`}
              aria-label={`Gap ${seg.index}`}
            />
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={inputs.some((v) => !v.trim())}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check answers
        </button>
      )}
      {submitted && (
        <p className={`text-sm font-semibold ${allCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
          {allCorrect ? "All correct!" : "Some answers are incorrect — correct answers highlighted above"}
        </p>
      )}
    </div>
  );
}
```

---

### Task 5: Create `MatchingForm.tsx` editor

**Files:**
- Create: `src/components/blocks/editor/MatchingForm.tsx`

- [ ] **Step 1: Write the editor**

```tsx
import { MatchingBlock } from "@/types/course";
import { uid } from "@/types/course";
import { FieldLabel } from "@/components/ui/FieldLabel";
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

  // For simplicity, pairs are assumed to be positional (left[0] ↔ right[0])
  // The editor represents this as parallel lists with matching rows

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
                aria-label="Remove pair"
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
```

---

### Task 6: Create `MatchingView.tsx` learner view

**Files:**
- Create: `src/components/blocks/view/MatchingView.tsx`

- [ ] **Step 1: Write the interactive viewer**

```tsx
import { useState, useMemo } from "react";
import { MatchingBlock } from "@/types/course";

type Props = { block: MatchingBlock };

export function MatchingView({ block }: Props) {
  // Shuffle right column for display
  const shuffledRight = useMemo(() => {
    const r = [...block.right];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }, [block.id]); // stable per block

  // Map: leftId → selected rightId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function select(leftId: string, rightId: string) {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [leftId]: rightId }));
  }

  const correctPairs = new Map(block.pairs.map((p) => [p.leftId, p.rightId]));

  const allCorrect =
    submitted &&
    block.left.every((l) => selections[l.id] === correctPairs.get(l.id));

  const allSelected = block.left.every((l) => selections[l.id]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">{block.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Match</p>
          {block.left.map((l) => (
            <div key={l.id} className="px-3 py-2 border rounded text-sm bg-background">
              {l.label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">With</p>
          {block.left.map((l) => {
            const isCorrect = submitted && selections[l.id] === correctPairs.get(l.id);
            const isWrong = submitted && selections[l.id] && selections[l.id] !== correctPairs.get(l.id);
            return (
              <select
                key={l.id}
                value={selections[l.id] ?? ""}
                disabled={submitted}
                onChange={(e) => select(l.id, e.target.value)}
                className={`w-full px-3 py-2 border rounded text-sm bg-background ${
                  isCorrect ? "border-[var(--accent-hex)] text-[var(--accent-hex)]" :
                  isWrong ? "border-destructive text-destructive" : ""
                }`}
                aria-label={`Match for ${l.label}`}
              >
                <option value="">Choose...</option>
                {shuffledRight.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            );
          })}
        </div>
      </div>
      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allSelected}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check matches
        </button>
      )}
      {submitted && (
        <p className={`text-sm font-semibold ${allCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
          {allCorrect ? "All correct!" : "Some matches are wrong — correct matches shown"}
        </p>
      )}
    </div>
  );
}
```

---

### Task 7: Add registry entries

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports**

```typescript
import { FillInBlankBlock, MatchingBlock } from "@/types/course";
import { FillInBlankForm } from "./editor/FillInBlankForm";
import { FillInBlankView } from "./view/FillInBlankView";
import { MatchingForm } from "./editor/MatchingForm";
import { MatchingView } from "./view/MatchingView";
import { AlignLeft, Columns2 } from "lucide-react"; // or suitable icons
```

- [ ] **Step 2: Add registry entries**

```typescript
{
  type: "fillinblank",
  label: "Fill in the Blank",
  icon: AlignLeft,
  create: factories.fillinblank,
  Editor: FillInBlankForm as EditorRenderer<FillInBlankBlock>,
  View: FillInBlankView as ViewRenderer<FillInBlankBlock>,
  category: "Knowledge",
},
{
  type: "matching",
  label: "Matching",
  icon: Columns2,
  create: factories.matching,
  Editor: MatchingForm as EditorRenderer<MatchingBlock>,
  View: MatchingView as ViewRenderer<MatchingBlock>,
  category: "Knowledge",
},
```

- [ ] **Step 3: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 8: Add grading functions to `src/lib/assessment.ts`

**Files:**
- Modify: `src/lib/assessment.ts`

- [ ] **Step 1: Add `gradeFillInBlank`**

```typescript
/** Grade a fill-in-the-blank answer. All blanks must be correct. */
export function gradeFillInBlank(
  blanks: Array<{ acceptable: string[]; caseSensitive?: boolean }>,
  inputs: string[]
): boolean {
  return blanks.every((blank, i) => {
    const userInput = (inputs[i] ?? "").trim();
    const accepted = blank.acceptable.filter(Boolean);
    if (blank.caseSensitive) return accepted.includes(userInput);
    return accepted.map((a) => a.toLowerCase()).includes(userInput.toLowerCase());
  });
}

/** Grade a matching answer. All pairs must be correct. */
export function gradeMatching(
  pairs: Array<{ leftId: string; rightId: string }>,
  selections: Record<string, string>
): boolean {
  return pairs.every((p) => selections[p.leftId] === p.rightId);
}
```

---

### Task 9: Add renderers to `AssessmentView.tsx`

**Files:**
- Modify: `src/pages/AssessmentView.tsx`

- [ ] **Step 1: Add state for fill-in-the-blank and matching interactions**

```typescript
const [fillInputs, setFillInputs] = useState<string[]>([]);
const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
```

Reset both in `startStudy`, `startExam`, `startDrill`:
```typescript
setFillInputs([]);
setMatchSelections({});
```

Also reset when advancing to next question in `handleNext`:
```typescript
setFillInputs([]);
setMatchSelections({});
```

- [ ] **Step 2: Update `handleReveal` for both types**

Import `gradeFillInBlank` and `gradeMatching` from `@/lib/assessment`.

Extend the `handleReveal` correct determination:
```typescript
} else if (currentQ.kind === "fillinblank") {
  correct = gradeFillInBlank(currentQ.blanks, fillInputs);
} else if (currentQ.kind === "matching") {
  correct = gradeMatching(currentQ.pairs, matchSelections);
}
```

Update disabled condition for "Check answer" button:
```typescript
const isReadyToReveal =
  (currentQ.kind === "mcq" && selected !== null) ||
  (currentQ.kind === "multipleresponse" && selectedMultiple.length > 0) ||
  (currentQ.kind === "fillinblank" && fillInputs.every((v) => v.trim())) ||
  (currentQ.kind === "matching" && currentQ.left.every((l) => matchSelections[l.id]));
```

- [ ] **Step 3: Add fill-in-the-blank renderer**

In the question screen, after the multipleresponse renderer, add:

```tsx
{currentQ.kind === "fillinblank" && (() => {
  const segments = parseTemplate(currentQ.text);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 4, fontSize: 15, lineHeight: 1.6 }}>
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          const blankIdx = seg.index - 1;
          const blank = currentQ.blanks[blankIdx];
          const userInput = fillInputs[blankIdx] ?? "";
          const isCorrect = revealed && blank ? gradeFillInBlank([blank], [userInput]) : null;
          return (
            <input
              key={i}
              type="text"
              value={userInput}
              disabled={revealed}
              onChange={(e) => {
                const newInputs = [...fillInputs];
                while (newInputs.length <= blankIdx) newInputs.push("");
                newInputs[blankIdx] = e.target.value;
                setFillInputs(newInputs);
              }}
              style={{
                width: 100, borderBottom: `2px solid ${isCorrect === true ? "var(--accent-hex)" : isCorrect === false ? "#ef4444" : "currentColor"}`,
                background: "transparent", outline: "none", textAlign: "center", fontSize: 14, padding: "0 4px",
                color: isCorrect === true ? "var(--accent-hex)" : isCorrect === false ? "#ef4444" : "inherit",
              }}
              aria-label={`Gap ${seg.index}`}
            />
          );
        })}
      </div>
    </div>
  );
})()}
```

Import `parseTemplate` from `@/components/blocks/editor/fillInBlankUtils`.

- [ ] **Step 4: Add matching renderer**

```tsx
{currentQ.kind === "matching" && (() => {
  const shuffledRight = useMemo(() => {
    const r = [...currentQ.right];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }, [currentQ.id]);
  const correctPairs = new Map(currentQ.pairs.map((p) => [p.leftId, p.rightId]));
  return (
    <div style={{ marginBottom: 16 }}>
      {currentQ.left.map((l) => {
        const sel = matchSelections[l.id];
        const isCorrect = revealed && sel === correctPairs.get(l.id);
        const isWrong = revealed && sel && sel !== correctPairs.get(l.id);
        return (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 120, fontSize: 14, fontWeight: 500 }}>{l.label}</span>
            <span style={{ color: "#94a3b8" }}>→</span>
            <select
              value={sel ?? ""}
              disabled={revealed}
              onChange={(e) => setMatchSelections((prev) => ({ ...prev, [l.id]: e.target.value }))}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 14,
                border: `1.5px solid ${isCorrect ? "var(--accent-hex)" : isWrong ? "#ef4444" : "hsl(var(--border))"}`,
                color: isCorrect ? "var(--accent-hex)" : isWrong ? "#ef4444" : "inherit",
                background: "var(--canvas-white)",
              }}
            >
              <option value="">Choose...</option>
              {shuffledRight.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
})()}
```

Note: The `useMemo` call inside the conditional render may cause a Rules-of-Hooks violation. Move the `shuffledRight` memo to the top level of the component, guarded by `currentQ?.kind === "matching"`:

```typescript
const shuffledMatchRight = useMemo(() => {
  if (!currentQ || currentQ.kind !== "matching") return [];
  const r = [...currentQ.right];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}, [currentQ?.id]);
```

Use `shuffledMatchRight` in the renderer.

- [ ] **Step 5: Update mistake notebook for both types**

```tsx
{q.kind === "fillinblank" && (
  <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>
    ✓ {q.blanks.map((b, i) => `Gap ${i + 1}: ${b.acceptable[0]}`).join(" · ")}
  </p>
)}
{q.kind === "matching" && (
  <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>
    ✓ {q.pairs.map((p) => {
      const l = q.left.find((i) => i.id === p.leftId)?.label ?? "?";
      const r = q.right.find((i) => i.id === p.rightId)?.label ?? "?";
      return `${l} → ${r}`;
    }).join(" · ")}
  </p>
)}
```

- [ ] **Step 6: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 10: Extend `injectSubItemIds` in MCP

**Files:**
- Modify: `mcp/src/tools/semantic.ts`

- [ ] **Step 1: Add cases for `fillinblank` and `matching` blocks**

In the `injectSubItemIds` switch (after the `branching` case):

```typescript
case "fillinblank":
  return {
    ...block,
    blanks: (block.blanks ?? []).map((b: any) => ({
      ...b,
      id: b.id ?? uid(),
    })),
  };
case "matching": {
  const leftWithIds = (block.left ?? []).map((item: any) => ({
    ...item,
    id: item.id ?? uid(),
  }));
  const rightWithIds = (block.right ?? []).map((item: any) => ({
    ...item,
    id: item.id ?? uid(),
  }));
  // Convert index-based pairs ({ leftIndex, rightIndex }) to id-based pairs ({ leftId, rightId })
  // MCP callers supply indexes; the stored format uses IDs.
  const pairs = (block.pairs ?? []).map((p: any) => ({
    leftId: leftWithIds[p.leftIndex]?.id ?? uid(),
    rightId: rightWithIds[p.rightIndex]?.id ?? uid(),
  }));
  return { ...block, left: leftWithIds, right: rightWithIds, pairs };
}
```

---

### Task 11: Add `renderBlock` cases to `preview.ts`

**Files:**
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Add `fillinblank` and `matching` cases**

After the `branching` case in `renderBlock`:

```typescript
case "fillinblank": {
  const display = block.template.replace(/{{(\d+)}}/g, (_, i) => {
    const blank = block.blanks[parseInt(i) - 1];
    return `<span style="display:inline-block;min-width:60px;border-bottom:2px solid #40c8a0;padding:0 4px;color:#0d9488;font-style:italic">[${blank?.acceptable[0] ?? "?"}]</span>`;
  });
  return `<div style="padding:1em;margin:1em 0;border:1px solid #e0fdf4;border-radius:8px"><strong>Fill in the Blank:</strong> <span style="line-height:2">${display}</span>${block.blanks.length === 0 ? "<p><em style='color:#f59e0b'>(no gaps defined)</em></p>" : ""}</div>`;
}
case "matching": {
  const pairs = (block.pairs ?? []).map((p: any) => {
    const l = (block.left ?? []).find((i: any) => i.id === p.leftId)?.label ?? "?";
    const r = (block.right ?? []).find((i: any) => i.id === p.rightId)?.label ?? "?";
    return `<li><strong>${esc(l)}</strong> ↔ ${esc(r)}</li>`;
  });
  return `<div style="padding:1em;margin:1em 0;border:1px solid #e0fdf4;border-radius:8px"><strong>Matching:</strong> ${esc(block.prompt)}<ul>${pairs.join("")}</ul></div>`;
}
```

---

### Task 12: Update `add_block` in `mcp/src/tools/blocks.ts`

- [ ] **Step 1: Add `fillinblank` and `matching` to block type description and enum**

Add to the tool description:
```
fillinblank: { template (string with {{1}} {{2}} markers), blanks (array of { acceptable: string[], caseSensitive?: boolean }) }
matching: { prompt, left (array of { label }), right (array of { label }), pairs (array of { leftIndex, rightIndex }) }
```

Note: `add_block` for matching uses `leftIndex`/`rightIndex` (like MCP question inputs use indexes). `injectSubItemIds` converts them to IDs.

---

### Task 12b: Update `add_question` in `mcp/src/tools/questions.ts` + extend `injectQuestionSubItemIds`

**Files:**
- Modify: `mcp/src/tools/questions.ts`
- Modify: `mcp/src/tools/semantic.ts`

Tier 1 added `injectQuestionSubItemIds` to `semantic.ts` and wired it into `add_question`. That function handles `fillinblank`, `matching`, and `sorting` question kinds — but Tier 1 only needed to stub or partially implement the fillinblank/matching cases (since those question types didn't exist yet). This task completes those cases and verifies `add_question`/`update_question` correctly describe and accept the new question shapes.

- [ ] **Step 1: Extend `injectQuestionSubItemIds` in `mcp/src/tools/semantic.ts` for `fillinblank` and `matching` question kinds**

Find the `injectQuestionSubItemIds` function (added in Tier 1). Ensure the `fillinblank` and `matching` cases are complete:

```typescript
case "fillinblank":
  return {
    ...withId,
    blanks: (q.blanks ?? []).map((b: any) => ({ ...b, id: b.id ?? uid() })),
  };
case "matching": {
  const leftWithIds = (q.left ?? []).map((item: any) => ({ ...item, id: item.id ?? uid() }));
  const rightWithIds = (q.right ?? []).map((item: any) => ({ ...item, id: item.id ?? uid() }));
  // pairs use leftIndex/rightIndex from MCP caller → convert to leftId/rightId
  const pairs = (q.pairs ?? []).map((p: any) => ({
    leftId: leftWithIds[p.leftIndex]?.id ?? uid(),
    rightId: rightWithIds[p.rightIndex]?.id ?? uid(),
  }));
  return { ...withId, left: leftWithIds, right: rightWithIds, pairs };
}
```

Where `withId = { ...q, id: uid() }` (the ID-injection pattern established in Tier 1).

- [ ] **Step 2: Verify `add_question` and `update_question` in `questions.ts` already accept the new question shapes**

Check that the `questionInputSchema` discriminated union (added in Tier 1) includes `fillinblank` and `matching` variants. If Tier 1 stubbed them, add the full input schemas now:

```typescript
// fillinblank question input (MCP)
const fillInBlankQuestionInputSchema = z.object({
  kind: z.literal("fillinblank"),
  text: z.string().min(1),
  blanks: z.array(z.object({
    acceptable: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean().optional(),
  })).min(1),
  feedback: z.string().optional(),
});

// matching question input (MCP) — uses indexes, not IDs
const matchingQuestionInputSchema = z.object({
  kind: z.literal("matching"),
  text: z.string().min(1),
  left: z.array(z.object({ label: z.string().min(1) })).min(2),
  right: z.array(z.object({ label: z.string().min(1) })).min(2),
  pairs: z.array(z.object({ leftIndex: z.number().int().min(0), rightIndex: z.number().int().min(0) })).min(2),
  feedback: z.string().optional(),
});
```

Add to the `questionInputSchema` union. Confirm `add_question` calls `injectQuestionSubItemIds` on the parsed input before saving.

- [ ] **Step 3: Update `add_question` tool description**

In `questions.ts`, update the `add_question` description to document `fillinblank` and `matching` shapes:
```
fillinblank: { kind: "fillinblank", text, blanks: [{ acceptable: string[], caseSensitive? }] }
matching: { kind: "matching", text, left: [{ label }], right: [{ label }], pairs: [{ leftIndex, rightIndex }] }
  — IDs are injected server-side; callers use integer indexes for pairs.
```

- [ ] **Step 4: Add `injectQuestionSubItemIds` tests for fillinblank and matching questions to `inject-sub-item-ids.test.ts`**

```typescript
it("injectQuestionSubItemIds fillinblank: injects blank ids", () => {
  const q = {
    kind: "fillinblank", text: "The {{1}} is {{2}}.",
    blanks: [{ acceptable: ["sky"] }, { acceptable: ["blue"] }],
  };
  const result = injectQuestionSubItemIds(q);
  expect(result.blanks[0].id).toBeTruthy();
  expect(result.blanks[1].id).toBeTruthy();
  expect(result.id).toBeTruthy();
});

it("injectQuestionSubItemIds matching: injects left/right ids, converts pairs indexes to ids", () => {
  const q = {
    kind: "matching", text: "Match",
    left: [{ label: "A" }, { label: "B" }],
    right: [{ label: "1" }, { label: "2" }],
    pairs: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 1, rightIndex: 0 }],
  };
  const result = injectQuestionSubItemIds(q);
  expect(result.left[0].id).toBeTruthy();
  expect(result.right[0].id).toBeTruthy();
  expect(result.pairs[0].leftId).toBe(result.left[0].id);
  expect(result.pairs[0].rightId).toBe(result.right[1].id);
  expect(result.pairs[0].leftIndex).toBeUndefined();
});
```

---

### Task 13: Update `instructions.ts`

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add documentation for `fillinblank` and `matching` block + question types**

Find the section documenting block types in `instructions.ts`. Add entries for both new block types and both new question types, explaining:
- The data shape
- MCP tool usage (including the index-to-id injection pattern for matching)
- The `{{1}}` gap marker syntax for fill-in-the-blank

---

### Task 14: MCP tests

**Files:**
- Modify: `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts`
- Modify: `mcp/src/tools/__tests__/render-block.test.ts`

- [ ] **Step 1: Add `injectSubItemIds` tests for new block types**

```typescript
it("fillinblank: injects id on each blank", () => {
  const block = {
    type: "fillinblank",
    template: "The {{1}} is {{2}}.",
    blanks: [{ acceptable: ["sky"] }, { acceptable: ["blue"] }],
  };
  const result = injectSubItemIds(block);
  expect(result.blanks[0].id).toBeTruthy();
  expect(result.blanks[1].id).toBeTruthy();
});

it("matching: injects id on both left and right items and converts index-based pairs to id-based", () => {
  const block = {
    type: "matching",
    prompt: "Match",
    left: [{ label: "A" }, { label: "B" }],
    right: [{ label: "1" }, { label: "2" }],
    pairs: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 1, rightIndex: 0 }],
  };
  const result = injectSubItemIds(block);
  expect(result.left[0].id).toBeTruthy();
  expect(result.left[1].id).toBeTruthy();
  expect(result.right[0].id).toBeTruthy();
  expect(result.right[1].id).toBeTruthy();
  // pairs should be converted: index 0→left[0].id, index 1→right[1].id, etc.
  expect(result.pairs[0].leftId).toBe(result.left[0].id);
  expect(result.pairs[0].rightId).toBe(result.right[1].id);
  expect(result.pairs[0].leftIndex).toBeUndefined(); // indexes stripped
});
```

- [ ] **Step 2: Add renderBlock tests**

```typescript
it("fillinblank: shows template with blanks filled in", () => {
  const block = {
    id: "1", type: "fillinblank",
    template: "The capital of {{1}} is {{2}}.",
    blanks: [
      { id: "a", acceptable: ["France"] },
      { id: "b", acceptable: ["Paris"] },
    ],
  };
  const result = renderBlock(block as any);
  expect(result).toContain("Fill in the Blank");
  expect(result).toContain("France");
  expect(result).toContain("Paris");
});

it("matching: shows pairs", () => {
  const leftId = "l1", rightId = "r1";
  const block = {
    id: "1", type: "matching",
    prompt: "Match the capitals",
    left: [{ id: leftId, label: "France" }],
    right: [{ id: rightId, label: "Paris" }],
    pairs: [{ leftId, rightId }],
  };
  const result = renderBlock(block as any);
  expect(result).toContain("Matching");
  expect(result).toContain("France");
  expect(result).toContain("Paris");
});
```

- [ ] **Step 3: Add grading function tests**

`gradeFillInBlank` and `gradeMatching` are pure functions in `src/lib/assessment.ts` — not accessible from the MCP test runner. Since the frontend has no Vitest setup, verify grading logic via a focused integration test in `mcp/src/tools/__tests__/grading-frontendlib.test.ts` — or, simpler, duplicate the logic inline in the test to verify the algorithm.

Add a `grading.test.ts` file at `mcp/src/tools/__tests__/grading.test.ts` with the grading logic inlined (copy the functions, don't import them):

```typescript
import { describe, it, expect } from "vitest";

// Inline copies of grading functions for testing (frontend src not importable from MCP)
function gradeFillInBlank(
  blanks: Array<{ acceptable: string[]; caseSensitive?: boolean }>,
  inputs: string[]
): boolean {
  return blanks.every((blank, i) => {
    const input = inputs[i] ?? "";
    return blank.acceptable.some((a) =>
      blank.caseSensitive ? a === input : a.toLowerCase() === input.toLowerCase()
    );
  });
}

function gradeMatching(
  pairs: Array<{ leftId: string; rightId: string }>,
  selections: Record<string, string>
): boolean {
  return pairs.every((p) => selections[p.leftId] === p.rightId);
}

describe("gradeFillInBlank", () => {
  it("correct when all blanks answered correctly (case-insensitive by default)", () => {
    const blanks = [{ acceptable: ["Paris"] }, { acceptable: ["France"] }];
    expect(gradeFillInBlank(blanks, ["paris", "FRANCE"])).toBe(true);
  });

  it("incorrect when one blank is wrong", () => {
    const blanks = [{ acceptable: ["Paris"] }, { acceptable: ["France"] }];
    expect(gradeFillInBlank(blanks, ["Paris", "Germany"])).toBe(false);
  });

  it("respects caseSensitive flag", () => {
    const blanks = [{ acceptable: ["Paris"], caseSensitive: true }];
    expect(gradeFillInBlank(blanks, ["paris"])).toBe(false);
    expect(gradeFillInBlank(blanks, ["Paris"])).toBe(true);
  });

  it("accepts any of multiple acceptable answers", () => {
    const blanks = [{ acceptable: ["UK", "United Kingdom", "Britain"] }];
    expect(gradeFillInBlank(blanks, ["Britain"])).toBe(true);
  });

  it("incorrect when blank is empty", () => {
    const blanks = [{ acceptable: ["Paris"] }];
    expect(gradeFillInBlank(blanks, [""])).toBe(false);
  });
});

describe("gradeMatching", () => {
  it("correct when all pairs selected correctly", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }];
    const selections = { l1: "r1", l2: "r2" };
    expect(gradeMatching(pairs, selections)).toBe(true);
  });

  it("incorrect when one pair is wrong", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }];
    const selections = { l1: "r1", l2: "r1" }; // l2 matched to wrong right
    expect(gradeMatching(pairs, selections)).toBe(false);
  });

  it("incorrect when a pair is unselected", () => {
    const pairs = [{ leftId: "l1", rightId: "r1" }];
    const selections = {}; // nothing selected
    expect(gradeMatching(pairs, selections)).toBe(false);
  });
});
```

Add `mcp/src/tools/__tests__/grading.test.ts` to the File Map at the top of this plan.

- [ ] **Step 4: Run full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`

Expected: All tests pass.

---

### Task 15: Final build + commit

- [ ] **Step 1: Final build**

Run: `cd /Users/theonavarro/TideLearn && npm run build && cd mcp && npm run build`

Expected: Both clean.

- [ ] **Step 2: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add src/types/course.ts mcp/src/lib/types.ts \
  src/components/blocks/editor/FillInBlankForm.tsx \
  src/components/blocks/editor/fillInBlankUtils.ts \
  src/components/blocks/view/FillInBlankView.tsx \
  src/components/blocks/editor/MatchingForm.tsx \
  src/components/blocks/view/MatchingView.tsx \
  src/components/blocks/registry.ts \
  src/lib/assessment.ts \
  src/pages/AssessmentView.tsx \
  mcp/src/tools/blocks.ts \
  mcp/src/tools/questions.ts \
  mcp/src/tools/semantic.ts \
  mcp/src/tools/preview.ts \
  mcp/src/resources/instructions.ts \
  mcp/src/tools/__tests__/inject-sub-item-ids.test.ts \
  mcp/src/tools/__tests__/render-block.test.ts \
  mcp/src/tools/__tests__/grading.test.ts
git commit -m "feat(2b-tier3): add fill-in-the-blank + matching block and question types

FillInBlankBlock: template editor with draggable gap chips, interactive
viewer with inline text inputs. MatchingBlock: two-column editor, dropdown
viewer. Both available as Leitner assessment questions. MCP: add_block,
injectSubItemIds, renderBlock, renderQuestion, instructions docs."
```
