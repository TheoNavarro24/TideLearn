# Consistency Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the visual + a11y gap between the current editor and the reference design (`docs/Refined v2 _standalone_.html`): land the `--tl-*` token foundation, switch the default palette to the "paper" warm-neutral that the reference showcases, fix a nested-`<button>` a11y bug in `BlockItem`, clean up duplicate canvas chrome, and tokenise the last stray inline values.

**Architecture:**
- **Tokens first** — add `--tl-accent-border{,-soft}`, `--tl-sans`, `--tl-display`, `--tl-hair{,2}` so downstream work (and future theme work) has a stable vocabulary.
- **Paper-as-default, not a picker** — the reference HTML ships 5 themes, but the real gap is that its default palette is warm paper (`#f7f6f1`) while ours is cool blue-white (`#f8fbff`). Shipping paper as default closes the gap without the scope of a user-facing theme picker.
- **Then structural cleanup** — the nested-button bug and the duplicate lesson header are both correctness issues; everything else is polish.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS custom properties, Vitest

---

## Design Reference

The reference is `docs/Refined v2 _standalone_.html`. Key observations driving this plan:

- **No per-lesson "header bar" on the canvas** — block count and lesson title live only in the sidebar; the canvas starts immediately with the blocks.
- **Warm paper canvas** (`#f7f6f1`) + slightly lighter sidebar (`#faf9f4`) — not the current cool blue-white.
- **Token-driven dividers** — AddBlockRow hairlines use an accent-derived token, not a raw rgba literal.
- **Lucide icons throughout** — no emoji glyphs in UI chrome.
- **Empty states earn their space** — icon + heading + inline keyboard hint, not a bare text line.

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/__tests__/components/BlockItem.test.tsx` | Asserts no nested `<button>` when a View component is interactive; Enter/Space keyboard activation |

### Modified Files

| File | Changes |
|------|---------|
| `src/index.css` | Add `--tl-accent-border`, `--tl-accent-border-soft`, `--tl-sans`, `--tl-display`, `--tl-hair`, `--tl-hair-2` tokens. Switch default `--canvas` + `--sidebar` to paper palette. |
| `tailwind.config.ts` | Point `fontFamily.sans` / `fontFamily.display` at `var(--tl-sans)` / `var(--tl-display)` |
| `src/pages/BlockItem.tsx` | Outer wrapper becomes `<div role="button" tabIndex={0}>` with keyboard handler |
| `src/components/editor/BlockPicker.tsx` | Replace `bg-[rgba(64,200,160,0.15)]` dividers with `bg-[var(--tl-accent-border-soft)]` |
| `src/pages/Editor.tsx` | Canvas `background` → `var(--canvas)`; remove lesson-header bar; flatten max-width nesting; polish empty state |
| `src/pages/EditorSidebar.tsx` | Add per-lesson "Remove lesson" kebab affordance (replaces the removed canvas header control) |
| `src/pages/BlockInspector.tsx` | Footer emoji glyphs → Lucide icons (`ArrowUp`, `ArrowDown`, `Copy`, `Trash2`) |

---

## Task 1 — Add foundation tokens

**Files:**
- Modify: `src/index.css` (`:root` token block)
- Modify: `tailwind.config.ts` (`fontFamily.sans`, `fontFamily.display`)

Tokens added (additive — existing `--accent-hex`, `--accent-bg`, `--canvas-white`, etc. stay as-is):

```css
--tl-accent-border:      rgba(64,200,160,0.30);
--tl-accent-border-soft: rgba(64,200,160,0.15);
--tl-sans:    "DM Sans", system-ui, sans-serif;
--tl-display: "Lora", Georgia, serif;
--tl-hair:    #c8d4e0;
--tl-hair-2:  #dde3ec;
```

- [ ] **Step 1** — edit `src/index.css`: insert the 6 lines inside `:root` immediately after the existing `--accent-bg` line.
- [ ] **Step 2** — edit `tailwind.config.ts`: set `fontFamily.sans: ["var(--tl-sans)"]` and `fontFamily.display: ["var(--tl-display)"]`. The previous literal font names move into the CSS variable fallback chain, so rendering is identical.
- [ ] **Step 3** — build.

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4** — manual verify in Chrome (Control Chrome MCP): reload `/editor?courseId=<any>`, pages render with the same DM Sans + Lora fonts as before.
- [ ] **Step 5** — commit.

```bash
git add src/index.css tailwind.config.ts
git commit -m "feat(tokens): add --tl-accent-border, --tl-sans, --tl-display, --tl-hair"
```

---

## Task 2 — Switch default palette to paper (canvas + AppShell chrome)

The reference HTML showcases 5 themes but the actual default it uses is the "paper" palette — warm neutral. Our current default is cool blue-white (`#f8fbff`). Close the gap by making paper the default; a user-facing theme picker can come later as a separate initiative.

**Scope note — `--sidebar` is a shared token with three consumers**:
1. **AppShell non-editor chrome** (Courses/Settings/Changelog nav rail) — **this is the one we want to flip to paper**.
2. **View.tsx learner header** (`src/pages/View.tsx:144` — `bg-[var(--sidebar)]`) — CLAUDE.md says don't touch the dark learner header; must be pinned to a still-dark token.
3. **Landing page + Auth** (`src/pages/Index.tsx`, `src/pages/Auth.tsx`) — these use `--sidebar-2`/`--sidebar-3` directly, so they're unaffected by changing `--sidebar`.

So the edit is: flip `--sidebar` to paper, repoint `--sidebar-text`/`--sidebar-text-hover` to dark-on-paper values, and update View.tsx's one reference so the learner header stays dark.

**Files:**
- Modify: `src/index.css` (`:root` block — `--canvas`, `--sidebar`, `--sidebar-text`, `--sidebar-text-hover`)
- Modify: `src/components/AppShell.tsx:44` (swap `hsl(var(--sidebar-foreground))` for a paper-friendly token)
- Modify: `src/pages/View.tsx:144` (pin learner header to a still-dark token)

- [ ] **Step 1** — in `src/index.css` `:root`, update four lines:

```css
--canvas:              #f7f6f1;   /* was cool blue-white; now warm paper */
--sidebar:             #faf9f4;   /* was #252c38 dark gunmetal; now slightly-warmer paper */
--sidebar-text:        #6a7a90;   /* was #7a8da4 (light-on-dark); now muted ink on paper (matches --text-muted) */
--sidebar-text-hover:  #1a2030;   /* was #a0b0c4 (light-on-dark); now full ink for hover contrast */
```

Leave `--canvas-white`, `--sidebar-2`, `--sidebar-3` alone. `--canvas-white` is the near-white panel colour on block cards/inspector (pops against paper canvas). `--sidebar-2` and `--sidebar-3` remain the dark tokens used by the landing page + auth + (after step 3) the learner header.

- [ ] **Step 2** — `src/components/AppShell.tsx` line 44 currently sets the "TideLearn" wordmark colour to `hsl(var(--sidebar-foreground))` — the shadcn HSL sidebar-foreground variable resolves to `210 20% 65%` (light grey for dark bg) and will be unreadable on paper. Replace with `var(--ink)`:

```tsx
// before
style={{ color: "hsl(var(--sidebar-foreground))" }}

// after
style={{ color: "var(--ink)" }}
```

- [ ] **Step 3** — `src/pages/View.tsx` line 144 currently hard-codes `bg-[var(--sidebar)]` on the learner top header. Now that `--sidebar` is paper, the deliberate dark learner header would flip. Pin it to the still-dark token:

```tsx
// before
<header className="h-[var(--topbar-h)] bg-[var(--sidebar)] flex items-center ...

// after
<header className="h-[var(--topbar-h)] bg-[var(--sidebar-3)] flex items-center ...
```

(Any nested `var(--sidebar-text)` inside the learner header needs the same look: a grep after this step will show whether more tweaks are needed — the learner header is the deliberate dark surface per CLAUDE.md.)

- [ ] **Step 4** — grep for any remaining `--sidebar-text` usage on now-dark surfaces (View.tsx, Index.tsx, Auth.tsx) and pin to a still-light-on-dark literal colour if flipping `--sidebar-text` broke readability:

```bash
grep -rn --include='*.tsx' -- '--sidebar-text' src/
```

If View.tsx/Index.tsx/Auth.tsx reference `--sidebar-text`, swap those call sites to a light-grey literal (e.g. `text-white/70` or `#a0b0c4`) so the dark headers stay readable. AppShell references (which want dark-on-paper) keep the new token value.

- [ ] **Step 5** — build.

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6** — manual verify in Chrome (Control Chrome MCP):
  - `/editor?courseId=<any>` — canvas warm paper; block cards still pop.
  - `/courses`, `/settings`, `/changelog` — AppShell nav rail is now paper (was dark gunmetal); wordmark + NavItem labels readable in muted ink.
  - `/view?id=<any>` — learner top header stays **dark** (now pinned to `--sidebar-3`); no regression on the deliberate dark learner aesthetic.
  - `/` (landing) and `/auth` — unchanged (use `--sidebar-2`/`--sidebar-3` directly).

- [ ] **Step 7** — commit.

```bash
git add src/index.css src/components/AppShell.tsx src/pages/View.tsx
git commit -m "design: paper-default palette; AppShell chrome flips to paper, learner header pinned dark"
```

**Ripple note for Plan 3 (non-editor polish) Task 3:** that task adds `hover:bg-white/[0.04]` to `NavItem`, which only reads on a dark bg. After this task lands, swap to `hover:bg-black/[0.04]` when Plan 3 executes — or pre-announce that change in Plan 3 Task 3. (Update Plan 3 in the same PR that merges this one, or add a TODO at the top of Plan 3.)

---

## Task 3 — Fix BlockItem nested-button a11y

`src/pages/BlockItem.tsx` currently wraps `ViewComp` in a `<button>`. Several View components (`FlashcardView`, `ButtonView`, `HotspotView`, `MatchingView`, `SortingView`) render their own interactive children → invalid nested `<button>` DOM. Firefox silently drops inner clicks; Chrome warns in the console.

**Files:**
- Modify: `src/pages/BlockItem.tsx`
- Create: `src/__tests__/components/BlockItem.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/components/BlockItem.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BlockItem } from "@/pages/BlockItem";
import { getSpec } from "@/components/blocks/registry";
import { factories } from "@/types/course";

describe("BlockItem a11y", () => {
  it("does not wrap an interactive view in a nested <button>", () => {
    const block = factories.flashcard();
    const spec = getSpec("flashcard");
    const { container } = render(
      <BlockItem block={block} spec={spec} selected={false} onSelect={() => {}} />
    );
    expect(container.querySelectorAll("button button").length).toBe(0);
  });

  it("fires onSelect on Enter and Space keydown", () => {
    const block = factories.text();
    const spec = getSpec("text");
    const onSelect = vi.fn();
    const { getByRole } = render(
      <BlockItem block={block} spec={spec} selected={false} onSelect={onSelect} />
    );
    const el = getByRole("button");
    fireEvent.keyDown(el, { key: "Enter" });
    fireEvent.keyDown(el, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
```

**Why `fireEvent.keyDown` and `factories.*()`:** native `dispatchEvent(new KeyboardEvent(...))` doesn't reliably trigger React's synthetic event handlers in JSDOM — `fireEvent` from React Testing Library wraps the synthetic-event dispatch correctly. And using `factories.flashcard()` instead of an `as any` cast gives a fully-valid block (with `id`, `type`, `front`, `back`) so `FlashcardView` doesn't crash on missing fields when rendered.

- [ ] **Step 2: Run test, expect FAIL**

```bash
npx vitest run src/__tests__/components/BlockItem.test.tsx 2>&1 | tail -15
```

Expected: first test fails — flashcard has a flip button inside the outer button.

- [ ] **Step 3: Update BlockItem.tsx**

Replace the outer `<button>` with a keyboard-handling div:

```tsx
import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

interface BlockItemProps {
  block: Block;
  spec: ReturnType<typeof getSpec>;
  selected: boolean;
  onSelect: () => void;
}

export function BlockItem({ block, spec, selected, onSelect }: BlockItemProps) {
  const ViewComp = spec.View as React.ComponentType<{ block: Block }>;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      aria-label={`${spec.label} block — click to edit`}
      className={cn(
        "block-item block-card w-full text-left relative mb-0",
        "rounded-lg p-4 px-5 cursor-pointer",
        "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
        selected
          ? "ring-2 ring-[var(--accent-hex)]"
          : "hover:ring-1 hover:ring-[hsl(var(--border))]"
      )}
      style={{ background: "transparent" }}
    >
      <ViewComp block={block} />
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npx vitest run src/__tests__/components/BlockItem.test.tsx 2>&1 | tail -15
```

- [ ] **Step 5: Manual verify in Chrome** (Control Chrome MCP): open any course, select a lesson with a flashcard block. Tab to it → press Enter → inspector opens. Click the flashcard's own flip button → it flips and does NOT also reopen the inspector.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BlockItem.tsx src/__tests__/components/BlockItem.test.tsx
git commit -m "fix(a11y): BlockItem uses div[role=button] to avoid nested-button invalid DOM"
```

---

## Task 4 — Canvas background uses `--canvas`

The outer canvas scroller currently has `background: var(--canvas-white)` hard-coded. Point it at `--canvas` so it tracks the default palette change from Task 2 and is ready for any future theme work. Block cards keep `--canvas-white` (the panel colour that pops against the canvas).

**Files:**
- Modify: `src/pages/Editor.tsx:264` (the `<div>` holding the canvas scroller)

- [ ] **Step 1** — edit `src/pages/Editor.tsx`: change `style={{ background: "var(--canvas-white)" }}` on the canvas scroller to `style={{ background: "var(--canvas)" }}`.
- [ ] **Step 2** — manual verify in Chrome: canvas reads warm paper (Task 2 took effect); block cards still pop as near-white panels against it.
- [ ] **Step 3** — commit.

```bash
git add src/pages/Editor.tsx
git commit -m "refactor(editor): canvas uses --canvas (tracks default palette)"
```

---

## Task 5 — Tokenise AddBlockRow divider colour

**Files:**
- Modify: `src/components/editor/BlockPicker.tsx:97,197`

- [ ] **Step 1** — replace both occurrences of `bg-[rgba(64,200,160,0.15)]` with `bg-[var(--tl-accent-border-soft)]`.
- [ ] **Step 2** — build.

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3** — manual verify: divider line colour unchanged.
- [ ] **Step 4** — commit.

```bash
git add src/components/editor/BlockPicker.tsx
git commit -m "refactor: AddBlockRow dividers use --tl-accent-border-soft token"
```

---

## Task 6 — Remove the redundant lesson-header bar

Currently the canvas shows a header row with "N blocks" + a "Remove lesson" chip (`src/pages/Editor.tsx:267-283`). Block count is already in the sidebar; duplicating it on the canvas is visual noise. Move "Remove lesson" into a per-lesson kebab-ish affordance in the sidebar lesson list.

**Files:**
- Modify: `src/pages/Editor.tsx` (delete the header JSX; pass `onRemoveLesson` down)
- Modify: `src/pages/EditorSidebar.tsx` (lesson row gets a trailing × button visible on hover)

- [ ] **Step 1: Add `onRemoveLesson` to EditorSidebar props**

In `src/pages/EditorSidebar.tsx`:

```tsx
interface EditorSidebarProps {
  // ...existing
  onRemoveLesson: (id: string) => void;
}
```

- [ ] **Step 2: Restructure the lesson row to show a hover-× when more than one lesson exists**

Replace the lesson-list `<button>` at line ~97-113 with a grouped wrapper:

```tsx
<div key={l.id} className="group relative flex items-stretch">
  <button
    onClick={() => onSelectLesson(l.id)}
    className="flex items-center gap-2 flex-1 text-left border-none rounded-md py-[6px] px-2.5 pr-8 cursor-pointer mb-0.5 transition-colors text-xs font-medium"
    style={{ background: isActive ? "rgba(64,200,160,0.08)" : "transparent", color: isActive ? "var(--accent-hex)" : "var(--ink)" }}
  >
    <span className="text-xs font-mono font-bold min-w-[16px]" style={{ color: isActive ? "var(--accent-hex)" : "var(--text-muted)" }}>
      {String(idx + 1).padStart(2, "0")}
    </span>
    <span className="flex-1 truncate">{l.title}</span>
    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
      {l.kind === "content" ? "doc" : "quiz"}
    </span>
  </button>
  {lessons.length > 1 && (
    <button
      onClick={(e) => { e.stopPropagation(); onRemoveLesson(l.id); }}
      aria-label={`Remove lesson ${l.title}`}
      title="Remove lesson"
      className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity border-none cursor-pointer"
      style={{ background: "transparent", color: "var(--text-muted)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--destructive))")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      ✕
    </button>
  )}
</div>
```

- [ ] **Step 3: Delete the canvas lesson-header bar in Editor.tsx**

Remove the entire `{selectedLesson && (<div className="px-6 py-4 border-b" ...>...</div>)}` block around line 267-283. (It currently renders "N blocks" + a "Remove lesson" button above the canvas blocks.)

- [ ] **Step 4: Wire `onRemoveLesson` through Editor.tsx**

Pass the existing removal trigger to `EditorSidebar`:

```tsx
<EditorSidebar
  /* ...existing */
  onRemoveLesson={(id) => setLessonToRemove(id)}
/>
```

The `ConfirmModal` for `lessonToRemove` already exists (around line 404-411); leave it intact — it shows "Remove lesson?" before destroying.

- [ ] **Step 5: Build + tests**

```bash
npm run build 2>&1 | tail -15
npx vitest run 2>&1 | tail -15
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 6: Visual check**

With dev server running (`npm run dev` if needed), use Control Chrome:

```js
// Expect: false (the old "N blocks" header bar is gone)
Array.from(document.querySelectorAll('.border-b'))
  .some(el => el.textContent?.includes('blocks'));

// Hover a lesson in the sidebar — the × should appear
document.querySelector('.lesson-list .group:hover button[aria-label^="Remove lesson"]');
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Editor.tsx src/pages/EditorSidebar.tsx
git commit -m "feat: remove redundant canvas lesson header; move 'remove lesson' to sidebar"
```

---

## Task 7 — Flatten canvas max-width nesting

Currently the canvas has nested max-width containers (`canvas-max-w` wrapping `reading-max-w`). Drop one layer; content lessons live directly under `reading-max-w`.

**Files:**
- Modify: `src/pages/Editor.tsx:286-294`

- [ ] **Step 1: Replace the nested wrappers with one centred column**

Before:
```tsx
<div className="flex-1 px-4 md:px-12 py-6 pb-20">
  <div className="max-w-[var(--canvas-max-w)] mx-auto">
    {selectedLesson?.kind === "assessment" ? (
      <AssessmentEditor ... />
    ) : (
      <div className="max-w-[var(--reading-max-w)] mx-auto flex flex-col">
        ...blocks...
      </div>
    )}
  </div>
</div>
```

After:
```tsx
<div className="flex-1 px-4 md:px-12 py-6 pb-20">
  {selectedLesson?.kind === "assessment" ? (
    <AssessmentEditor
      lesson={selectedLesson}
      onChange={(updated) => pushHistory({ courseTitle, lessons: lessons.map(l => l.id === updated.id ? updated : l) })}
    />
  ) : (
    <div className="max-w-[var(--reading-max-w)] mx-auto flex flex-col">
      ...blocks...
    </div>
  )}
</div>
```

`AssessmentEditor` sets its own max-width internally.

- [ ] **Step 2: Build + visual check**

```bash
npm run build 2>&1 | tail -10
```

Open the editor — content lessons remain centred at `reading-max-w`. Assessment lessons look unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "refactor: flatten editor canvas max-width nesting"
```

---

## Task 8 — Swap BlockInspector footer emoji for Lucide icons

**Files:**
- Modify: `src/pages/BlockInspector.tsx` (imports at top, footer buttons around line 85-111)

- [ ] **Step 1** — update imports:

```tsx
import { X, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
```

- [ ] **Step 2** — replace the footer buttons. Where the existing code uses `{ label: "↑", ... }` pass-through a label string, switch to passing an Icon component. Example for the Up button:

```tsx
<button
  onClick={() => onMove(block.id, "up")}
  disabled={idx === 0}
  aria-label="Move block up"
  className={cn(
    "w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer",
    "focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none",
    idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]"
  )}
  style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
>
  <ArrowUp className="w-3.5 h-3.5" />
</button>
```

Do the same for ↓ → `ArrowDown`, ⧉ → `Copy`, ✕ (delete) → `Trash2`. The close-X in the header is already using Lucide `X` — keep as-is.

- [ ] **Step 3** — manual verify in Chrome: inspector footer icons render consistently, still clickable, disabled state still greyed.
- [ ] **Step 4** — commit.

```bash
git add src/pages/BlockInspector.tsx
git commit -m "refactor(inspector): replace emoji footer glyphs with Lucide icons"
```

---

## Task 9 — Polish the canvas empty state

When a lesson has no blocks, the canvas currently shows a single centred text line. Replace with a centred stack: icon + heading + hint with inline keyboard shortcut.

**Files:**
- Modify: `src/pages/Editor.tsx` (around line 334-338 — the empty-state JSX)

- [ ] **Step 1** — add the Sparkles import to `Editor.tsx`:

```tsx
import { Sparkles } from "lucide-react";
```

- [ ] **Step 2** — replace the empty-state JSX:

```tsx
{blocks.length === 0 && (
  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}
    >
      <Sparkles className="w-6 h-6" />
    </div>
    <h3 className="font-display text-base font-bold" style={{ color: "var(--ink)" }}>
      Empty lesson
    </h3>
    <p className="text-xs max-w-[28ch]" style={{ color: "var(--text-muted)" }}>
      Add your first block using the <span className="font-semibold">+ Add block</span> button above, or press <kbd className="text-[10px] font-mono border rounded px-1 py-0.5">/</kbd> to open the picker.
    </p>
  </div>
)}
```

- [ ] **Step 3** — manual verify: create a new content lesson; empty state shows centred icon + heading + hint. `/` shortcut still opens the picker.
- [ ] **Step 4** — commit.

```bash
git add src/pages/Editor.tsx
git commit -m "design(editor): polish empty-state with icon + inline keyboard hint"
```

---

## Final verification

- [ ] **Step 1** — full frontend tests:

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all pass (existing + new `BlockItem.test.tsx`).

- [ ] **Step 2** — MCP tests (shouldn't be affected, but sanity check):

```bash
cd mcp && npm test 2>&1 | tail -10 && cd ..
```

Expected: 238 passing.

- [ ] **Step 3** — lint + build:

```bash
npm run lint 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Fix any warnings introduced; expect clean build.

- [ ] **Step 4** — visual walkthrough with Control Chrome:
  - `/editor?courseId=<any>` — warm paper canvas; no duplicate lesson header; inspector icons are Lucide; tab-focus into a block block works; keyboard activation works.
  - `/courses`, `/settings`, `/changelog` — dark AppShell unchanged.
  - `/view?id=<any>` — learner view unchanged.

- [ ] **Step 5** — update CLAUDE.md audit progress: add one line under "Audit Progress":

```markdown
- [x] **Consistency Foundation** (merged to main) — `--tl-*` tokens, paper-default palette, `BlockItem` nested-button a11y fix, canvas cleanup (no duplicate header, flatter max-width, Lucide inspector icons, polished empty state), AddBlockRow token.
```

- [ ] **Step 6** — open PR.

```bash
# using the /commit-push-pr skill, or:
git push -u origin <branch>
gh pr create --title "Consistency foundation: tokens, paper default, a11y + editor polish" --body "$(cat <<'EOF'
## Summary
- Adds `--tl-*` token vocabulary (accent borders, fonts, hairlines)
- Default palette → paper neutrals (matches reference design)
- Fixes nested-`<button>` a11y bug in BlockItem (affected flashcard/button/hotspot/matching/sorting views)
- Editor polish: removed duplicate lesson header, flattened canvas max-width, Lucide icons in inspector footer, empty-state icon + keyboard hint

## Test plan
- [ ] All Vitest tests pass (new BlockItem a11y test included)
- [ ] MCP tests still green
- [ ] Visual check in Chrome: paper canvas, no duplicate header, inspector icons render, flashcard click flips without reopening inspector
- [ ] Courses/Settings/View unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes for Implementation

- **Tests live in `src/__tests__/`** — Vitest `include` is `src/__tests__/**/*.test.{ts,tsx}`; tests elsewhere won't run.
- **Paper default is intentional, not a theme picker.** A user-facing theme swatch UI is deliberately deferred — the reference HTML showcases theme *capability*, and the actual closeable gap is the default palette. Building a picker is separate scope.
- **Don't touch `src/pages/View.tsx` dark header.** The learner view is deliberately distinct from authoring; this plan only cleans up the editor surface.
- **`--canvas-white` stays.** It's the panel colour on block cards + inspector + sidebar section backgrounds. Renaming it would be 30+ refs and isn't the job here.
