# Phase 2A: New Content Blocks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 new content block types to TideLearn, built in three complexity tiers, each fully wired from TypeScript type through Zod schema, factory, EditorForm, ViewRenderer, registry entry, and MCP schema + instructions.

**Architecture:** Blocks are added as vertical slices. Each tier's types/schemas/factories are batched together, then each block gets its own editor and view, then registry + MCP are updated per tier. Phase 2B (assessment schema migration + 4 new question types) is a separate plan.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts (already installed), @dnd-kit/core + @dnd-kit/sortable (Tier 3 only), Zod, Vitest. HTML rendering uses `RichTextRenderer` from `src/components/richtext/RichTextRenderer.tsx` and `sanitize` from `@/lib/sanitize` — **never use raw `dangerouslySetInnerHTML`**.

---

## File Structure

**Files to modify (all tiers):**
- `src/types/course.ts` — add TS types, Zod schemas (strict + permissive), factories, extend Block union + blockSchema + blockSchemaPermissive
- `src/components/blocks/registry.ts` — add 9 registry entries, import new icons + components
- `mcp/src/lib/types.ts` — add mirrored TS types + Zod schemas, extend Block union + blockSchema
- `mcp/src/resources/instructions.ts` — add documentation for new block types
- `mcp/src/lib/__tests__/validate.test.ts` — add schema validation tests per block

**Files to create (9 editor forms):**
- `src/components/blocks/editor/ButtonForm.tsx`
- `src/components/blocks/editor/EmbedForm.tsx`
- `src/components/blocks/editor/FlashcardForm.tsx`
- `src/components/blocks/editor/TimelineForm.tsx`
- `src/components/blocks/editor/ProcessForm.tsx`
- `src/components/blocks/editor/ChartForm.tsx`
- `src/components/blocks/editor/SortingForm.tsx`
- `src/components/blocks/editor/HotspotForm.tsx`
- `src/components/blocks/editor/BranchingForm.tsx`

**Files to create (9 view renderers):**
- `src/components/blocks/view/Button.tsx`
- `src/components/blocks/view/Embed.tsx`
- `src/components/blocks/view/Flashcard.tsx`
- `src/components/blocks/view/Timeline.tsx`
- `src/components/blocks/view/Process.tsx`
- `src/components/blocks/view/Chart.tsx`
- `src/components/blocks/view/Sorting.tsx`
- `src/components/blocks/view/Hotspot.tsx`
- `src/components/blocks/view/Branching.tsx`

**Tier 3 only — package.json:**
- Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

---

## Key Patterns (read before implementing)

**Adding a block type — checklist:**
1. Add TS type to `src/types/course.ts` (and mirror to `mcp/src/lib/types.ts`)
2. Add strict Zod schema `*BlockSchema` to `src/types/course.ts` (and mirror to MCP)
3. Add permissive Zod schema to `src/types/course.ts` (frontend only)
4. Add new type to `Block` union in both files
5. Add schema to `blockSchema` discriminated union in both files
6. Add permissive schema to `blockSchemaPermissive` discriminated union in `src/types/course.ts`
7. Add factory to `factories` object in `src/types/course.ts` — `BlockType` is `keyof typeof factories` and auto-derives
8. Create EditorForm component
9. Create View component — use `RichTextRenderer` for any HTML content, never raw `dangerouslySetInnerHTML`
10. Add registry entry (import components + icon from lucide-react)

**HTML rendering rule:** The codebase has `src/components/richtext/RichTextRenderer.tsx` which sanitizes HTML via `@/lib/sanitize` before rendering. Any block field that contains HTML must use `<RichTextRenderer html={value} />` instead of `dangerouslySetInnerHTML`.

---

## TIER 1: Trivial Blocks (Button/CTA, Embed/iframe, Flashcard)

---

### Task 1: Tier 1 — Type definitions, schemas, factories in `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add TS types after the existing `DocumentBlock` type**

```typescript
export type ButtonBlock = {
  id: string;
  type: "button";
  label: string;
  url: string;
  variant: "primary" | "secondary" | "outline";
  openInNewTab: boolean;
};

export type EmbedBlock = {
  id: string;
  type: "embed";
  url: string;
  title: string;
  height: number;
};

export type FlashcardBlock = {
  id: string;
  type: "flashcard";
  front: string;
  back: string;
  hint?: string;
};
```

- [ ] **Step 2: Add strict Zod schemas after `documentBlockSchema`**

```typescript
export const buttonBlockSchema = z.object({
  id: z.string(),
  type: z.literal("button"),
  label: z.string().min(1),
  url: z.string().min(1),
  variant: z.union([z.literal("primary"), z.literal("secondary"), z.literal("outline")]),
  openInNewTab: z.boolean(),
});

export const embedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("embed"),
  url: z.string().min(1),
  title: z.string().min(1),
  height: z.number().int().min(100).max(2000),
});

export const flashcardBlockSchema = z.object({
  id: z.string(),
  type: z.literal("flashcard"),
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().optional(),
});
```

- [ ] **Step 3: Add permissive Zod schemas in the permissive schemas block**

```typescript
const buttonBlockSchemaPermissive = z.object({
  id: z.string(),
  type: z.literal("button"),
  label: z.string(),
  url: z.string(),
  variant: z.union([z.literal("primary"), z.literal("secondary"), z.literal("outline")]),
  openInNewTab: z.boolean(),
});

const embedBlockSchemaPermissive = z.object({
  id: z.string(),
  type: z.literal("embed"),
  url: z.string(),
  title: z.string(),
  height: z.number(),
});

const flashcardBlockSchemaPermissive = z.object({
  id: z.string(),
  type: z.literal("flashcard"),
  front: z.string(),
  back: z.string(),
  hint: z.string().optional(),
});
```

- [ ] **Step 4: Extend the `Block` union type**

Append three new members to the existing `Block` union:
```typescript
| ButtonBlock
| EmbedBlock
| FlashcardBlock
```

- [ ] **Step 5: Add to `blockSchema` and `blockSchemaPermissive` discriminated unions**

Add `buttonBlockSchema`, `embedBlockSchema`, `flashcardBlockSchema` to the array in `blockSchema`.
Add `buttonBlockSchemaPermissive`, `embedBlockSchemaPermissive`, `flashcardBlockSchemaPermissive` to `blockSchemaPermissive`.

- [ ] **Step 6: Add factories**

```typescript
button: (): ButtonBlock => ({
  id: uid(), type: "button", label: "Learn more", url: "https://", variant: "primary", openInNewTab: false,
}),
embed: (): EmbedBlock => ({
  id: uid(), type: "embed", url: "https://", title: "Embedded content", height: 400,
}),
flashcard: (): FlashcardBlock => ({
  id: uid(), type: "flashcard", front: "Question or term", back: "Answer or definition",
}),
```

- [ ] **Step 7: Confirm no TypeScript errors**

```bash
npm run dev
```
Expected: dev server starts, no TS errors in terminal output.

- [ ] **Step 8: Commit**

```bash
git add src/types/course.ts
git commit -m "feat(types): add Button, Embed, Flashcard block types and schemas"
```

---

### Task 2: Tier 1 — Mirror types and schemas in `mcp/src/lib/types.ts`

**Files:**
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Add the three TS types after `DocumentBlock`** (copy exactly from Task 1 Step 1)

- [ ] **Step 2: Add the three strict Zod schemas** (copy exactly from Task 1 Step 2 — no permissive variant on MCP side)

- [ ] **Step 3: Extend the `Block` union and `blockSchema` discriminated union** (same pattern as frontend)

- [ ] **Step 4: Run MCP tests**

```bash
cd mcp && npm test
```
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/types.ts
git commit -m "feat(mcp/types): mirror Button, Embed, Flashcard block types"
```

---

### Task 3: ButtonForm editor component

**Files:**
- Create: `src/components/blocks/editor/ButtonForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { ButtonBlock } from "@/types/course";

type Props = { block: ButtonBlock; onChange: (b: ButtonBlock) => void };

export function ButtonForm({ block, onChange }: Props) {
  const set = <K extends keyof ButtonBlock>(k: K, v: ButtonBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <input
          type="text"
          value={block.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Button text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          value={block.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Style</label>
        <select
          value={block.variant}
          onChange={(e) => set("variant", e.target.value as ButtonBlock["variant"])}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.openInNewTab}
          onChange={(e) => set("openInNewTab", e.target.checked)}
        />
        Open in new tab
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TS errors**

```bash
npm run build 2>&1 | grep -i "error" | head -20
```
Expected: no errors mentioning `ButtonForm`.

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/ButtonForm.tsx
git commit -m "feat(editor): add ButtonForm"
```

---

### Task 4: Button view renderer

**Files:**
- Create: `src/components/blocks/view/Button.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { ButtonBlock } from "@/types/course";

export function ButtonView({ block }: { block: ButtonBlock }) {
  const base = "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const variants: Record<ButtonBlock["variant"], string> = {
    primary: `${base} bg-[--color-teal-500] text-white hover:bg-[--color-teal-600]`,
    secondary: `${base} bg-secondary text-secondary-foreground hover:bg-secondary/80`,
    outline: `${base} border border-input bg-background hover:bg-accent hover:text-accent-foreground`,
  };

  return (
    <div className="flex justify-center py-4">
      <a
        href={block.url}
        target={block.openInNewTab ? "_blank" : undefined}
        rel={block.openInNewTab ? "noopener noreferrer" : undefined}
        className={variants[block.variant]}
      >
        {block.label}
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Button.tsx
git commit -m "feat(view): add ButtonView renderer"
```

---

### Task 5: EmbedForm editor component

**Files:**
- Create: `src/components/blocks/editor/EmbedForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { EmbedBlock } from "@/types/course";

type Props = { block: EmbedBlock; onChange: (b: EmbedBlock) => void };

export function EmbedForm({ block, onChange }: Props) {
  const set = <K extends keyof EmbedBlock>(k: K, v: EmbedBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Embed URL</label>
        <input
          type="url"
          value={block.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-muted-foreground font-normal">(required for accessibility)</span>
        </label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Describe the embedded content"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Height (px)</label>
        <input
          type="number"
          min={100}
          max={2000}
          value={block.height}
          onChange={(e) => set("height", parseInt(e.target.value, 10) || 400)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/EmbedForm.tsx
git commit -m "feat(editor): add EmbedForm"
```

---

### Task 6: Embed view renderer

**Files:**
- Create: `src/components/blocks/view/Embed.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { EmbedBlock } from "@/types/course";

export function EmbedView({ block }: { block: EmbedBlock }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <iframe
        src={block.url}
        title={block.title}
        height={block.height}
        className="w-full"
        sandbox="allow-scripts allow-same-origin allow-forms"
        loading="lazy"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Embed.tsx
git commit -m "feat(view): add EmbedView renderer"
```

---

### Task 7: FlashcardForm editor component

**Files:**
- Create: `src/components/blocks/editor/FlashcardForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { FlashcardBlock } from "@/types/course";

type Props = { block: FlashcardBlock; onChange: (b: FlashcardBlock) => void };

export function FlashcardForm({ block, onChange }: Props) {
  const set = <K extends keyof FlashcardBlock>(k: K, v: FlashcardBlock[K]) =>
    onChange({ ...block, [k]: v });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Front (question or term)</label>
        <textarea
          value={block.front}
          onChange={(e) => set("front", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Back (answer or definition)</label>
        <textarea
          value={block.back}
          onChange={(e) => set("back", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Hint <span className="text-muted-foreground font-normal">(optional — shown before flip)</span>
        </label>
        <input
          type="text"
          value={block.hint ?? ""}
          onChange={(e) => set("hint", e.target.value || undefined)}
          placeholder="Give learners a nudge…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/FlashcardForm.tsx
git commit -m "feat(editor): add FlashcardForm"
```

---

### Task 8: Flashcard view renderer

**Files:**
- Create: `src/components/blocks/view/Flashcard.tsx`

Uses `RichTextRenderer` for front/back content (HTML-safe). CSS perspective flip — no library needed.

- [ ] **Step 1: Create the file**

```typescript
import { useState } from "react";
import { FlashcardBlock } from "@/types/course";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function FlashcardView({ block }: { block: FlashcardBlock }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="py-4">
      {block.hint && !flipped && (
        <p className="text-sm text-muted-foreground mb-3 text-center italic">Hint: {block.hint}</p>
      )}
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show front of card" : "Flip card to see answer"}
        className="w-full min-h-[160px] rounded-xl border-2 border-border bg-card p-6 text-center transition-all hover:border-[--color-teal-400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          style={{
            transition: "transform 0.4s",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            position: "relative",
            minHeight: "120px",
          }}
        >
          <div
            style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Front</span>
            <RichTextRenderer html={block.front} className="text-base" />
          </div>
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <span className="text-xs font-medium text-[--color-teal-500] uppercase tracking-wide">Answer</span>
            <RichTextRenderer html={block.back} className="text-base" />
          </div>
        </div>
      </button>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Click to {flipped ? "see question" : "reveal answer"}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Flashcard.tsx
git commit -m "feat(view): add FlashcardView with CSS flip animation"
```

---

### Task 9: Tier 1 — Registry entries

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports at the top of the file**

```typescript
// Type imports (add to existing import from "@/types/course"):
import { ..., ButtonBlock, EmbedBlock, FlashcardBlock } from "@/types/course";

// Component imports:
import { ButtonForm } from "./editor/ButtonForm";
import { EmbedForm } from "./editor/EmbedForm";
import { FlashcardForm } from "./editor/FlashcardForm";
import { ButtonView } from "./view/Button";
import { EmbedView } from "./view/Embed";
import { FlashcardView } from "./view/Flashcard";

// Icons — add ExternalLink, Code2, CreditCard to the existing lucide-react import
```

- [ ] **Step 2: Append to the `registry` array**

```typescript
{
  type: "button",
  label: "Button / CTA",
  icon: ExternalLink,
  create: factories.button,
  Editor: ButtonForm as EditorRenderer<ButtonBlock>,
  View: ButtonView as ViewRenderer<ButtonBlock>,
  category: "Interactive",
},
{
  type: "embed",
  label: "Embed",
  icon: Code2,
  create: factories.embed,
  Editor: EmbedForm as EditorRenderer<EmbedBlock>,
  View: EmbedView as ViewRenderer<EmbedBlock>,
  category: "Media",
},
{
  type: "flashcard",
  label: "Flashcard",
  icon: CreditCard,
  create: factories.flashcard,
  Editor: FlashcardForm as EditorRenderer<FlashcardBlock>,
  View: FlashcardView as ViewRenderer<FlashcardBlock>,
  category: "Knowledge",
},
```

- [ ] **Step 3: Manually verify in dev server**

```bash
npm run dev
```
Open the editor, add a content lesson, open the block picker. Confirm Button/CTA, Embed, and Flashcard appear in their categories and can be added to a lesson.

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/registry.ts
git commit -m "feat(registry): register Button, Embed, Flashcard blocks"
```

---

### Task 10: Tier 1 — MCP schema tests + instructions update

**Files:**
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add a new describe block to `validate.test.ts`**

```typescript
describe("Tier 1 block schemas", () => {
  it("accepts a valid button block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "button", label: "Go", url: "https://example.com", variant: "primary", openInNewTab: false }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a button block with invalid variant", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "button", label: "Go", url: "https://example.com", variant: "neon", openInNewTab: false }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });

  it("accepts a valid embed block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "embed", url: "https://example.com", title: "Demo tool", height: 400 }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects an embed block with empty url", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "embed", url: "", title: "Demo", height: 400 }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });

  it("accepts a valid flashcard block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "flashcard", front: "What is X?", back: "X is Y." }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("accepts a flashcard with a hint", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "flashcard", front: "Q", back: "A", hint: "Think about X" }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd mcp && npm test
```
Expected: all tests pass including 5 new ones.

- [ ] **Step 3: Add documentation to `mcp/src/resources/instructions.ts`**

Find the block types section and add entries for:
- `button` — fields: label, url, variant ("primary" | "secondary" | "outline"), openInNewTab (boolean). Use for navigation CTAs and resource links.
- `embed` — fields: url, title (required for accessibility), height (integer 100–2000, default 400). Use for Figma, Google Slides, simulations, any embeddable URL.
- `flashcard` — fields: front (HTML), back (HTML), hint (optional string). Use for term/definition pairs and self-testing. The learner clicks to flip. `front` and `back` accept HTML.

- [ ] **Step 4: Run tests again**

```bash
cd mcp && npm test
```

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "test(mcp): Tier 1 block schema tests; docs: Button, Embed, Flashcard"
```

---

## TIER 2: Standard Blocks (Timeline, Process, Chart)

---

### Task 11: Tier 2 — Types, schemas, factories in `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add TS types**

```typescript
export type TimelineBlock = {
  id: string;
  type: "timeline";
  items: { id: string; date: string; title: string; description?: string }[];
};

export type ProcessBlock = {
  id: string;
  type: "process";
  steps: { id: string; title: string; description?: string }[];
};

export type ChartBlock = {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie";
  title?: string;
  labels: string[];
  datasets: { label: string; values: number[] }[];
};
```

- [ ] **Step 2: Add strict Zod schemas**

```typescript
export const timelineBlockSchema = z.object({
  id: z.string(),
  type: z.literal("timeline"),
  items: z.array(z.object({
    id: z.string(),
    date: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
  })).min(1),
});

export const processBlockSchema = z.object({
  id: z.string(),
  type: z.literal("process"),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string().min(1),
    description: z.string().optional(),
  })).min(1),
});

export const chartBlockSchema = z.object({
  id: z.string(),
  type: z.literal("chart"),
  chartType: z.union([z.literal("bar"), z.literal("line"), z.literal("pie")]),
  title: z.string().optional(),
  labels: z.array(z.string().min(1)).min(1),
  datasets: z.array(z.object({
    label: z.string().min(1),
    values: z.array(z.number()).min(1),
  })).min(1),
});
```

- [ ] **Step 3: Add permissive schemas, extend Block union, blockSchema, blockSchemaPermissive**

Permissive versions drop `.min()` constraints:
```typescript
const timelineBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("timeline"),
  items: z.array(z.object({ id: z.string(), date: z.string(), title: z.string(), description: z.string().optional() })),
});

const processBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("process"),
  steps: z.array(z.object({ id: z.string(), title: z.string(), description: z.string().optional() })),
});

const chartBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("chart"),
  chartType: z.union([z.literal("bar"), z.literal("line"), z.literal("pie")]),
  title: z.string().optional(),
  labels: z.array(z.string()),
  datasets: z.array(z.object({ label: z.string(), values: z.array(z.number()) })),
});
```

Extend `Block` union:
```typescript
| TimelineBlock
| ProcessBlock
| ChartBlock
```

Add schemas to `blockSchema` and `blockSchemaPermissive`.

- [ ] **Step 4: Add factories**

```typescript
timeline: (): TimelineBlock => ({
  id: uid(), type: "timeline",
  items: [
    { id: uid(), date: "2024", title: "First milestone", description: "Something important happened." },
    { id: uid(), date: "2025", title: "Second milestone", description: "Then this happened." },
  ],
}),
process: (): ProcessBlock => ({
  id: uid(), type: "process",
  steps: [
    { id: uid(), title: "Step 1", description: "Describe the first step." },
    { id: uid(), title: "Step 2", description: "Describe the second step." },
    { id: uid(), title: "Step 3", description: "Describe the final step." },
  ],
}),
chart: (): ChartBlock => ({
  id: uid(), type: "chart", chartType: "bar", title: "Chart title",
  labels: ["Category A", "Category B", "Category C"],
  datasets: [{ label: "Series 1", values: [40, 65, 30] }],
}),
```

- [ ] **Step 5: Confirm no TS errors, commit**

```bash
npm run dev
git add src/types/course.ts
git commit -m "feat(types): add Timeline, Process, Chart block types and schemas"
```

---

### Task 12: Tier 2 — Mirror in `mcp/src/lib/types.ts`

Same pattern as Task 2. Add TS types, strict Zod schemas, extend Block union and blockSchema. No permissive schemas needed.

- [ ] **Step 1: Add types and schemas**
- [ ] **Step 2: Run MCP tests** — `cd mcp && npm test`
- [ ] **Step 3: Commit**

```bash
git add mcp/src/lib/types.ts
git commit -m "feat(mcp/types): mirror Timeline, Process, Chart block types"
```

---

### Task 13: TimelineForm editor component

**Files:**
- Create: `src/components/blocks/editor/TimelineForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { TimelineBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: TimelineBlock; onChange: (b: TimelineBlock) => void };

export function TimelineForm({ block, onChange }: Props) {
  const updateItem = (index: number, field: string, value: string) => {
    const items = block.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...block, items });
  };

  const addItem = () =>
    onChange({ ...block, items: [...block.items, { id: uid(), date: "", title: "", description: "" }] });

  const removeItem = (index: number) =>
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      {block.items.map((item, i) => (
        <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={item.date}
              onChange={(e) => updateItem(i, "date", e.target.value)}
              placeholder="Date or period"
              className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Event title"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            {block.items.length > 1 && (
              <button onClick={() => removeItem(i)} aria-label="Remove item" className="text-destructive text-sm px-2">✕</button>
            )}
          </div>
          <textarea
            value={item.description ?? ""}
            onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
          />
        </div>
      ))}
      <button onClick={addItem} className="text-sm text-[--color-teal-500] hover:text-[--color-teal-600]">
        + Add event
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/TimelineForm.tsx
git commit -m "feat(editor): add TimelineForm"
```

---

### Task 14: Timeline view renderer

**Files:**
- Create: `src/components/blocks/view/Timeline.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { TimelineBlock } from "@/types/course";

export function TimelineView({ block }: { block: TimelineBlock }) {
  return (
    <div className="py-2">
      <div className="relative border-l-2 border-border ml-4 space-y-6 pl-6">
        {block.items.map((item) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-[--color-teal-500] border-2 border-background" />
            <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
            <h4 className="font-semibold text-sm mt-0.5">{item.title}</h4>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Timeline.tsx
git commit -m "feat(view): add TimelineView renderer"
```

---

### Task 15: ProcessForm editor component

**Files:**
- Create: `src/components/blocks/editor/ProcessForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { ProcessBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: ProcessBlock; onChange: (b: ProcessBlock) => void };

export function ProcessForm({ block, onChange }: Props) {
  const updateStep = (index: number, field: string, value: string) => {
    const steps = block.steps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    );
    onChange({ ...block, steps });
  };

  const addStep = () =>
    onChange({ ...block, steps: [...block.steps, { id: uid(), title: "", description: "" }] });

  const removeStep = (index: number) =>
    onChange({ ...block, steps: block.steps.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-2 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[--color-teal-500] text-white text-xs flex items-center justify-center font-bold mt-1">
            {i + 1}
          </span>
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={step.title}
              onChange={(e) => updateStep(i, "title", e.target.value)}
              placeholder="Step title"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <textarea
              value={step.description ?? ""}
              onChange={(e) => updateStep(i, "description", e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
            />
          </div>
          {block.steps.length > 1 && (
            <button onClick={() => removeStep(i)} aria-label="Remove step" className="text-destructive text-sm mt-1">✕</button>
          )}
        </div>
      ))}
      <button onClick={addStep} className="text-sm text-[--color-teal-500] hover:text-[--color-teal-600]">
        + Add step
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/ProcessForm.tsx
git commit -m "feat(editor): add ProcessForm"
```

---

### Task 16: Process view renderer

**Files:**
- Create: `src/components/blocks/view/Process.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { ProcessBlock } from "@/types/course";

export function ProcessView({ block }: { block: ProcessBlock }) {
  return (
    <div className="py-2">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-4 items-start">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[--color-teal-500] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </div>
            {i < block.steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
            )}
          </div>
          <div className="pb-6">
            <h4 className="font-semibold text-sm">{step.title}</h4>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Process.tsx
git commit -m "feat(view): add ProcessView renderer"
```

---

### Task 17: ChartForm editor component

**Files:**
- Create: `src/components/blocks/editor/ChartForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { ChartBlock } from "@/types/course";

type Props = { block: ChartBlock; onChange: (b: ChartBlock) => void };

export function ChartForm({ block, onChange }: Props) {
  const set = <K extends keyof ChartBlock>(k: K, v: ChartBlock[K]) =>
    onChange({ ...block, [k]: v });

  const updateLabel = (i: number, value: string) => {
    const labels = [...block.labels];
    labels[i] = value;
    onChange({ ...block, labels });
  };

  const updateDatasetValue = (di: number, vi: number, value: string) => {
    const datasets = block.datasets.map((ds, i) => {
      if (i !== di) return ds;
      const values = [...ds.values];
      values[vi] = parseFloat(value) || 0;
      return { ...ds, values };
    });
    onChange({ ...block, datasets });
  };

  const updateDatasetLabel = (di: number, value: string) => {
    const datasets = block.datasets.map((ds, i) =>
      i === di ? { ...ds, label: value } : ds
    );
    onChange({ ...block, datasets });
  };

  const addLabel = () =>
    onChange({
      ...block,
      labels: [...block.labels, `Category ${block.labels.length + 1}`],
      datasets: block.datasets.map((ds) => ({ ...ds, values: [...ds.values, 0] })),
    });

  const removeLabel = (i: number) =>
    onChange({
      ...block,
      labels: block.labels.filter((_, idx) => idx !== i),
      datasets: block.datasets.map((ds) => ({
        ...ds, values: ds.values.filter((_, idx) => idx !== i),
      })),
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Chart type</label>
          <select
            value={block.chartType}
            onChange={(e) => set("chartType", e.target.value as ChartBlock["chartType"])}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input
            type="text"
            value={block.title ?? ""}
            onChange={(e) => set("title", e.target.value || undefined)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Data</label>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                {block.datasets.map((ds, di) => (
                  <th key={di} className="text-left px-3 py-2 font-medium">
                    <input
                      type="text"
                      value={ds.label}
                      onChange={(e) => updateDatasetLabel(di, e.target.value)}
                      className="w-full bg-transparent border-b border-input focus:outline-none text-sm"
                    />
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {block.labels.map((label, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => updateLabel(i, e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-sm"
                    />
                  </td>
                  {block.datasets.map((ds, di) => (
                    <td key={di} className="px-3 py-1.5">
                      <input
                        type="number"
                        value={ds.values[i] ?? 0}
                        onChange={(e) => updateDatasetValue(di, i, e.target.value)}
                        className="w-full bg-transparent focus:outline-none text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    {block.labels.length > 1 && (
                      <button onClick={() => removeLabel(i)} className="text-destructive text-xs" aria-label="Remove row">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addLabel} className="text-sm text-[--color-teal-500] mt-2">+ Add row</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/ChartForm.tsx
git commit -m "feat(editor): add ChartForm with tabular data editor"
```

---

### Task 18: Chart view renderer

**Files:**
- Create: `src/components/blocks/view/Chart.tsx`

Uses Recharts (already installed). Pie charts only use the first dataset.

- [ ] **Step 1: Create the file**

```typescript
import { ChartBlock } from "@/types/course";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#059669"];

export function ChartView({ block }: { block: ChartBlock }) {
  const data = block.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    block.datasets.forEach((ds) => { row[ds.label] = ds.values[i] ?? 0; });
    return row;
  });

  const pieData = block.labels.map((label, i) => ({
    name: label,
    value: block.datasets[0]?.values[i] ?? 0,
  }));

  return (
    <div className="py-4">
      {block.title && (
        <p className="text-sm font-semibold text-center mb-3">{block.title}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {block.chartType === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => (
              <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        ) : block.chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => (
              <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Chart.tsx
git commit -m "feat(view): add ChartView with Recharts bar/line/pie"
```

---

### Task 19: Tier 2 — Registry entries

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports**

Add type imports: `TimelineBlock`, `ProcessBlock`, `ChartBlock`
Add component imports for all 3 editors and 3 views.
Add icons to lucide-react import: `ListOrdered`, `Workflow`, `BarChart2`

- [ ] **Step 2: Append to registry array**

```typescript
{
  type: "timeline",
  label: "Timeline",
  icon: ListOrdered,
  create: factories.timeline,
  Editor: TimelineForm as EditorRenderer<TimelineBlock>,
  View: TimelineView as ViewRenderer<TimelineBlock>,
  category: "Interactive",
},
{
  type: "process",
  label: "Process Steps",
  icon: Workflow,
  create: factories.process,
  Editor: ProcessForm as EditorRenderer<ProcessBlock>,
  View: ProcessView as ViewRenderer<ProcessBlock>,
  category: "Interactive",
},
{
  type: "chart",
  label: "Chart",
  icon: BarChart2,
  create: factories.chart,
  Editor: ChartForm as EditorRenderer<ChartBlock>,
  View: ChartView as ViewRenderer<ChartBlock>,
  category: "Media",
},
```

- [ ] **Step 3: Verify in dev server — all three blocks appear in picker and render correctly**

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/registry.ts
git commit -m "feat(registry): register Timeline, Process, Chart blocks"
```

---

### Task 20: Tier 2 — MCP schema tests + instructions update

**Files:**
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add tests for Timeline, Process, Chart**

```typescript
describe("Tier 2 block schemas", () => {
  it("accepts a valid timeline block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "timeline", items: [
          { id: "i1", date: "2024", title: "Launch" },
          { id: "i2", date: "2025", title: "Growth" },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a timeline with no items", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "timeline", items: [] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });

  it("accepts a valid process block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "process", steps: [
          { id: "s1", title: "Plan" },
          { id: "s2", title: "Execute" },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a process block with no steps", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "process", steps: [] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });

  it("accepts a valid bar chart block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "chart", chartType: "bar",
          labels: ["A", "B"], datasets: [{ label: "Series 1", values: [10, 20] }] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a chart with missing labels", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "chart", chartType: "bar", labels: [], datasets: [{ label: "S1", values: [] }] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests** — `cd mcp && npm test`

- [ ] **Step 3: Update instructions** — document timeline, process, chart:
  - `timeline` — items array with id/date/title/description. Use for chronological event sequences.
  - `process` — steps array with id/title/description. Use for numbered procedural sequences.
  - `chart` — chartType ("bar"|"line"|"pie"), title (optional), labels array, datasets array (label + values). Pie charts use only the first dataset. values must align with labels in length.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "test(mcp): Tier 2 block schema tests; docs: Timeline, Process, Chart"
```

---

## TIER 3: Complex Interactive Blocks (Sorting/drag-drop, Hotspot, Branching)

---

### Task 21: Install @dnd-kit

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Confirm dev server still starts**

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for interactive sorting block"
```

---

### Task 22: Tier 3 — Types, schemas, factories in `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts`

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
    id: z.string(),
    text: z.string().min(1),
    correctPosition: z.number().int().min(0),
  })).min(2),
  showFeedback: z.boolean(),
});

export const hotspotBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hotspot"),
  src: z.string().min(1),
  alt: z.string().min(1),
  hotspots: z.array(z.object({
    id: z.string(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    label: z.string().min(1),
    description: z.string().optional(),
  })),
});

export const branchingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("branching"),
  prompt: z.string().min(1),
  choices: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
    content: z.string(),
  })).min(2),
});
```

- [ ] **Step 3: Add permissive schemas**

```typescript
const sortingBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("sorting"),
  prompt: z.string(),
  items: z.array(z.object({ id: z.string(), text: z.string(), correctPosition: z.number() })),
  showFeedback: z.boolean(),
});

const hotspotBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("hotspot"),
  src: z.string(), alt: z.string(),
  hotspots: z.array(z.object({
    id: z.string(), x: z.number(), y: z.number(), label: z.string(), description: z.string().optional(),
  })),
});

const branchingBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("branching"),
  prompt: z.string(),
  choices: z.array(z.object({ id: z.string(), label: z.string(), content: z.string() })),
});
```

- [ ] **Step 4: Extend Block union, blockSchema, blockSchemaPermissive; add factories**

Append to Block union:
```typescript
| SortingBlock
| HotspotBlock
| BranchingBlock
```

Add factories:
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

- [ ] **Step 5: Confirm no TS errors, commit**

```bash
npm run dev
git add src/types/course.ts
git commit -m "feat(types): add Sorting, Hotspot, Branching block types and schemas"
```

---

### Task 23: Tier 3 — Mirror in `mcp/src/lib/types.ts`

Same pattern as Tasks 2 and 12.

- [ ] **Step 1: Add TS types, strict Zod schemas, extend Block union and blockSchema**
- [ ] **Step 2: Run MCP tests** — `cd mcp && npm test`
- [ ] **Step 3: Commit**

```bash
git add mcp/src/lib/types.ts
git commit -m "feat(mcp/types): mirror Sorting, Hotspot, Branching block types"
```

---

### Task 24: SortingForm editor component

**Files:**
- Create: `src/components/blocks/editor/SortingForm.tsx`

The editor defines items and their correct order. Order in the list = correct sequence (author uses ↑/↓ buttons). The viewer shuffles items for the learner at render time.

- [ ] **Step 1: Create the file**

```typescript
import { SortingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: SortingBlock; onChange: (b: SortingBlock) => void };

export function SortingForm({ block, onChange }: Props) {
  const updateItem = (index: number, text: string) => {
    const items = block.items.map((item, i) => i === index ? { ...item, text } : item);
    onChange({ ...block, items });
  };

  const addItem = () =>
    onChange({
      ...block,
      items: [...block.items.map((item, i) => ({ ...item, correctPosition: i })),
        { id: uid(), text: "", correctPosition: block.items.length }],
    });

  const removeItem = (index: number) =>
    onChange({
      ...block,
      items: block.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, correctPosition: i })),
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
        <textarea
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Items (top = position 1, correct order)</p>
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={item.id} className="flex gap-2 items-center rounded-md border border-border px-3 py-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder="Item text"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <div className="flex gap-1">
                {i > 0 && (
                  <button onClick={() => moveItem(i, i - 1)} aria-label="Move up" className="text-muted-foreground text-xs px-1">↑</button>
                )}
                {i < block.items.length - 1 && (
                  <button onClick={() => moveItem(i, i + 1)} aria-label="Move down" className="text-muted-foreground text-xs px-1">↓</button>
                )}
                {block.items.length > 2 && (
                  <button onClick={() => removeItem(i)} aria-label="Remove" className="text-destructive text-xs px-1">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="text-sm text-[--color-teal-500] mt-2">+ Add item</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.showFeedback}
          onChange={(e) => onChange({ ...block, showFeedback: e.target.checked })}
        />
        Show feedback after submit
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/SortingForm.tsx
git commit -m "feat(editor): add SortingForm"
```

---

### Task 25: Sorting view renderer

**Files:**
- Create: `src/components/blocks/view/Sorting.tsx`

Uses @dnd-kit. Items are shuffled once on mount. Submit reveals correctness per position.

- [ ] **Step 1: Create the file**

```typescript
import { useState, useMemo } from "react";
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
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm cursor-grab active:cursor-grabbing select-none"
    >
      <span className="text-muted-foreground">⠿</span>
      {text}
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
          <button
            onClick={() => setSubmitted(true)}
            className="rounded-md bg-[--color-teal-500] text-white px-4 py-2 text-sm font-medium hover:bg-[--color-teal-600]"
          >
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
                  <span>{correct ? "✓" : "✗"}</span>
                  {itemMap[id]}
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

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Sorting.tsx
git commit -m "feat(view): add SortingView with @dnd-kit drag-and-drop"
```

---

### Task 26: HotspotForm editor component

**Files:**
- Create: `src/components/blocks/editor/HotspotForm.tsx`

Click on the image to place a pin. Each pin's x/y is stored as 0–100% of image dimensions. Pins are editable and removable in a list below the image.

- [ ] **Step 1: Create the file**

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
    onChange({
      ...block,
      hotspots: [...block.hotspots, { id: uid(), x, y, label: "New hotspot" }],
    });
  };

  const updateHotspot = (index: number, field: string, value: string) => {
    const hotspots = block.hotspots.map((h, i) => i === index ? { ...h, [field]: value } : h);
    onChange({ ...block, hotspots });
  };

  const removeHotspot = (index: number) =>
    onChange({ ...block, hotspots: block.hotspots.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input
          type="url"
          value={block.src}
          onChange={(e) => onChange({ ...block, src: e.target.value })}
          placeholder="https://"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Alt text</label>
        <input
          type="text"
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Describe the image"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {block.src && (
        <>
          <p className="text-xs text-muted-foreground">Click the image to place a hotspot pin</p>
          <div
            className="relative cursor-crosshair rounded-lg overflow-hidden border border-border"
            onClick={handleImageClick}
          >
            <img ref={imgRef} src={block.src} alt={block.alt} className="w-full block" />
            {block.hotspots.map((h, i) => (
              <div
                key={h.id}
                style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                className="w-6 h-6 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md pointer-events-none"
              >
                {i + 1}
              </div>
            ))}
          </div>
          {block.hotspots.length > 0 && (
            <div className="space-y-2">
              {block.hotspots.map((h, i) => (
                <div key={h.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[--color-teal-500] text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={h.label}
                      onChange={(e) => updateHotspot(i, "label", e.target.value)}
                      placeholder="Label"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                    <button onClick={() => removeHotspot(i)} aria-label="Remove hotspot" className="text-destructive text-sm">✕</button>
                  </div>
                  <textarea
                    value={h.description ?? ""}
                    onChange={(e) => updateHotspot(i, "description", e.target.value || undefined)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
                  />
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

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/HotspotForm.tsx
git commit -m "feat(editor): add HotspotForm with visual pin placement"
```

---

### Task 27: Hotspot view renderer

**Files:**
- Create: `src/components/blocks/view/Hotspot.tsx`

Clicking a numbered pin opens a label/description popover. Clicking the same pin closes it. Only one popover open at a time.

- [ ] **Step 1: Create the file**

```typescript
import { useState } from "react";
import { HotspotBlock } from "@/types/course";

export function HotspotView({ block }: { block: HotspotBlock }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggle = (id: string) => setActiveId((prev) => (prev === id ? null : id));

  if (!block.src) {
    return <p className="text-sm text-muted-foreground italic">No image set.</p>;
  }

  return (
    <div className="py-2">
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img src={block.src} alt={block.alt} className="w-full block" />
        {block.hotspots.map((h, i) => {
          const isOpen = activeId === h.id;
          return (
            <div key={h.id} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%` }}>
              <button
                onClick={() => toggle(h.id)}
                aria-label={h.label}
                aria-expanded={isOpen}
                className="w-7 h-7 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md hover:bg-[--color-teal-600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
              >
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

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Hotspot.tsx
git commit -m "feat(view): add HotspotView with click-to-reveal pins"
```

---

### Task 28: BranchingForm editor component

**Files:**
- Create: `src/components/blocks/editor/BranchingForm.tsx`

- [ ] **Step 1: Create the file**

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
        <textarea
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>
      {block.choices.map((choice, i) => (
        <div key={choice.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={choice.label}
              onChange={(e) => updateChoice(i, "label", e.target.value)}
              placeholder="Choice label"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            {block.choices.length > 2 && (
              <button onClick={() => removeChoice(i)} aria-label="Remove choice" className="text-destructive text-sm">✕</button>
            )}
          </div>
          <textarea
            value={choice.content}
            onChange={(e) => updateChoice(i, "content", e.target.value)}
            placeholder="Content shown when learner picks this choice (HTML accepted)"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
          />
        </div>
      ))}
      <button onClick={addChoice} className="text-sm text-[--color-teal-500]">+ Add choice</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/BranchingForm.tsx
git commit -m "feat(editor): add BranchingForm"
```

---

### Task 29: Branching view renderer

**Files:**
- Create: `src/components/blocks/view/Branching.tsx`

Uses `RichTextRenderer` for choice content (HTML-safe).

- [ ] **Step 1: Create the file**

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
          <button
            key={c.id}
            onClick={() => setSelected(selected === c.id ? null : c.id)}
            aria-pressed={selected === c.id}
            className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected === c.id
                ? "bg-[--color-teal-500] text-white border-[--color-teal-500]"
                : "bg-background border-border hover:border-[--color-teal-400]"
            }`}
          >
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

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Branching.tsx
git commit -m "feat(view): add BranchingView with choice-panel reveal"
```

---

### Task 30: Tier 3 — Registry entries

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports**

Type imports: `SortingBlock`, `HotspotBlock`, `BranchingBlock`
Component imports for all 3 editors and 3 views.
Icons to add to lucide-react import: `GripVertical`, `MapPin`, `GitBranch`

- [ ] **Step 2: Append to registry array**

```typescript
{
  type: "sorting",
  label: "Drag to Sort",
  icon: GripVertical,
  create: factories.sorting,
  Editor: SortingForm as EditorRenderer<SortingBlock>,
  View: SortingView as ViewRenderer<SortingBlock>,
  category: "Knowledge",
},
{
  type: "hotspot",
  label: "Hotspot Image",
  icon: MapPin,
  create: factories.hotspot,
  Editor: HotspotForm as EditorRenderer<HotspotBlock>,
  View: HotspotView as ViewRenderer<HotspotBlock>,
  category: "Interactive",
},
{
  type: "branching",
  label: "Branching Scenario",
  icon: GitBranch,
  create: factories.branching,
  Editor: BranchingForm as EditorRenderer<BranchingBlock>,
  View: BranchingView as ViewRenderer<BranchingBlock>,
  category: "Interactive",
},
```

- [ ] **Step 3: Verify in dev server**

All three blocks appear in the block picker. Add each one, fill in basic content, view renders correctly. Confirm drag-and-drop works in Sorting, pin placement works in Hotspot, and choices reveal content in Branching.

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/registry.ts
git commit -m "feat(registry): register Sorting, Hotspot, Branching blocks"
```

---

### Task 31: Tier 3 — MCP schema tests + instructions update

**Files:**
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add tests**

```typescript
describe("Tier 3 block schemas", () => {
  it("accepts a valid sorting block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "sorting", prompt: "Order these.", showFeedback: true, items: [
          { id: "i1", text: "First", correctPosition: 0 },
          { id: "i2", text: "Second", correctPosition: 1 },
          { id: "i3", text: "Third", correctPosition: 2 },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a sorting block with only 1 item", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "sorting", prompt: "Order.", showFeedback: false, items: [
          { id: "i1", text: "Only item", correctPosition: 0 },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });

  it("accepts a valid hotspot block with no hotspots", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "hotspot", src: "https://example.com/img.jpg", alt: "A diagram", hotspots: [] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("accepts a valid hotspot block with pins", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "hotspot", src: "https://example.com/img.jpg", alt: "A diagram",
          hotspots: [{ id: "h1", x: 25.5, y: 40.2, label: "Part A", description: "This is Part A." }] }],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("accepts a valid branching block", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "branching", prompt: "What do you do?", choices: [
          { id: "c1", label: "Option A", content: "<p>Result A</p>" },
          { id: "c2", label: "Option B", content: "<p>Result B</p>" },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(true);
  });

  it("rejects a branching block with only 1 choice", () => {
    const course = {
      schemaVersion: 1, title: "T", lessons: [{
        kind: "content", id: "l1", title: "L1",
        blocks: [{ id: "b1", type: "branching", prompt: "What do you do?", choices: [
          { id: "c1", label: "Only option", content: "" },
        ]}],
      }],
    };
    expect(validateCourseJson(course).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
cd mcp && npm test
```
Expected: all tests pass, total count increased by 6.

- [ ] **Step 3: Update instructions**

Document:
- `sorting` — prompt, items (each with id/text/correctPosition where correctPosition is 0-based), showFeedback. The viewer shuffles items and lets learners drag to reorder. Author sets correct order by setting correctPosition values sequentially.
- `hotspot` — src (image URL), alt, hotspots array (each with id/x/y as percentages 0–100/label/description). MCP can set coordinates numerically. An empty hotspots array is valid for an image with no pins.
- `branching` — prompt, choices array (each with id/label/content where content accepts HTML). Minimum 2 choices. Learner clicks a choice button to reveal its content panel.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "test(mcp): Tier 3 block schema tests; docs: Sorting, Hotspot, Branching"
```

---

## Final Verification

### Task 32: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full build**

```bash
npm run build
```
Expected: no TypeScript errors, no Vite build failures.

- [ ] **Step 2: All MCP tests**

```bash
cd mcp && npm test
```
Expected: all tests pass.

- [ ] **Step 3: ESLint**

```bash
npm run lint
```
Expected: no new errors (existing `any` warnings in EditorRenderer casts throughout the registry are acceptable).

- [ ] **Step 4: Manual smoke test — add one of each block type in the editor**

```bash
npm run dev
```

For each of the 9 new blocks:
1. Open the editor, add a content lesson
2. Add the block from the block picker
3. Fill in minimal content in the editor form
4. Switch to the viewer — confirm it renders without errors

Additional interaction tests:
- Flashcard: confirm flip animation works on click
- Sorting: confirm items shuffle on render, drag reorder works, Check Order shows correct/incorrect
- Hotspot: add an image URL, click to place 2+ pins, confirm pins appear, click pin in viewer reveals label
- Branching: confirm choice buttons toggle content panels

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Phase 2A complete — 9 new content blocks added"
```

---

## What's Next

**Phase 2B** (planned separately): Assessment schema migration — convert `AssessmentQuestion` from the current fixed 4-option MCQ type to a discriminated union supporting fill-in-the-blank, matching, multiple response, and drag-drop question types. This is a breaking schema change requiring migration strategy for existing localStorage and Supabase data.
