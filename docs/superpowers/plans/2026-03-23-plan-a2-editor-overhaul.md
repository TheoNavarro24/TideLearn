# Plan A.2 — Editor.tsx Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Editor.tsx from inline styles to Tailwind, fix all P0/P1 accessibility issues, add responsive layout, fix interaction bugs, and decompose into smaller files.

**Architecture:** Extract PublishModal, BlockPicker, and ConfirmModal into `src/components/editor/`. Migrate all inline styles to Tailwind utilities. Add responsive sidebar collapse. Replace all `window.confirm()` with shadcn AlertDialog.

**Tech Stack:** React, Tailwind, shadcn/ui (AlertDialog, Dialog), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.2)

**Depends on:** Plan A.1 (CSS vars, font swap, skip link)

---

### Task 1: Extract ConfirmModal component

**Files:**
- Create: `src/components/editor/ConfirmModal.tsx`
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Create ConfirmModal using shadcn AlertDialog**

Create `src/components/editor/ConfirmModal.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Continue",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Verify shadcn AlertDialog exists**

Check that `src/components/ui/alert-dialog.tsx` exists. If not, run:
```bash
npx shadcn-ui@latest add alert-dialog
```

- [ ] **Step 3: Replace all `window.confirm()` in Editor.tsx**

In Editor.tsx, find the three `window.confirm()` calls (lines 361, 380, 395). They all guard import-with-replace operations. Replace each with a state-driven confirm modal:

Add state to Editor component:
```tsx
const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
```

Replace each `if (!window.confirm("Replace current course...")) return;` pattern with:
```tsx
setConfirmAction(() => () => {
  // ... the code that was after the confirm
});
return; // defer execution until confirm
```

Add the ConfirmModal at the end of Editor's JSX:
```tsx
<ConfirmModal
  open={confirmAction !== null}
  title="Replace course?"
  description="Replace current course with imported content? This cannot be undone."
  confirmLabel="Replace"
  onConfirm={() => { confirmAction?.(); setConfirmAction(null); }}
  onCancel={() => setConfirmAction(null)}
/>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/ConfirmModal.tsx src/pages/Editor.tsx
git commit -m "feat(editor): replace window.confirm with ConfirmModal (SCORM iframe fix)"
```

---

### Task 2: Extract PublishModal component

**Files:**
- Create: `src/components/editor/PublishModal.tsx`
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Move PublishModal to its own file**

Cut the `PublishModalProps` interface (lines 1272–1293) and the `PublishModal` component (lines 1295–1632) from Editor.tsx into `src/components/editor/PublishModal.tsx`. Add necessary imports.

- [ ] **Step 2: Convert PublishModal to Tailwind**

Replace all inline `style={{}}` in PublishModal with Tailwind classes. Key conversions:

| Inline style | Tailwind class |
|---|---|
| `position: "fixed", inset: 0` | `fixed inset-0` |
| `background: "rgba(0,0,0,0.4)"` | `bg-black/40` |
| `zIndex: 9999` | `z-[9999]` |
| `width: 500, maxHeight: "90vh"` | `w-[500px] max-h-[90vh]` |
| `borderRadius: 16` | `rounded-2xl` |
| `gridTemplateColumns: "repeat(3, 1fr)"` | `grid grid-cols-3` |

- [ ] **Step 3: Add dialog semantics (P0)**

On the modal content wrapper, add:
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="publish-modal-title"
  className="fixed inset-0 z-[9999] flex items-center justify-center"
  onKeyDown={(e) => e.key === "Escape" && onClose()}
>
```

Add `id="publish-modal-title"` to the heading element.

- [ ] **Step 4: Use shadcn Dialog for focus trap**

Wrap the PublishModal content in shadcn Dialog (which uses Radix under the hood). This provides focus trap, Escape-to-close, and ARIA for free. **Remove** the manual `role="dialog"` / `aria-modal` / `onKeyDown` from Step 3 — Dialog handles all of that automatically.

```tsx
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto p-0">
    <DialogTitle id="publish-modal-title">
      {course.supabaseId ? "Your course is published" : "Ready to share"}
    </DialogTitle>
    {/* ... rest of modal content ... */}
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Fix heading for hash vs live courses**

Change the heading logic:
```tsx
// Before
<h2>Your course is live</h2>
// After
<h2 id="publish-modal-title">
  {course.supabaseId ? "Your course is published" : "Ready to share"}
</h2>
```

- [ ] **Step 6: Replace emoji icons with Lucide**

```tsx
import { Package, Globe, FileJson } from "lucide-react";
// Replace 📦 with <Package className="w-5 h-5" />
// Replace 🌐 with <Globe className="w-5 h-5" />
// Replace 📄 with <FileJson className="w-5 h-5" />
```

- [ ] **Step 7: Make import section reachable**

Add a visible "Import course" button in the PublishModal footer area (not hidden behind a state toggle that's unreachable).

- [ ] **Step 8: Update Editor.tsx import**

```tsx
import { PublishModal } from "@/components/editor/PublishModal";
```

Remove the old inline PublishModal code from Editor.tsx.

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 10: Commit**

```bash
git add src/components/editor/PublishModal.tsx src/pages/Editor.tsx
git commit -m "feat(editor): extract PublishModal with dialog semantics, Lucide icons, a11y"
```

---

### Task 3: Extract BlockPicker component

**Files:**
- Create: `src/components/editor/BlockPicker.tsx`
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Move AddBlockRow and picker to own file**

Cut the `AddBlockRowProps` interface (lines 981–992) and `AddBlockRow` component (lines 994–1173) from Editor.tsx into `src/components/editor/BlockPicker.tsx`.

- [ ] **Step 2: Remove the injected `<style>` tag**

The `<style>` block at lines 1014–1026 must be removed. Move those CSS rules into `src/index.css` inside `@layer components`:

```css
@layer components {
  /* Editor block controls */
  .abr { @apply opacity-0 transition-opacity duration-150; }
  .abr-container:hover .abr,
  .abr.open { @apply opacity-100; }
  .block-item:hover .bctrl,
  .block-item:focus-within .bctrl { @apply opacity-100; }
  .bctrl { @apply opacity-0 transition-opacity duration-150; }
}
```

Note the addition of `:focus-within` — this is the P0 accessibility fix for block controls being hover-only.

- [ ] **Step 3: Convert BlockPicker to Tailwind**

Replace all inline styles with Tailwind utilities. Key conversions for the picker popup, search input, category grid, and tiles.

- [ ] **Step 4: Add combobox ARIA pattern (P1)**

On the search input:
```tsx
<input
  role="combobox"
  aria-expanded={true}
  aria-controls="block-picker-list"
  aria-activedescendant={activeOptionId}
  // ...
/>
```

On the tile container:
```tsx
<div role="listbox" id="block-picker-list">
  {tiles.map((tile, i) => (
    <button
      role="option"
      id={`block-option-${i}`}
      aria-selected={i === activeIndex}
      // ...
    />
  ))}
</div>
```

- [ ] **Step 5: Add arrow-key navigation and Escape**

Add a `keydown` handler on the picker container:
- `ArrowDown` / `ArrowRight`: move to next tile
- `ArrowUp` / `ArrowLeft`: move to previous tile
- `Enter`: select active tile
- `Escape`: close picker

- [ ] **Step 6: Replace 🔍 with Lucide Search icon**

```tsx
import { Search } from "lucide-react";
// Replace 🔍 with <Search className="w-4 h-4 text-gray-400" />
```

- [ ] **Step 7: Update Editor.tsx import**

```tsx
import { AddBlockRow } from "@/components/editor/BlockPicker";
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 9: Commit**

```bash
git add src/components/editor/BlockPicker.tsx src/pages/Editor.tsx src/index.css
git commit -m "feat(editor): extract BlockPicker with combobox ARIA, keyboard nav, no style injection"
```

---

### Task 4: Migrate Editor.tsx topbar to Tailwind

**Files:**
- Modify: `src/pages/Editor.tsx` (lines 495–659)

- [ ] **Step 1: Convert topbar container**

Replace the topbar div's inline styles (lines 495–506) with Tailwind:
```tsx
<div className="col-span-2 flex items-center gap-2 px-4 border-b border-[var(--border-default)] bg-white h-[var(--topbar-h)]">
```

- [ ] **Step 2: Convert back button, divider, course title input**

Key conversions:
- Back link: `flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--teal-bright)] no-underline`
- Course title input: Replace `outline: "none"` with `outline-none focus-visible:ring-2 focus-visible:ring-teal-500` (P0 fix)
- Font: use `font-display` (Lora via Tailwind) or `font-sans` (DM Sans) as appropriate

- [ ] **Step 3: Convert undo/redo buttons + add aria-labels (P1)**

```tsx
<button aria-label="Undo" title="Undo (Ctrl+Z)" className="...">↩</button>
<button aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className="...">↪</button>
```

- [ ] **Step 4: Convert save indicator, preview, save, publish buttons**

Replace all inline styles with Tailwind utilities.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "refactor(editor): migrate topbar to Tailwind, add focus rings and aria-labels"
```

---

### Task 5: Migrate Editor.tsx sidebar to Tailwind + responsive

**Files:**
- Modify: `src/pages/Editor.tsx` (lines 663–819)

- [ ] **Step 1: Add mobile sidebar state**

Add to Editor component:
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

- [ ] **Step 2: Convert sidebar to Tailwind with responsive collapse**

```tsx
{/* Mobile overlay backdrop */}
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-20 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
<aside className={cn(
  "fixed md:relative z-30 md:z-auto",
  "w-[var(--sidebar-w-editor)] h-full",
  "bg-[var(--ocean-mid)] text-white flex flex-col",
  "transition-transform md:transition-none",
  sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
)}>
```

- [ ] **Step 3: Add hamburger toggle to topbar (mobile only)**

Add a menu button at the start of the topbar, visible only on mobile:
```tsx
<button
  className="md:hidden p-2"
  aria-label="Toggle sidebar"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  <Menu className="w-5 h-5" />
</button>
```

- [ ] **Step 4: Convert lesson list items**

Replace `onMouseEnter`/`onMouseLeave` handlers with Tailwind `hover:bg-[#f0fdfb]/10` (or appropriate dark-on-dark hover).

- [ ] **Step 5: Replace sidebar footer emoji icons (P1)**

```tsx
import { Settings, Package } from "lucide-react";
// ⚙️ Course settings → <Settings className="w-4 h-4" /> Publish & Export
// 📦 Export SCORM → <Package className="w-4 h-4" /> Export SCORM
```

Also rename "Course settings" to "Publish & Export" (interaction fix).

- [ ] **Step 6: Verify build and responsive**

Run: `npm run build` — SUCCESS
Run: `npm run dev` — check at 375px: sidebar should be hidden, hamburger visible.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "refactor(editor): migrate sidebar to Tailwind, add responsive collapse"
```

---

### Task 6: Migrate Editor.tsx canvas/content area to Tailwind + responsive

**Files:**
- Modify: `src/pages/Editor.tsx` (lines 822–947)

- [ ] **Step 1: Convert root grid layout**

Replace the inline grid (lines 481–488):
```tsx
<div className="grid grid-cols-1 md:grid-cols-[var(--sidebar-w-editor)_1fr] grid-rows-[var(--topbar-h)_1fr] h-screen overflow-hidden">
```

- [ ] **Step 2: Convert canvas container**

Replace inline `padding: "20px 64px 80px"` and `maxWidth: 700 + 128`:
```tsx
<div className="flex-1 overflow-y-auto px-4 md:px-16 py-5 pb-20">
  <div className="max-w-[var(--canvas-max-w)] mx-auto">
```

- [ ] **Step 3: Convert lesson header**

Replace inline padding, font families. Lesson title input: replace `outline: "none"` with `outline-none focus-visible:ring-2 focus-visible:ring-teal-500` (P0 fix).

- [ ] **Step 4: Add `id="main-content"` to canvas**

Add `id="main-content"` to the canvas container so the skip link from A.1 works:
```tsx
<main id="main-content" className="flex-1 overflow-y-auto ...">
```

- [ ] **Step 5: Fix empty lesson message**

Replace "Click '+ Add block' above" with wording that doesn't reference a hover-only element:
```tsx
"No blocks yet. Use the + button or press / to add your first block."
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 7: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "refactor(editor): migrate canvas to Tailwind, responsive padding, fix empty message"
```

---

### Task 7: Migrate BlockItem to Tailwind + accessibility fixes

**Files:**
- Modify: `src/pages/Editor.tsx` (BlockItem component, lines 1187–1270)

- [ ] **Step 1: Convert BlockItem to Tailwind**

Replace all inline styles with Tailwind utilities.

- [ ] **Step 2: Fix block controls accessibility (P0)**

Block controls are now visible on `:focus-within` (done in Task 3's CSS). Now fix the `aria-label` values:

```tsx
<button aria-label="Move block up" className="bctrl-btn ...">↑</button>
<button aria-label="Move block down" className="bctrl-btn ...">↓</button>
<button aria-label="Duplicate block" className="bctrl-btn ...">⧉</button>
<button aria-label="Delete block" className="bctrl-btn del ...">✕</button>
```

- [ ] **Step 3: Fix block type chip font size**

Replace `fontSize: 9` with `text-xs` (12px, Tailwind's smallest standard size — above the 11px minimum).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "refactor(editor): migrate BlockItem to Tailwind, fix block control a11y"
```

---

### Task 8: Remaining interaction fixes

**Files:**
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Fix navigator.platform deprecation**

Find line 293:
```tsx
// Before
const isMac = navigator.platform.toUpperCase().includes("MAC");
// After
const isMac = (navigator as any).userAgentData?.platform === "macOS"
  || navigator.platform?.toUpperCase().includes("MAC");
```

- [ ] **Step 2: Add autosave failure toast**

Find the autosave `catch` block (around line 257 area where `console.error("Autosave failed:", e)` is):
```tsx
import { toast } from "sonner";

// In the catch block:
catch (e) {
  console.error("Autosave failed:", e);
  toast.error("Autosave failed — your changes may not be saved");
}
```

- [ ] **Step 3: Add "Remove lesson" confirmation**

Find the remove lesson handler (line 862 area). Wrap in a confirm flow:
```tsx
const [lessonToRemove, setLessonToRemove] = useState<string | null>(null);

// onClick handler:
onClick={() => setLessonToRemove(selectedLesson.id)}

// Add another ConfirmModal:
<ConfirmModal
  open={lessonToRemove !== null}
  title="Remove lesson?"
  description="This lesson and all its content will be permanently removed."
  confirmLabel="Remove"
  onConfirm={() => { removeLesson(lessonToRemove!); setLessonToRemove(null); }}
  onCancel={() => setLessonToRemove(null)}
/>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "fix(editor): autosave toast, lesson remove confirm, navigator.platform update"
```

---

### Task 9: Final verification for A.2

- [ ] **Step 1: Run full build**

```bash
npm run build
```
Expected: SUCCESS

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: PASS

- [ ] **Step 3: Run MCP tests**

```bash
cd mcp && npm test
```
Expected: All 173+ tests pass.

- [ ] **Step 4: Visual check at 375px**

Run: `npm run dev`
- Sidebar hidden on mobile, hamburger visible
- Canvas full-width with responsive padding
- Block controls visible on keyboard focus
- Publish modal has proper dialog behavior (Escape closes, focus trapped)

- [ ] **Step 5: Visual check at 1440px**

- Sidebar visible, layout unchanged from before
- All Tailwind conversions match previous visual appearance
- No inline styles remaining in Editor.tsx

- [ ] **Step 6: Keyboard navigation check**

Tab through the editor:
- Skip link → topbar buttons → sidebar items → canvas
- Block controls appear on focus
- Publish modal traps focus
- Block picker navigable with arrow keys
- Escape closes picker and modal
