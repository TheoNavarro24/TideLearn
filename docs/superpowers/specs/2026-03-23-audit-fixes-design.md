# Audit Fixes — Design Spec

**Date:** 2026-03-23
**Source:** AUDIT.md (35 issues: 7 critical, 11 high, 11 medium, 6 low)
**Strategy:** Per-file rewrites with a cross-cutting foundation plan first

## Plan Sequence

```
A.1  Cross-cutting foundations     ███░░░░░░░░░░░░░░░░░
A.2  Editor.tsx overhaul              ████████░░░░░░░░░░
A.3  View.tsx overhaul                ████████░░░░░░░░░░  (can parallel A.2)
A.4  Index.tsx overhaul                        ██████░░░
A.5  Courses.tsx overhaul                            ███
```

A.2 and A.3 are parallelisable — they share no files.

---

## A.1 — Cross-cutting foundations

**Files:** `index.css`, `tailwind.config.ts`, `App.tsx`
**Risk:** Zero — foundational tokens and small additions consumed by later plans

| Audit issue | Change |
|---|---|
| C-1 contrast failure | `--text-muted: #94a3b8` → `#64748b` |
| H-4 skip-to-content | Add visually-hidden skip link as first DOM element in `App.tsx`, revealed on focus |
| H-6 Inter typeface | Replace Inter with a distinctive sans-serif (DM Sans, Plus Jakarta Sans, or Instrument Sans) in CSS + Tailwind config + Google Fonts import |
| M-3 dark mode infra | Remove `darkMode: ["class"]` from Tailwind config, remove unused `dark:` utilities — commit to light-only for now |
| M-6 `.text-gradient` utility | Delete from `index.css` |
| L-5 `card-surface` dead CSS | Delete from `index.css` (also resolves M-4 `backdrop-blur` since the utility is dead) |
| Magic numbers | Add CSS custom properties: `--sidebar-w-editor: 220px`, `--sidebar-w-viewer: 200px`, `--topbar-h: 48px`, `--canvas-max-w: 828px`, `--reading-max-w: 680px`, `--content-px: 64px` |

### Font decision

The audit flags Inter as generic AI-slop. The replacement must:
- Pair well with Lora (the existing serif for headings)
- Have a full weight range (400–700 minimum)
- Be available on Google Fonts
- Not be on the "overused" list (Inter, Roboto, Open Sans, Arial)

**Decision: DM Sans.** Geometric, clean, good x-height, pairs well with serifs, widely available but not in the "default AI" bucket. This is locked — all subsequent plans reference it.

---

## A.2 — Editor.tsx overhaul

**File:** `src/pages/Editor.tsx` (1632 lines)
**This is the largest plan.** The editor is where users spend most time.

### Tailwind migration

- Replace all inline `style={{}}` objects with Tailwind utility classes
- Replace `const S = {}` style maps (if any) with `cn()` class strings
- Replace `onMouseEnter`/`onMouseLeave` hover handlers with Tailwind `hover:` and `group-hover:` utilities
- Remove the `<style>` tag injection in `AddBlockRow` (audit issue: style injection anti-pattern, line 1014) — move all `.bctrl`, `.abr`, `.block-item:hover`, `.picker-tile`, `.sidebar-footer-btn` CSS into a proper CSS file or Tailwind `@apply` directives
- Replace `700 + 128` arithmetic with `var(--canvas-max-w)` from A.1
- Replace hardcoded `220px`, `48px`, `64px` with CSS vars from A.1

### Responsive design

- Sidebar: collapsible on mobile (hamburger toggle, overlay on small screens)
- Canvas: replace `padding: "20px 64px 80px"` with responsive utilities (`px-4 md:px-16`)
- Grid: `grid-cols-1 md:grid-cols-[var(--sidebar-w-editor)_1fr]`
- Lesson header padding: responsive

### Accessibility — P0

| Issue | Fix |
|---|---|
| Block controls keyboard-inaccessible (hover-only) | Show on `:focus-within` on the block item, not just `:hover`. Add proper `aria-label` ("Move block up", etc.) |
| Publish modal: no dialog semantics | Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap (use Radix Dialog or manual trap), Escape to close |
| Course/lesson title `outline: none` | Replace with `focus-visible:ring-2 focus-visible:ring-teal-500` |
| `window.confirm()` blocked in SCORM iframe | Replace all 3 instances (lines 361, 380, 395) with a proper confirmation modal component (can reuse shadcn AlertDialog) |

### Accessibility — P1

| Issue | Fix |
|---|---|
| Undo/Redo no `aria-label` | Add `aria-label="Undo"` / `aria-label="Redo"` |
| Block picker: no keyboard nav | Use combobox pattern: `role="combobox"` on search input with `aria-controls` pointing to a `role="listbox"` list, `role="option"` on tiles, arrow-key navigation, Escape to close. Consider Radix Combobox. |
| Sidebar footer emoji icons | Replace ⚙️/📦 with Lucide icons (`Settings`, `Package`) or wrap in `aria-hidden` with visually-hidden label |
| Block picker 🔍 emoji | Replace with Lucide `Search` icon or `aria-hidden` |

### Interaction fixes

| Issue | Fix |
|---|---|
| "Course settings" mislabel | Rename to "Publish & Export" |
| Autosave failure silent | Add error toast on autosave failure (use existing toast system) |
| Empty lesson message refers to hidden button | Reword to not reference a hover-only element |
| Block picker: Escape doesn't close | Add `keydown` handler for Escape |
| Block type chip `fontSize: 9` | Increase to minimum 11px (`text-xs` in Tailwind) |
| `navigator.platform` deprecated | Replace with `navigator.userAgentData?.platform ?? navigator.platform` |
| "Remove lesson" no confirmation | Add confirmation (shadcn AlertDialog) |
| Publish modal heading wrong for hash links | Differentiate "Ready to share" (hash) vs "Published" (Supabase) |
| Import section unreachable | Add visible button in PublishModal to toggle import |
| Export cards emoji icons | Replace 📦/🌐/📄 with Lucide icons |

### File decomposition (required)

Editor.tsx at 1632 lines is too large. As part of A.2, extract:
- `PublishModal` → `src/components/editor/PublishModal.tsx`
- `AddBlockRow` + block picker → `src/components/editor/BlockPicker.tsx`
- `ConfirmModal` (new) → `src/components/editor/ConfirmModal.tsx` (or use shadcn AlertDialog directly)

This is a required deliverable of A.2, not optional. The main Editor.tsx should be focused on layout, state, and orchestration.

---

## A.3 — View.tsx overhaul

**File:** `src/pages/View.tsx` (999 lines)
**Can run in parallel with A.2** — no shared files.

### Tailwind migration

- Replace all inline `style={{}}` with Tailwind utilities
- Replace `onMouseEnter`/`onMouseLeave` handlers with Tailwind `hover:`
- Move `pulseStyle` module-level side effect (line 41–55) into a CSS file or `@layer` block in `index.css`
- Replace hardcoded `200px`, `48px`, `64px`, `680px` with CSS vars from A.1
- Replace `fontFamily: "Inter"` on viewer root with the new font from A.1
- Replace `fontFamily: "Inter"` in error/loading states too

### Responsive design

- Sidebar: collapsible on mobile (hidden by default, toggle to reveal as overlay)
- Reading area: replace `padding: "40px 64px 120px"` with responsive utilities
- Bottom nav: ensure no overlap with iOS browser chrome (safe area inset)
- Content area: `max-w-[var(--reading-max-w)]` with responsive horizontal padding

### Accessibility — P0

| Issue | Fix |
|---|---|
| Sidebar nav `<div onClick>` | Replace with `<button>` elements — focusable, keyboard-activatable, announced as interactive |
| Arrow key nav swallows contentEditable | Add `(e.target as HTMLElement).isContentEditable` guard |
| Error/loading states no `role="alert"` | Add `role="alert"` to error and no-course states |

### Accessibility — P1

| Issue | Fix |
|---|---|
| Topbar logo no `aria-label` | Add `aria-label="TideLearn home"`, wrap 🌊 in `aria-hidden` |
| Bottom nav arrows in text | Wrap `←`/`→` in `<span aria-hidden="true">`, add `aria-label` on buttons |
| "Mark complete" ✓ in label | Add explicit `aria-label="Mark as complete"` / `aria-label="Completed"` |
| Progress bar redundant `aria-label` | Simplify to static `aria-label="Course progress"`, keep `aria-valuenow` |

### Interaction fixes

| Issue | Fix |
|---|---|
| "View All" assessment placeholder no action | Add button/link to switch to paged mode and jump to that lesson |
| Resume button no lesson context | Show lesson title: "Resume: Lesson 3 — Savings Vehicles" |
| Progress stripe inconsistency | Unify: always track `completed.size / totalLessons` in both modes. In View All, the progress bar reflects lesson completions (not scroll depth). Scroll-based `lessonProgress` is removed. |
| Gate mode locked sections no navigation | Add "Go to previous section" link |
| `postMessage` target `"*"` | Document as intentional broadcast with a code comment — SCORM players have unpredictable origins, so scoping is not reliable |

---

## A.4 — Index.tsx overhaul

**File:** `src/pages/Index.tsx`
**Focus:** Tailwind migration + anti-pattern removal + responsive design

### Tailwind migration

- Replace all inline `style={{}}` with Tailwind utility classes
- Remove module-level constants `TEAL_GRAD`, `TEAL_GRAD_TEXT` (L-2) — use CSS vars via Tailwind
- Replace `onMouseEnter`/`onMouseLeave` with Tailwind `hover:`

### Anti-pattern removal

| Issue | Fix |
|---|---|
| H-2 gradient text on hero | Remove `TEAL_GRAD_TEXT`. Use solid teal or white for emphasis. `<em>` already differentiates |
| H-3 dark hero cyan glow | Keep ocean-dark as brand, but: remove glowing dot `boxShadow`, remove neon CTA shadow, remove radial gradient overlay, lead with line-texture overlay |
| H-5 monospace feature chips | Replace `fontFamily: "monospace"` with the new sans at reduced weight, use background-colour pill to signal technical content |
| L-1 monospace URL bar | Same treatment as H-5 |
| M-2 arrow chars in CTAs | Wrap `→`/`↓` in `<span aria-hidden="true">` or replace with Lucide icons |
| M-7 redundant copy | Drop "What it does" kicker or replace with specific descriptor |
| M-8 emoji logo | Replace 🌊 with Lucide `Waves` icon (or a minimal custom SVG if Lucide doesn't have a suitable match) for cross-platform consistency |
| L-4 hardcoded copyright year | `new Date().getFullYear()` |

### Responsive design

- Nav: responsive padding, hamburger on mobile
- Hero: responsive padding, responsive font sizes
- Feature grid: `grid-cols-1 md:grid-cols-[80px_1fr_1fr]`
- EditorCard mockup: stack to single column below `md:`, hide sidebar column (M-5)
- CTA buttons: stack vertically on mobile
- Overall: replace all fixed pixel padding with responsive Tailwind utilities

### Typography

- All `fontFamily: "Inter"` references → new font from A.1
- Preserve Lora for headings (already correct)

---

## A.5 — Courses.tsx overhaul

**File:** `src/pages/Courses.tsx`
**Smallest plan.**

### Tailwind migration

- Replace `const S = { … }` style object pattern with Tailwind `cn()` class strings
- Replace any remaining inline styles

### Responsive design

- Card grid: responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Course cover images: add `aspect-video object-cover` for consistent card heights (M-9)

### Misc

- Logo mark: if still using 🌊 emoji, replace with SVG (same as A.4)

---

## Out of scope

These are NOT part of the audit fixes:
- New block types or question types (Phase 2)
- MCP workflow changes (Phase 3)
- Dark mode implementation (deferred — we're removing the dead infrastructure in A.1)
- Any feature additions

## Testing strategy

Each plan should be verified by:
1. Visual inspection of all affected pages at 375px, 768px, and 1440px widths
2. Keyboard-only navigation through all interactive elements
3. Existing MCP test suite (`cd mcp && npm test`) still passes
4. `npm run build` succeeds with no new errors
5. `npm run lint` passes
