# Plan A.5 — Courses.tsx Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Courses.tsx from `const S` style objects to Tailwind, add responsive card grid, fix cover image aspect ratio.

**Architecture:** Replace the `const S = { ... }` pattern (lines 40–349) with Tailwind `cn()` class strings throughout. Add responsive grid breakpoints. Normalise card image heights.

**Tech Stack:** React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.5)

**Depends on:** Plan A.1 (CSS vars, DM Sans font)

---

### Task 1: Delete `const S` and migrate sidebar to Tailwind

**Commands:** `/normalize` (H-1 styling split → Tailwind), `/polish` (M-8 emoji logo → SVG)

**Files:**
- Modify: `src/pages/Courses.tsx` (lines 40–349 style object, sidebar lines 914–969)

- [ ] **Step 1: Replace sidebar styles**

The sidebar uses styles from the `S` object. Convert to Tailwind:
```tsx
<aside className="w-[var(--sidebar-w-editor)] bg-[var(--ocean-mid)] text-white flex flex-col h-screen shrink-0 hidden md:flex">
```

On mobile, the sidebar is hidden entirely — the Courses page works without it since the main nav items (My Courses, Shared) can be rendered as tabs or a segmented control above the card grid on mobile. Add a simple mobile header:

```tsx
{/* Mobile header — visible only on small screens */}
<div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
  <Waves className="w-5 h-5 text-teal-600" />
  <span className="font-display text-lg font-semibold text-[var(--ocean-mid)]">TideLearn</span>
</div>
```

- [ ] **Step 2: Replace emoji logo with Lucide icon**

```tsx
import { Waves } from "lucide-react";

// Before: 🌊 emoji
// After:
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
  <Waves className="w-5 h-5 text-white" />
</div>
```

Same treatment in the empty state icon (line 1032).

- [ ] **Step 3: Convert NavItem component**

Replace the `NavItem` function's style object references with Tailwind classes:
```tsx
function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-white/15 text-white font-medium"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor(courses): migrate sidebar to Tailwind, SVG logo"
```

---

### Task 2: Migrate main content area + responsive card grid

**Commands:** `/adapt` (responsive card grid, M-9 cover image aspect ratio)

**Files:**
- Modify: `src/pages/Courses.tsx` (main area lines 972–1078, CourseCard lines 367–653)

- [ ] **Step 1: Convert main area header and layout**

Replace style object references:
```tsx
<main className="flex-1 overflow-y-auto bg-gray-50">
  <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto">
```

Add `id="main-content"` for skip link target.

- [ ] **Step 2: Convert card grid to responsive Tailwind**

Replace the auto-fill grid (line 292 in `S`):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
```

- [ ] **Step 3: Migrate CourseCard component to Tailwind**

Replace all `S.` style references. Key conversions:
```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
```

- [ ] **Step 4: Fix cover image aspect ratio (M-9)**

Add consistent aspect ratio to card cover images:
```tsx
<div className="aspect-video bg-gray-100 overflow-hidden">
  {coverUrl ? (
    <img
      src={coverUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-300">
      {/* placeholder icon */}
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor(courses): responsive card grid, aspect-ratio covers, Tailwind migration"
```

---

### Task 3: Migrate remaining components + delete `const S`

**Commands:** `/normalize` (H-1 complete const S elimination)

**Files:**
- Modify: `src/pages/Courses.tsx`

- [ ] **Step 1: Convert DropItem component**

Replace style references in the dropdown menu item component (lines 655–690):
```tsx
function DropItem({ icon, label, onClick, danger }: DropItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Convert empty state, delete dialog, and any remaining styled elements**

Ensure all elements use Tailwind. Replace any remaining `fontFamily: "Inter"` with `font-sans`.

- [ ] **Step 3: Delete the entire `const S` block**

Once every reference to `S.` has been replaced, delete lines 40–349 (the entire style object). This is the whole point of the migration.

Verify with search: `grep "S\." src/pages/Courses.tsx` should return no style references.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor(courses): delete const S style object, full Tailwind migration complete"
```

---

### Task 4: Final verification for A.5

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

- [ ] **Step 3: Visual check at 375px**

Run: `npm run dev`
- Sidebar hidden on mobile (or collapses gracefully)
- Cards stack to single column
- Cover images have consistent aspect ratio
- No horizontal scroll

- [ ] **Step 4: Visual check at 1440px**

- Sidebar visible
- Cards in 3-column grid
- Cover images uniform height
- No `const S` style references remaining
- No inline styles remaining
- SVG logo renders consistently
