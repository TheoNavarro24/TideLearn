# Phase 2A Tier 3: Interactive Blocks (Sorting, Hotspot, Branching)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 complex interactive blocks — Sorting/drag-drop, Hotspot/labelled image, Branching scenario — fully wired from type through MCP.

**Architecture:** Same vertical-slice pattern as Tiers 1–2. New dependency: `@dnd-kit` for drag-and-drop in the Sorting block. Branching uses `RichTextRenderer` for HTML content. Hotspot editor has a visual pin-placement canvas.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities, Zod, Vitest.

**Prerequisite:** Tier 2 plan must be complete (Timeline, Process, Chart merged).

---

## File Structure

**Modify:**
- `src/types/course.ts` — TS types, Zod schemas, factories, unions
- `src/components/blocks/registry.ts` — 3 registry entries
- `mcp/src/lib/types.ts` — mirrored types + schemas
- `mcp/src/resources/instructions.ts` — document new blocks
- `mcp/src/lib/__tests__/validate.test.ts` — schema tests
- `package.json` / `package-lock.json` — add @dnd-kit

**Create:**
- `src/components/blocks/editor/SortingForm.tsx`
- `src/components/blocks/editor/HotspotForm.tsx`
- `src/components/blocks/editor/BranchingForm.tsx`
- `src/components/blocks/view/Sorting.tsx`
- `src/components/blocks/view/Hotspot.tsx`
- `src/components/blocks/view/Branching.tsx`

---

## Key Patterns

Same as Tier 1 plan. Additional notes for Tier 3:
- **Sorting block:** Author defines items in correct order (top = position 0). Viewer shuffles for learner. `correctPosition` is 0-based.
- **Hotspot block:** `x` and `y` are percentages (0–100) relative to image dimensions. Empty `hotspots` array is valid.
- **Branching block:** Minimum 2 choices. `content` field accepts HTML (rendered via `RichTextRenderer`).
- **Design tokens:** Use `border-[--color-teal-500]` / `border-destructive` for correct/incorrect feedback, not Tailwind colour utilities like `bg-green-50`.

---

### Task 1: Install @dnd-kit

- [ ] **Step 1: Install**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for interactive sorting block"
```

---

### Task 2: Type definitions, schemas, factories (frontend + MCP)

**Files:**
- Modify: `src/types/course.ts`
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Add TS types**

```typescript
export type SortingBlock = {
  id: string;
  type: "sorting";
  prompt: string;
  items: { id: string; text: string; correctPosition: number }[];
  showFeedback: boolean;
};

export type HotspotBlock = {
  id: string;
  type: "hotspot";
  src: string;
  alt: string;
  hotspots: { id: string; x: number; y: number; label: string; description?: string }[];
};

export type BranchingBlock = {
  id: string;
  type: "branching";
  prompt: string;
  choices: { id: string; label: string; content: string }[];
};
```

- [ ] **Step 2: Add strict Zod schemas**

```typescript
export const sortingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("sorting"),
  prompt: z.string().min(1),
  items: z.array(z.object({
    id: z.string(), text: z.string().min(1), correctPosition: z.number().int().min(0),
  })).min(2),
  showFeedback: z.boolean(),
});

export const hotspotBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hotspot"),
  src: z.string().min(1),
  alt: z.string().min(1),
  hotspots: z.array(z.object({
    id: z.string(), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
    label: z.string().min(1), description: z.string().optional(),
  })),
});

export const branchingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("branching"),
  prompt: z.string().min(1),
  choices: z.array(z.object({
    id: z.string(), label: z.string().min(1), content: z.string(),
  })).min(2),
});
```

- [ ] **Step 3: Add permissive schemas, extend unions, add factories**

Permissive: drop `.min()` on strings/arrays, keep enum/range constraints.

Extend `Block` union: `| SortingBlock | HotspotBlock | BranchingBlock`

Factories:
```typescript
sorting: (): SortingBlock => ({
  id: uid(), type: "sorting",
  prompt: "Arrange these items in the correct order.",
  items: [
    { id: uid(), text: "First item", correctPosition: 0 },
    { id: uid(), text: "Second item", correctPosition: 1 },
    { id: uid(), text: "Third item", correctPosition: 2 },
  ],
  showFeedback: true,
}),
hotspot: (): HotspotBlock => ({
  id: uid(), type: "hotspot", src: "", alt: "", hotspots: [],
}),
branching: (): BranchingBlock => ({
  id: uid(), type: "branching",
  prompt: "What would you do in this situation?",
  choices: [
    { id: uid(), label: "Option A", content: "<p>Content for Option A.</p>" },
    { id: uid(), label: "Option B", content: "<p>Content for Option B.</p>" },
  ],
}),
```

- [ ] **Step 4: Mirror to `mcp/src/lib/types.ts`** — TS types, strict schemas, Block union, blockSchema.

- [ ] **Step 5: Verify and commit**

```bash
npm run dev && cd mcp && npm test
git add src/types/course.ts mcp/src/lib/types.ts
git commit -m "feat(types): add Sorting, Hotspot, Branching block types and schemas"
```

---

### Task 3: SortingForm editor + SortingView renderer

**Files:**
- Create: `src/components/blocks/editor/SortingForm.tsx`
- Create: `src/components/blocks/view/Sorting.tsx`

- [ ] **Step 1: Create `SortingForm.tsx`**

Author defines items in correct order. ↑/↓ buttons reorder. `correctPosition` syncs to index.

```typescript
import { SortingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: SortingBlock; onChange: (b: SortingBlock) => void };

export function SortingForm({ block, onChange }: Props) {
  const updateItem = (index: number, text: string) => {
    const items = block.items.map((item, i) => i === index ? { ...item, text } : item);
    onChange({ ...block, items });
  };
  const addItem = () => onChange({
    ...block,
    items: [...block.items.map((item, i) => ({ ...item, correctPosition: i })),
      { id: uid(), text: "", correctPosition: block.items.length }],
  });
  const removeItem = (index: number) => onChange({
    ...block,
    items: block.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, correctPosition: i })),
  });
  const moveItem = (from: number, to: number) => {
    const items = [...block.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    onChange({ ...block, items: items.map((item, i) => ({ ...item, correctPosition: i })) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt</label>
        <textarea value={block.prompt} onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Items (top = position 1, correct order)</p>
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={item.id} className="flex gap-2 items-center rounded-md border border-border px-3 py-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <input type="text" value={item.text} onChange={(e) => updateItem(i, e.target.value)}
                placeholder="Item text" className="flex-1 bg-transparent text-sm focus:outline-none" />
              <div className="flex gap-1">
                {i > 0 && <button onClick={() => moveItem(i, i - 1)} aria-label="Move up" className="text-muted-foreground text-xs px-1">↑</button>}
                {i < block.items.length - 1 && <button onClick={() => moveItem(i, i + 1)} aria-label="Move down" className="text-muted-foreground text-xs px-1">↓</button>}
                {block.items.length > 2 && <button onClick={() => removeItem(i)} aria-label="Remove" className="text-destructive text-xs px-1">✕</button>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="text-sm text-[--color-teal-500] mt-2">+ Add item</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.showFeedback} onChange={(e) => onChange({ ...block, showFeedback: e.target.checked })} />
        Show feedback after submit
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create `Sorting.tsx` (view)**

Uses @dnd-kit. Items shuffle on mount and on "Try again". Submit reveals correct/incorrect per position.

```typescript
import { useState } from "react";
import { SortingBlock } from "@/types/course";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm cursor-grab active:cursor-grabbing select-none">
      <span className="text-muted-foreground">⠿</span>{text}
    </div>
  );
}

export function SortingView({ block }: { block: SortingBlock }) {
  const newShuffle = () =>
    [...block.items].sort(() => Math.random() - 0.5).map((item) => item.id);

  const [order, setOrder] = useState<string[]>(() => newShuffle());
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((ids) => {
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        return arrayMove(ids, oldIndex, newIndex);
      });
    }
  };

  const isCorrect = order.every((id, i) =>
    block.items.find((it) => it.id === id)?.correctPosition === i
  );
  const itemMap = Object.fromEntries(block.items.map((item) => [item.id, item.text]));

  return (
    <div className="py-2 space-y-4">
      <p className="text-sm font-medium">{block.prompt}</p>
      {!submitted ? (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.map((id) => <SortableItem key={id} id={id} text={itemMap[id]} />)}
              </div>
            </SortableContext>
          </DndContext>
          <button onClick={() => setSubmitted(true)}
            className="rounded-md bg-[--color-teal-500] text-white px-4 py-2 text-sm font-medium hover:bg-[--color-teal-600]">
            Check order
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {order.map((id, i) => {
              const correct = block.items.find((it) => it.id === id)?.correctPosition === i;
              return (
                <div key={id} className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${correct ? "border-[--color-teal-500] bg-[--color-teal-500]/10" : "border-destructive bg-destructive/10"}`}>
                  <span>{correct ? "✓" : "✗"}</span>{itemMap[id]}
                </div>
              );
            })}
          </div>
          {block.showFeedback && (
            <p className="text-sm font-medium">{isCorrect ? "Correct order!" : "Not quite — see the correct order above."}</p>
          )}
          <button onClick={() => { setOrder(newShuffle()); setSubmitted(false); }} className="text-sm text-[--color-teal-500]">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/SortingForm.tsx src/components/blocks/view/Sorting.tsx
git commit -m "feat(blocks): add Sorting editor and view with @dnd-kit"
```

---

### Task 4: HotspotForm editor + HotspotView renderer

**Files:**
- Create: `src/components/blocks/editor/HotspotForm.tsx`
- Create: `src/components/blocks/view/Hotspot.tsx`

- [ ] **Step 1: Create `HotspotForm.tsx`**

Click-on-image to place numbered pins. Pin details editable in list below.

```typescript
import { useRef } from "react";
import { HotspotBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: HotspotBlock; onChange: (b: HotspotBlock) => void };

export function HotspotForm({ block, onChange }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ ...block, hotspots: [...block.hotspots, { id: uid(), x, y, label: "New hotspot" }] });
  };

  const updateHotspot = (index: number, updates: Partial<HotspotBlock["hotspots"][0]>) => {
    const hotspots = block.hotspots.map((h, i) => i === index ? { ...h, ...updates } : h);
    onChange({ ...block, hotspots });
  };

  const removeHotspot = (index: number) =>
    onChange({ ...block, hotspots: block.hotspots.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input type="url" value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })}
          placeholder="https://" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Alt text</label>
        <input type="text" value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Describe the image" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      {block.src && (
        <>
          <p className="text-xs text-muted-foreground">Click the image to place a hotspot pin</p>
          <div className="relative cursor-crosshair rounded-lg overflow-hidden border border-border" onClick={handleImageClick}>
            <img ref={imgRef} src={block.src} alt={block.alt} className="w-full block" />
            {block.hotspots.map((h, i) => (
              <div key={h.id} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                className="w-6 h-6 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md pointer-events-none">
                {i + 1}
              </div>
            ))}
          </div>
          {block.hotspots.length > 0 && (
            <div className="space-y-2">
              {block.hotspots.map((h, i) => (
                <div key={h.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[--color-teal-500] text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <input type="text" value={h.label} onChange={(e) => updateHotspot(i, { label: e.target.value })}
                      placeholder="Label" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                    <button onClick={() => removeHotspot(i)} aria-label="Remove hotspot" className="text-destructive text-sm">✕</button>
                  </div>
                  <textarea value={h.description ?? ""} onChange={(e) => updateHotspot(i, { description: e.target.value || undefined })}
                    placeholder="Description (optional)" rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `Hotspot.tsx` (view)**

Clicking a numbered pin toggles a popover with label + description. One popover at a time.

```typescript
import { useState } from "react";
import { HotspotBlock } from "@/types/course";

export function HotspotView({ block }: { block: HotspotBlock }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = (id: string) => setActiveId((prev) => (prev === id ? null : id));

  if (!block.src) return <p className="text-sm text-muted-foreground italic">No image set.</p>;

  return (
    <div className="py-2">
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img src={block.src} alt={block.alt} className="w-full block" />
        {block.hotspots.map((h, i) => {
          const isOpen = activeId === h.id;
          return (
            <div key={h.id} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%` }}>
              <button onClick={() => toggle(h.id)} aria-label={h.label} aria-expanded={isOpen}
                className="w-7 h-7 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md hover:bg-[--color-teal-600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110">
                {i + 1}
              </button>
              {isOpen && (
                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border border-border bg-popover p-3 shadow-lg text-sm">
                  <p className="font-semibold">{h.label}</p>
                  {h.description && <p className="text-muted-foreground mt-1">{h.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/HotspotForm.tsx src/components/blocks/view/Hotspot.tsx
git commit -m "feat(blocks): add Hotspot editor with visual pin placement and view"
```

---

### Task 5: BranchingForm editor + BranchingView renderer

**Files:**
- Create: `src/components/blocks/editor/BranchingForm.tsx`
- Create: `src/components/blocks/view/Branching.tsx`

- [ ] **Step 1: Create `BranchingForm.tsx`**

```typescript
import { BranchingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: BranchingBlock; onChange: (b: BranchingBlock) => void };

export function BranchingForm({ block, onChange }: Props) {
  const updateChoice = (index: number, field: "label" | "content", value: string) => {
    const choices = block.choices.map((c, i) => i === index ? { ...c, [field]: value } : c);
    onChange({ ...block, choices });
  };
  const addChoice = () =>
    onChange({ ...block, choices: [...block.choices, { id: uid(), label: `Option ${block.choices.length + 1}`, content: "" }] });
  const removeChoice = (index: number) =>
    onChange({ ...block, choices: block.choices.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt / scenario</label>
        <textarea value={block.prompt} onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      {block.choices.map((choice, i) => (
        <div key={choice.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input type="text" value={choice.label} onChange={(e) => updateChoice(i, "label", e.target.value)}
              placeholder="Choice label" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            {block.choices.length > 2 && (
              <button onClick={() => removeChoice(i)} aria-label="Remove choice" className="text-destructive text-sm">✕</button>
            )}
          </div>
          <textarea value={choice.content} onChange={(e) => updateChoice(i, "content", e.target.value)}
            placeholder="Content shown when learner picks this choice (HTML accepted)"
            rows={3} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
        </div>
      ))}
      <button onClick={addChoice} className="text-sm text-[--color-teal-500]">+ Add choice</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `Branching.tsx` (view)**

Uses `RichTextRenderer` for choice content (HTML-safe).

```typescript
import { useState } from "react";
import { BranchingBlock } from "@/types/course";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function BranchingView({ block }: { block: BranchingBlock }) {
  const [selected, setSelected] = useState<string | null>(null);
  const choice = block.choices.find((c) => c.id === selected);

  return (
    <div className="py-2 space-y-4">
      <p className="text-sm font-medium">{block.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {block.choices.map((c) => (
          <button key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
            aria-pressed={selected === c.id}
            className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected === c.id
                ? "bg-[--color-teal-500] text-white border-[--color-teal-500]"
                : "bg-background border-border hover:border-[--color-teal-400]"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      {choice && choice.content && (
        <div className="rounded-lg border border-border bg-card p-4">
          <RichTextRenderer html={choice.content} className="text-sm prose prose-sm max-w-none" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/BranchingForm.tsx src/components/blocks/view/Branching.tsx
git commit -m "feat(blocks): add Branching editor and view with choice-panel reveal"
```

---

### Task 6: Registry entries + MCP tests + instructions

**Files:**
- Modify: `src/components/blocks/registry.ts`
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add imports and registry entries**

Icons: `GripVertical`, `MapPin`, `GitBranch`

```typescript
{ type: "sorting", label: "Drag to Sort", icon: GripVertical, create: factories.sorting,
  Editor: SortingForm as EditorRenderer<SortingBlock>, View: SortingView as ViewRenderer<SortingBlock>, category: "Knowledge" },
{ type: "hotspot", label: "Hotspot Image", icon: MapPin, create: factories.hotspot,
  Editor: HotspotForm as EditorRenderer<HotspotBlock>, View: HotspotView as ViewRenderer<HotspotBlock>, category: "Interactive" },
{ type: "branching", label: "Branching Scenario", icon: GitBranch, create: factories.branching,
  Editor: BranchingForm as EditorRenderer<BranchingBlock>, View: BranchingView as ViewRenderer<BranchingBlock>, category: "Interactive" },
```

- [ ] **Step 2: Add MCP tests**

```typescript
describe("Tier 3 block schemas", () => {
  it("accepts a valid sorting block", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "sorting", prompt: "Order these.", showFeedback: true, items: [
        { id: "i1", text: "First", correctPosition: 0 }, { id: "i2", text: "Second", correctPosition: 1 },
        { id: "i3", text: "Third", correctPosition: 2 },
      ]}] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects sorting with only 1 item", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "sorting", prompt: "Order.", showFeedback: false,
        items: [{ id: "i1", text: "Only", correctPosition: 0 }] }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
  it("accepts hotspot with no pins", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "hotspot", src: "https://example.com/img.jpg", alt: "Diagram", hotspots: [] }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("accepts hotspot with pins", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "hotspot", src: "https://example.com/img.jpg", alt: "Diagram",
        hotspots: [{ id: "h1", x: 25.5, y: 40.2, label: "Part A", description: "This is Part A." }] }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("accepts valid branching", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "branching", prompt: "What do you do?", choices: [
        { id: "c1", label: "Option A", content: "<p>A</p>" }, { id: "c2", label: "Option B", content: "<p>B</p>" },
      ]}] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects branching with only 1 choice", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "branching", prompt: "What?", choices: [
        { id: "c1", label: "Only", content: "" },
      ]}] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Update instructions**

Document:
- `sorting` — prompt, items (id/text/correctPosition 0-based), showFeedback. Author sets correct order; viewer shuffles.
- `hotspot` — src, alt, hotspots array (id/x/y as 0–100 percentages/label/description). Empty array valid.
- `branching` — prompt, choices (id/label/content HTML). Min 2 choices. Learner clicks to reveal content panel.

- [ ] **Step 4: Full verification**

```bash
npm run build        # no TS errors
cd mcp && npm test   # all tests pass
npm run lint         # no new errors
npm run dev          # manual: add each block, test interactions
```

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/registry.ts mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "feat(tier3): wire Sorting, Hotspot, Branching into registry + MCP tests/docs"
```

---

## What's Next

**Phase 2A complete** after all three tier plans are executed. Then plan **Phase 2B**: assessment schema migration (discriminated union for AssessmentQuestion) + 4 new question types (fill-in-blank, matching, multiple response, drag-drop).
