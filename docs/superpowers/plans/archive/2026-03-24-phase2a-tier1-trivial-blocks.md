# Phase 2A Tier 1: Trivial Blocks (Button, Embed, Flashcard)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 trivial content blocks — Button/CTA, Embed/iframe, Flashcard — fully wired from type through MCP.

**Architecture:** Each block is a vertical slice: TS type, Zod schema (strict + permissive), factory, EditorForm, ViewRenderer, registry entry, MCP schema + tests + instructions. All three blocks' types/schemas are batched into one task since they touch the same files.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Zod, Vitest.

**Prerequisite:** Phase 1 (audit fixes + Gunmetal UI) must be merged to main.

---

## File Structure

**Modify:**
- `src/types/course.ts` — TS types, Zod schemas (strict + permissive), factories, Block union, blockSchema, blockSchemaPermissive
- `src/components/blocks/registry.ts` — 3 registry entries
- `mcp/src/lib/types.ts` — mirrored TS types + Zod schemas (strict only), Block union, blockSchema
- `mcp/src/resources/instructions.ts` — document new blocks
- `mcp/src/lib/__tests__/validate.test.ts` — schema validation tests

**Create:**
- `src/components/blocks/editor/ButtonForm.tsx`
- `src/components/blocks/editor/EmbedForm.tsx`
- `src/components/blocks/editor/FlashcardForm.tsx`
- `src/components/blocks/view/Button.tsx`
- `src/components/blocks/view/Embed.tsx`
- `src/components/blocks/view/Flashcard.tsx`

---

## Key Patterns

**Adding a block type — checklist:**
1. Add TS type to `src/types/course.ts` (and mirror to `mcp/src/lib/types.ts`)
2. Add strict Zod schema to both files
3. Add permissive Zod schema to `src/types/course.ts` only
4. Add to `Block` union in both files
5. Add to `blockSchema` discriminated union in both files
6. Add to `blockSchemaPermissive` in `src/types/course.ts`
7. Add factory to `factories` object — `BlockType` is `keyof typeof factories` and auto-derives
8. Create EditorForm + View components
9. Add registry entry (import components + icon from lucide-react)

**HTML rendering:** Always use `<RichTextRenderer html={value} />` from `src/components/richtext/RichTextRenderer.tsx` for any HTML content. This component sanitizes input via `@/lib/sanitize`. Never inject raw HTML directly.

**MCP types:** MCP imports `uid` from `"./uid.js"` (not `@/types/course`). Strict schemas only, no permissive. No factories.

---

### Task 1: Type definitions, schemas, factories (frontend + MCP)

**Files:**
- Modify: `src/types/course.ts`
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Add TS types to `src/types/course.ts` after `DocumentBlock`**

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

- [ ] **Step 3: Add permissive schemas in the permissive block**

```typescript
const buttonBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("button"),
  label: z.string(), url: z.string(),
  variant: z.union([z.literal("primary"), z.literal("secondary"), z.literal("outline")]),
  openInNewTab: z.boolean(),
});

const embedBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("embed"),
  url: z.string(), title: z.string(), height: z.number(),
});

const flashcardBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("flashcard"),
  front: z.string(), back: z.string(), hint: z.string().optional(),
});
```

- [ ] **Step 4: Extend `Block` union, `blockSchema`, `blockSchemaPermissive`**

Append `| ButtonBlock | EmbedBlock | FlashcardBlock` to `Block`.
Add the three strict schemas to `blockSchema`.
Add the three permissive schemas to `blockSchemaPermissive`.

- [ ] **Step 5: Add factories**

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

- [ ] **Step 6: Mirror to `mcp/src/lib/types.ts`** — add same TS types and strict Zod schemas, extend Block union and blockSchema. Note: MCP already imports `uid` from `"./uid.js"` at the top — do not duplicate.

- [ ] **Step 7: Verify**

```bash
npm run dev          # no TS errors
cd mcp && npm test   # all existing tests pass
```

- [ ] **Step 8: Commit**

```bash
git add src/types/course.ts mcp/src/lib/types.ts
git commit -m "feat(types): add Button, Embed, Flashcard block types and schemas"
```

---

### Task 2: ButtonForm editor + ButtonView renderer

**Files:**
- Create: `src/components/blocks/editor/ButtonForm.tsx`
- Create: `src/components/blocks/view/Button.tsx`

- [ ] **Step 1: Create `ButtonForm.tsx`**

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
        <input type="text" value={block.label} onChange={(e) => set("label", e.target.value)}
          placeholder="Button text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input type="url" value={block.url} onChange={(e) => set("url", e.target.value)}
          placeholder="https://" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Style</label>
        <select value={block.variant} onChange={(e) => set("variant", e.target.value as ButtonBlock["variant"])}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.openInNewTab} onChange={(e) => set("openInNewTab", e.target.checked)} />
        Open in new tab
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create `Button.tsx` (view)**

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
      <a href={block.url} target={block.openInNewTab ? "_blank" : undefined}
        rel={block.openInNewTab ? "noopener noreferrer" : undefined} className={variants[block.variant]}>
        {block.label}
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/ButtonForm.tsx src/components/blocks/view/Button.tsx
git commit -m "feat(blocks): add Button/CTA editor and view"
```

---

### Task 3: EmbedForm editor + EmbedView renderer

**Files:**
- Create: `src/components/blocks/editor/EmbedForm.tsx`
- Create: `src/components/blocks/view/Embed.tsx`

- [ ] **Step 1: Create `EmbedForm.tsx`**

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
        <input type="url" value={block.url} onChange={(e) => set("url", e.target.value)}
          placeholder="https://" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-muted-foreground font-normal">(required for accessibility)</span>
        </label>
        <input type="text" value={block.title} onChange={(e) => set("title", e.target.value)}
          placeholder="Describe the embedded content" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Height (px)</label>
        <input type="number" min={100} max={2000} value={block.height}
          onChange={(e) => set("height", parseInt(e.target.value, 10) || 400)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Embed.tsx` (view)**

```typescript
import { EmbedBlock } from "@/types/course";

export function EmbedView({ block }: { block: EmbedBlock }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <iframe src={block.url} title={block.title} height={block.height}
        className="w-full" sandbox="allow-scripts allow-same-origin allow-forms" loading="lazy" />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/EmbedForm.tsx src/components/blocks/view/Embed.tsx
git commit -m "feat(blocks): add Embed/iframe editor and view"
```

---

### Task 4: FlashcardForm editor + FlashcardView renderer

**Files:**
- Create: `src/components/blocks/editor/FlashcardForm.tsx`
- Create: `src/components/blocks/view/Flashcard.tsx`

- [ ] **Step 1: Create `FlashcardForm.tsx`**

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
        <textarea value={block.front} onChange={(e) => set("front", e.target.value)}
          rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Back (answer or definition)</label>
        <textarea value={block.back} onChange={(e) => set("back", e.target.value)}
          rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Hint <span className="text-muted-foreground font-normal">(optional — shown before flip)</span>
        </label>
        <input type="text" value={block.hint ?? ""} onChange={(e) => set("hint", e.target.value || undefined)}
          placeholder="Give learners a nudge…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Flashcard.tsx` (view)**

CSS perspective flip. Uses `RichTextRenderer` for front/back content (HTML-safe).

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
        <div style={{ transition: "transform 0.4s", transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", position: "relative", minHeight: "120px" }}>
          <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Front</span>
            <RichTextRenderer html={block.front} className="text-base" />
          </div>
          <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
            className="flex flex-col items-center justify-center gap-2">
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

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/FlashcardForm.tsx src/components/blocks/view/Flashcard.tsx
git commit -m "feat(blocks): add Flashcard editor and view with CSS flip"
```

---

### Task 5: Registry entries + MCP tests + instructions

**Files:**
- Modify: `src/components/blocks/registry.ts`
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add imports and registry entries**

Icons: `ExternalLink`, `Code2`, `CreditCard`

```typescript
{ type: "button", label: "Button / CTA", icon: ExternalLink, create: factories.button,
  Editor: ButtonForm as EditorRenderer<ButtonBlock>, View: ButtonView as ViewRenderer<ButtonBlock>, category: "Interactive" },
{ type: "embed", label: "Embed", icon: Code2, create: factories.embed,
  Editor: EmbedForm as EditorRenderer<EmbedBlock>, View: EmbedView as ViewRenderer<EmbedBlock>, category: "Media" },
{ type: "flashcard", label: "Flashcard", icon: CreditCard, create: factories.flashcard,
  Editor: FlashcardForm as EditorRenderer<FlashcardBlock>, View: FlashcardView as ViewRenderer<FlashcardBlock>, category: "Knowledge" },
```

- [ ] **Step 2: Add MCP tests**

```typescript
describe("Tier 1 block schemas", () => {
  it("accepts a valid button block", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "button", label: "Go", url: "https://example.com", variant: "primary", openInNewTab: false }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects button with invalid variant", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "button", label: "Go", url: "https://example.com", variant: "neon", openInNewTab: false }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
  it("accepts a valid embed block", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "embed", url: "https://example.com", title: "Demo", height: 400 }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects embed with empty url", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "embed", url: "", title: "Demo", height: 400 }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
  it("accepts a valid flashcard", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "flashcard", front: "Q", back: "A" }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("accepts flashcard with hint", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "flashcard", front: "Q", back: "A", hint: "Think about X" }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
});
```

- [ ] **Step 3: Update MCP instructions** — button (label/url/variant/openInNewTab), embed (url/title/height), flashcard (front/back/hint, HTML accepted in front/back).

- [ ] **Step 4: Verify**

```bash
npm run dev && npm run build && cd mcp && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/registry.ts mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "feat(tier1): wire Button, Embed, Flashcard into registry + MCP tests/docs"
```

---

## What's Next

Continue to **Phase 2A Tier 2** plan: Timeline, Process, Chart blocks.
