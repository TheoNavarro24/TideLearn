# Phase 2B Tier 4 — Sorting Question + Phase 2A Validation Catch-up + Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Tiers 1, 2, and 3 must be merged before starting this plan.

**Goal:** Add `sorting` as an assessment question type (the block already exists). Apply the validation treatment — `<FieldLabel required>` asterisks, Zod schema tightening, MCP error messages, and publish modal warnings — to all 9 Phase 2A blocks that missed it. Complete `instructions.ts` documentation for all new types. Comprehensive MCP test suite.

**Architecture:** The sorting question type is structurally identical to `SortingBlock` minus `showFeedback`. Phase 2A validation catch-up is primarily editor-layer work (FieldLabel required props) since most Zod schemas are already tight — verify per-block before making changes. The hotspot block gets the MCP handoff pattern (scaffold via MCP + position pins in editor).

**Tech Stack:** TypeScript, React, Zod, Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/types/course.ts` | Tighten Phase 2A strict schemas where needed (timeline ≥2, process ≥2, hotspot ≥1 hotspot) |
| `mcp/src/lib/types.ts` | Mirror any Zod tightenings |
| `src/lib/assessment.ts` | Add `gradeSorting` |
| `src/pages/AssessmentView.tsx` | Add sorting question renderer; reset sorting state per question |
| `mcp/src/tools/assessment.ts` | `sorting` already in union (Tier 1) — add `injectQuestionSubItemIds` call and verify |
| `mcp/src/tools/preview.ts` | Add `sorting` renderQuestion case |
| `mcp/src/resources/instructions.ts` | Complete docs for all Phase 2B types + hotspot MCP handoff pattern |
| `src/components/blocks/editor/ButtonForm.tsx` | Add `required` to FieldLabel for `label`, `url` |
| `src/components/blocks/editor/EmbedForm.tsx` | Add `required` to FieldLabel for `url` |
| `src/components/blocks/editor/FlashcardForm.tsx` | Add `required` to FieldLabel for `front`, `back` |
| `src/components/blocks/editor/TimelineForm.tsx` | Add `required` to FieldLabel for events; validate ≥2 |
| `src/components/blocks/editor/ProcessForm.tsx` | Add `required` to FieldLabel for steps; validate ≥2 |
| `src/components/blocks/editor/ChartForm.tsx` | Add `required` to FieldLabel for `title`, datasets |
| `src/components/blocks/editor/SortingForm.tsx` | Add `required` to FieldLabel for `prompt`, buckets, items |
| `src/components/blocks/editor/HotspotForm.tsx` | Add `required` to FieldLabel for `src`, hotspots; add MCP handoff banner |
| `src/components/blocks/editor/BranchingForm.tsx` | Add `required` to FieldLabel for branches |
| `mcp/src/tools/__tests__/question-schema.test.ts` | Add sorting question tests |
| `mcp/src/tools/__tests__/render-block.test.ts` | Comprehensive coverage for all Phase 2B block types |
| `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts` | Add sorting question case |

---

### Task 1: Add `sorting` question type renderer + grading

**Files:**
- Modify: `src/lib/assessment.ts`
- Modify: `src/pages/AssessmentView.tsx`

- [ ] **Step 1: Add `gradeSorting` to `src/lib/assessment.ts`**

```typescript
/** Grade a sorting answer. Correct when all items are in their correct bucket. */
export function gradeSorting(
  items: Array<{ id: string; bucketId: string }>,
  placements: Record<string, string> // itemId → bucketId
): boolean {
  return items.every((item) => placements[item.id] === item.bucketId);
}
```

- [ ] **Step 2: Add sorting state to `AssessmentView.tsx`**

```typescript
const [sortingPlacements, setSortingPlacements] = useState<Record<string, string>>({});
```

Reset in `startStudy`, `startExam`, `startDrill`, and `handleNext`:
```typescript
setSortingPlacements({});
```

Import `gradeSorting` at the top of the file.

- [ ] **Step 3: Update `handleReveal` for sorting**

```typescript
} else if (currentQ.kind === "sorting") {
  correct = gradeSorting(currentQ.items, sortingPlacements);
}
```

Update `isReadyToReveal`:
```typescript
(currentQ.kind === "sorting" && currentQ.items.every((item) => sortingPlacements[item.id]))
```

- [ ] **Step 4: Add sorting renderer in the question screen**

The sorting question UI mirrors the sorting block viewer — items are dragged into buckets. Since the existing `SortingView` component handles this interaction, we can render it inline or replicate the core logic.

Use a simplified dropdown-per-item approach (consistent with matching) rather than full drag-drop for the assessment context:

```tsx
{currentQ.kind === "sorting" && (() => {
  const bucketMap = new Map(currentQ.buckets.map((b) => [b.id, b.label]));
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Place each item in the correct bucket</p>
      {currentQ.items.map((item) => {
        const sel = sortingPlacements[item.id];
        const isCorrect = revealed && sel === item.bucketId;
        const isWrong = revealed && sel && sel !== item.bucketId;
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
            <select
              value={sel ?? ""}
              disabled={revealed}
              onChange={(e) => setSortingPlacements((prev) => ({ ...prev, [item.id]: e.target.value }))}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 14,
                border: `1.5px solid ${isCorrect ? "var(--accent-hex)" : isWrong ? "#ef4444" : "hsl(var(--border))"}`,
                color: isCorrect ? "var(--accent-hex)" : isWrong ? "#ef4444" : "inherit",
                background: "var(--canvas-white)", width: 150,
              }}
            >
              <option value="">Bucket...</option>
              {currentQ.buckets.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
})()}
```

- [ ] **Step 5: Update mistake notebook for sorting**

```tsx
{q.kind === "sorting" && (
  <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>
    ✓ {q.items.map((item) => {
      const bucketLabel = q.buckets.find((b) => b.id === item.bucketId)?.label ?? "?";
      return `${item.text} → ${bucketLabel}`;
    }).join(" · ")}
  </p>
)}
```

- [ ] **Step 6: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 2: Add `sorting` renderQuestion in `preview.ts`

**Files:**
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Update the sorting case in `renderQuestion`**

The `renderQuestion` function in `preview.ts` already has a placeholder for sorting (from Tier 2). Replace it:

```typescript
case "sorting": {
  const bucketMap = new Map((q.buckets ?? []).map((b: any) => [b.id, b.label]));
  return `
    <div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0">
      <p style="font-weight:600;margin:0 0 0.5em">${esc(q.text)}</p>
      <p style="font-size:0.8em;color:#64748b;margin:0 0 0.5em">Sort into buckets: ${(q.buckets ?? []).map((b: any) => esc(b.label)).join(", ")}</p>
      <ul style="margin:0 0 0.5em 1.25em;padding:0">
        ${(q.items ?? []).map((item: any) =>
          `<li>${esc(item.text)} → <strong>${esc(bucketMap.get(item.bucketId) ?? "?")}</strong></li>`
        ).join("")}
      </ul>
      ${q.feedback ? `<p style="font-size:0.875em;color:#64748b;margin:0;font-style:italic">Feedback: ${esc(q.feedback)}</p>` : ""}
    </div>`;
}
```

---

### Task 3: Phase 2A validation — verify Zod schemas, tighten where needed

Before adding FieldLabel required props to editors, verify what Zod constraints already exist. Check `src/types/course.ts` and `mcp/src/lib/types.ts` for each Phase 2A block schema.

- [ ] **Step 1: Audit Phase 2A Zod schemas**

Check each of these in `src/types/course.ts` and note what's already tight vs. what needs tightening:

| Block | Check |
|-------|-------|
| `button` | `label` and `url` already `.min(1)`? |
| `embed` | `url` and `title` already `.min(1)`? |
| `flashcard` | `front` and `back` already `.min(1)`? |
| `timeline` | `items` has `.min(2)` or just `.min(1)`? |
| `process` | `steps` has `.min(2)` or just `.min(1)`? |
| `chart` | `title` is required with `.min(1)`? `datasets` has `.min(1)`? |
| `sorting` | Already fully tight (verified in Phase 2A+) |
| `hotspot` | `hotspots` has `.min(1)`? |
| `branching` | `choices` already `.min(2)`? |

- [ ] **Step 2: Tighten where needed**

Based on the audit, apply only the constraints that aren't already in place. Expected gaps (based on prior code review):

In `src/types/course.ts`:
- `timelineBlockSchema`: change `items: z.array(...).min(1)` → `.min(2)` (intentional tightening — 1-item timeline is not meaningful)
- `processBlockSchema`: change `steps: z.array(...).min(1)` → `.min(2)` (same rationale)
- `hotspotBlockSchema`: change `hotspots: z.array(...)` → `.min(1)` if not already

Mirror any changes in `mcp/src/lib/types.ts`.

---

### Task 4: Phase 2A validation — add `<FieldLabel required>` to editor forms

The pattern is the same for all 9 Phase 2A block editors. For each editor form, find the fields listed as required and add `required` prop to their `<FieldLabel>` component.

First, check the `FieldLabel` component signature to confirm it accepts a `required` prop:

```typescript
// src/components/ui/FieldLabel.tsx should have:
type Props = { children: React.ReactNode; required?: boolean };
```

If it doesn't already show a red `*` on `required`, update it:
```tsx
export function FieldLabel({ children, required }: Props) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive ml-1" aria-hidden>*</span>}
    </label>
  );
}
```

- [ ] **Step 1: `ButtonForm.tsx` — add required to `label` and `url`**

Find the FieldLabel for label and url, add `required`:
```tsx
<FieldLabel required>Button label</FieldLabel>
<FieldLabel required>URL</FieldLabel>
```

- [ ] **Step 2: `EmbedForm.tsx` — add required to `url`**

```tsx
<FieldLabel required>Embed URL</FieldLabel>
```

- [ ] **Step 3: `FlashcardForm.tsx` — add required to `front` and `back`**

```tsx
<FieldLabel required>Front</FieldLabel>
<FieldLabel required>Back</FieldLabel>
```

- [ ] **Step 4: `TimelineForm.tsx` — add required to event fields + validation message**

```tsx
<FieldLabel required>Events</FieldLabel>
```

Also add a validation message if fewer than 2 events:
```tsx
{block.items.length < 2 && (
  <p className="text-xs text-destructive mt-1">Add at least 2 events</p>
)}
```

- [ ] **Step 5: `ProcessForm.tsx` — add required to step fields + validation message**

```tsx
<FieldLabel required>Steps</FieldLabel>
{block.steps.length < 2 && (
  <p className="text-xs text-destructive mt-1">Add at least 2 steps</p>
)}
```

- [ ] **Step 6: `ChartForm.tsx` — add required to `title` and dataset fields**

```tsx
<FieldLabel required>Chart title</FieldLabel>
<FieldLabel required>Datasets</FieldLabel>
```

- [ ] **Step 7: `SortingForm.tsx` — add required to `prompt`, buckets, items**

```tsx
<FieldLabel required>Prompt</FieldLabel>
<FieldLabel required>Buckets</FieldLabel>
<FieldLabel required>Items</FieldLabel>
```

Also add validation messages:
```tsx
{block.buckets.length < 2 && <p className="text-xs text-destructive mt-1">Add at least 2 buckets</p>}
{block.items.length < 2 && <p className="text-xs text-destructive mt-1">Add at least 2 items</p>}
```

- [ ] **Step 8: `HotspotForm.tsx` — add required to `src` + hotspot count + MCP handoff banner**

```tsx
<FieldLabel required>Image</FieldLabel>
<FieldLabel required>Hotspots</FieldLabel>
```

Add the MCP handoff banner: if any hotspot has default placeholder coordinates (`x === 50 && y === 50`), show:
```tsx
{block.hotspots.some((h) => h.x === 50 && h.y === 50) && (
  <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
    Pin positions need setting — click the image to place each pin correctly.
  </div>
)}
```

Add validation message:
```tsx
{block.hotspots.length === 0 && <p className="text-xs text-destructive mt-1">Add at least 1 hotspot</p>}
```

- [ ] **Step 9: `BranchingForm.tsx` — add required to branch fields**

```tsx
<FieldLabel required>Branches</FieldLabel>
{block.choices.length < 2 && <p className="text-xs text-destructive mt-1">Add at least 2 branches</p>}
```

- [ ] **Step 10: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 5: Phase 2A validation — MCP error messages

**Files:**
- Modify: `mcp/src/lib/types.ts` (already tight from Task 3 audit)
- Modify: `mcp/src/tools/blocks.ts`

The MCP `add_block` and `update_block` tools validate via Zod schemas in `mcp/src/lib/types.ts`. Since the schemas are already tight for most Phase 2A blocks, the MCP will already reject invalid inputs. This task ensures the error messages are descriptive.

- [ ] **Step 1: Verify `add_block` uses Zod schema validation and returns descriptive errors**

Check `mcp/src/tools/blocks.ts` to confirm that when a block fails schema validation, the error message includes the field name and what's wrong. The existing validation pattern uses `formatZodErrors` — verify this is applied to Phase 2A block types too.

If the error messages are already descriptive (from `formatZodErrors`), no changes needed. If not, ensure `blockSchema.safeParse(block)` is called and errors are surfaced.

---

### Task 6: Complete `instructions.ts` documentation

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add documentation for all Phase 2B block and question types**

Find the block types section in `instructions.ts`. Add entries for:

**New blocks (Phase 2B):**
- `multipleresponse` — question (string), options (string[], 2-6), correctIndices (number[], ≥2), showFeedback?, feedbackMessage?
- `fillinblank` — template (string with `{{1}}` `{{2}}` gap markers), blanks (array of { acceptable: string[], caseSensitive?: boolean })
- `matching` — prompt (string), left (array of { label }), right (array of { label }), pairs (array of { leftIndex, rightIndex }) — MCP uses indexes, IDs injected server-side

**New question types (Phase 2B):**
- `multipleresponse` — same as block but with `text` instead of `question`; correctIndices ≥2
- `fillinblank` — `text` as question stem, blanks array
- `matching` — `text` as question stem, left/right/pairs
- `sorting` — `text`, buckets (array of { label }), items (array of { text, bucketIndex }) — MCP uses bucketIndex, IDs injected server-side

**Hotspot MCP workflow:**
- Use `upload_media` to get image URL, then `add_block` with type "hotspot", src, and hotspot labels (coordinates default to 50,50)
- After adding, direct user to the editor to position pins
- MCP response will indicate pins need positioning

---

### Task 7: Comprehensive MCP tests

**Files:**
- Modify: `mcp/src/tools/__tests__/question-schema.test.ts`
- Modify: `mcp/src/tools/__tests__/render-block.test.ts`
- Modify: `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts`

- [ ] **Step 1: Add sorting question tests to `question-schema.test.ts`**

```typescript
it("sorting question: injects ids on buckets and items, converts bucketIndex to bucketId", () => {
  const q = {
    kind: "sorting", text: "Sort the items",
    buckets: [{ label: "Even" }, { label: "Odd" }],
    items: [{ text: "2", bucketIndex: 0 }, { text: "3", bucketIndex: 1 }, { text: "4", bucketIndex: 0 }],
  };
  const result = injectQuestionSubItemIds(q);
  expect(result.buckets[0].id).toBeTruthy();
  expect(result.items[0].bucketId).toBe(result.buckets[0].id); // 2 → Even
  expect(result.items[1].bucketId).toBe(result.buckets[1].id); // 3 → Odd
  expect(result.items[2].bucketId).toBe(result.buckets[0].id); // 4 → Even
});

it("sorting question: items without matching bucketIndex get a fallback id", () => {
  const q = {
    kind: "sorting", text: "Sort",
    buckets: [{ label: "A" }],
    items: [{ text: "x", bucketIndex: 99 }], // invalid index
  };
  const result = injectQuestionSubItemIds(q);
  expect(result.items[0].bucketId).toBeTruthy(); // should not throw
});
```

- [ ] **Step 2: Add `renderQuestion` tests to `render-block.test.ts`**

Create a separate `render-question.test.ts` file or add to render-block:

```typescript
import { renderQuestion } from "../preview.js";

describe("renderQuestion", () => {
  it("mcq: renders question with correct answer marked", () => {
    const q = { kind: "mcq", text: "Q?", options: ["A","B","C","D"], correctIndex: 1 };
    const result = renderQuestion(q);
    expect(result).toContain("Q?");
    expect(result).toContain("✓ B");
  });

  it("multipleresponse: shows multiple correct answers", () => {
    const q = { kind: "multipleresponse", text: "Select all", options: ["A","B","C"], correctIndices: [0, 2] };
    const result = renderQuestion(q);
    expect(result).toContain("Select all that apply");
    expect(result).toContain("✓ A");
    expect(result).toContain("✓ C");
    expect(result).not.toContain("✓ B");
  });

  it("fillinblank: shows gap count", () => {
    const q = {
      kind: "fillinblank", text: "The {{1}} is {{2}}.",
      blanks: [{ id: "a", acceptable: ["sky"] }, { id: "b", acceptable: ["blue"] }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("2 gap");
  });

  it("matching: shows pair count", () => {
    const q = {
      kind: "matching", text: "Match",
      left: [{ id: "l1", label: "A" }], right: [{ id: "r1", label: "1" }],
      pairs: [{ leftId: "l1", rightId: "r1" }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("1 pair");
  });

  it("sorting: shows items with correct buckets", () => {
    const q = {
      kind: "sorting", text: "Sort",
      buckets: [{ id: "b1", label: "Even" }],
      items: [{ id: "i1", text: "2", bucketId: "b1" }],
    };
    const result = renderQuestion(q);
    expect(result).toContain("2");
    expect(result).toContain("Even");
  });

  it("unknown kind: renders fallback", () => {
    const result = renderQuestion({ kind: "unknown" });
    expect(result).toContain("Unknown question kind");
  });
});
```

- [ ] **Step 3: Run full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`

Expected: All tests pass. Record final test count.

---

### Task 8: Update memory + CLAUDE.md

**Files:**
- Modify: `/Users/theonavarro/.claude/projects/-Users-theonavarro-TideLearn/memory/project_roadmap.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update roadmap memory to mark Phase 2B complete**

The memory file lives at `/Users/theonavarro/.claude/projects/-Users-theonavarro-TideLearn/memory/project_roadmap.md` — outside the git repo root. Edit it directly with the Write/Edit tool; it cannot be staged with `git add`.

In `project_roadmap.md`, update Phase 2B status:
```
**Phase 2B — Assessment question types (4): ✅ DONE**
Fill-in-the-blank, matching, multiple response, drag-drop/sorting — as both blocks and assessment questions. AssessmentQuestion discriminated union migration. Validation catch-up for Phase 2A blocks.
```

- [ ] **Step 2: Update CLAUDE.md**

In the `## Audit Progress` section, add:
```
- [x] **Phase 2B — Assessment Question Types** (merged to main) — 3 new blocks (multipleresponse, fillinblank, matching), 4 new question types (+ sorting), AssessmentQuestion discriminated union, Phase 2A validation catch-up
```

In the Key Files table, update the block type count from 26 to 29.

In the Critical Rules section, add:
- `fillinblank` template uses `{{n}}` gap markers — sub-item IDs injected by `injectSubItemIds`
- `matching` pairs use `leftId`/`rightId` — MCP input uses `leftIndex`/`rightIndex`, IDs injected server-side
- `AssessmentQuestion` is now a discriminated union — always check `kind` before accessing type-specific fields

---

### Task 9: Final build + commit

- [ ] **Step 1: Full build**

Run: `cd /Users/theonavarro/TideLearn && npm run build && cd mcp && npm run build`

Expected: Both clean.

- [ ] **Step 2: Run full MCP test suite one final time**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add \
  src/types/course.ts \
  mcp/src/lib/types.ts \
  src/lib/assessment.ts \
  src/pages/AssessmentView.tsx \
  mcp/src/tools/preview.ts \
  mcp/src/resources/instructions.ts \
  src/components/blocks/editor/ButtonForm.tsx \
  src/components/blocks/editor/EmbedForm.tsx \
  src/components/blocks/editor/FlashcardForm.tsx \
  src/components/blocks/editor/TimelineForm.tsx \
  src/components/blocks/editor/ProcessForm.tsx \
  src/components/blocks/editor/ChartForm.tsx \
  src/components/blocks/editor/SortingForm.tsx \
  src/components/blocks/editor/HotspotForm.tsx \
  src/components/blocks/editor/BranchingForm.tsx \
  mcp/src/tools/__tests__/question-schema.test.ts \
  mcp/src/tools/__tests__/render-block.test.ts \
  mcp/src/tools/__tests__/inject-sub-item-ids.test.ts \
  CLAUDE.md
git commit -m "feat(2b-tier4): sorting question, Phase 2A validation catch-up, full tests

Add sorting assessment question type with Leitner grading and assessment
renderer. Apply FieldLabel required asterisks + validation messages to all
9 Phase 2A blocks (button, embed, flashcard, timeline, process, chart,
sorting, hotspot, branching). Hotspot editor shows MCP handoff banner for
unpositioned pins. Complete instructions.ts docs. Comprehensive test
coverage for all Phase 2B question types."
```
