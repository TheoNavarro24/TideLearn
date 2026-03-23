# Plan A.5 — Courses.tsx Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task invokes one or more impeccable plugin skills — use the Skill tool to invoke them (e.g., `Skill("impeccable:normalize")`).

**Goal:** Migrate Courses.tsx from `const S` style objects to Tailwind, add responsive card grid, fix cover image aspect ratio.

**Architecture:** Replace the `const S = { ... }` pattern (lines 40–349) with Tailwind `cn()` class strings throughout. Add responsive grid breakpoints. Normalise card image heights.

**Tech Stack:** React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.5)

**Depends on:** Plan A.1 (CSS vars, DM Sans font)

**Orchestration:** All tasks touch `src/pages/Courses.tsx`. Dispatch two parallel subagents in worktrees — one handles sidebar + chrome, the other handles the card grid + content area. Phase 2 unifies, deletes `const S`, and verifies.

---

## Phase 1 — Parallel subagents (worktree isolation)

Dispatch these two subagents in parallel using `superpowers:dispatching-parallel-agents`. Each runs in its own git worktree.

---

### Task 1: Sidebar + chrome migration (Subagent A)

**Invoke:** `/normalize` then `/polish` — migrate sidebar + NavItem from const S to Tailwind, replace emoji logo

**Files:**
- Modify: `src/pages/Courses.tsx`

- [ ] **Step 1: Invoke `/normalize`**

Invoke the `impeccable:normalize` skill. Context for the skill:
- **Target file:** `src/pages/Courses.tsx`
- **Issue H-1:** Systemic styling split — this file uses `const S = { ... }` style objects (lines 40–349) while rest of app uses Tailwind. Migrate sidebar and NavItem to Tailwind.
- **Sidebar container:** Replace `S.sidebar` with `w-[var(--sidebar-w-editor)] bg-[var(--ocean-mid)] text-white flex flex-col h-screen shrink-0 hidden md:flex`.
- **NavItem component:** Replace `S.navItem` / `S.navItemActive` with `cn()`:
  ```tsx
  className={cn(
    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
    active ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
  )}
  ```
- **Mobile header:** Sidebar is `hidden md:flex` on mobile. Add a simple mobile header visible only on small screens:
  ```tsx
  <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
    <Waves className="w-5 h-5 text-teal-600" />
    <span className="font-display text-lg font-semibold text-[var(--ocean-mid)]">TideLearn</span>
  </div>
  ```

- [ ] **Step 2: Invoke `/polish`**

Invoke the `impeccable:polish` skill. Context for the skill:
- **Target file:** `src/pages/Courses.tsx`
- **Issue M-8:** Replace 🌊 emoji logo in sidebar and empty state (line 1032) with Lucide `Waves` icon:
  ```tsx
  import { Waves } from "lucide-react";
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
    <Waves className="w-5 h-5 text-white" />
  </div>
  ```

- [ ] **Step 3: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor(courses): migrate sidebar+NavItem to Tailwind, SVG logo, mobile header"
```

---

### Task 2: Card grid + content area migration (Subagent B)

**Invoke:** `/adapt` then `/normalize` — responsive card grid, cover images, CourseCard + DropItem migration

**Files:**
- Modify: `src/pages/Courses.tsx`

- [ ] **Step 1: Invoke `/adapt`**

Invoke the `impeccable:adapt` skill. Context for the skill:
- **Target file:** `src/pages/Courses.tsx`
- **Card grid:** Replace `S.grid` auto-fill pattern with responsive Tailwind: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`.
- **Issue M-9:** Course cover images have no aspect ratio constraint. Add `aspect-video object-cover` to normalise all card cover images:
  ```tsx
  <div className="aspect-video bg-gray-100 overflow-hidden">
    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
  </div>
  ```
- **Main content area:** Replace `S.main` with `flex-1 overflow-y-auto bg-gray-50` and inner wrapper with `px-6 md:px-10 py-8 max-w-7xl mx-auto`.

- [ ] **Step 2: Invoke `/normalize`**

Invoke the `impeccable:normalize` skill. Context for the skill:
- **Target file:** `src/pages/Courses.tsx`
- **CourseCard component** (lines 367–653): Replace all `S.` style references with Tailwind `cn()` class strings. Key card wrapper: `bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-teal-300 hover:shadow-md transition-all cursor-pointer`.
- **DropItem component** (lines 655–690): Replace style references:
  ```tsx
  className={cn(
    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
    danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
  )}
  ```
- **Empty state, delete dialog, any remaining styled elements:** Ensure all use Tailwind. Replace any `fontFamily: "Inter"` with `font-sans`.

- [ ] **Step 3: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor(courses): responsive card grid, aspect-ratio covers, CourseCard+DropItem Tailwind"
```

---

## Phase 2 — Unify and verify

### Task 3: Merge branches + delete `const S` + final verification

**Files:**
- Modify: `src/pages/Courses.tsx`

- [ ] **Step 1: Merge both worktree branches into the working branch**

Merge Subagent A and B branches. Resolve conflicts — Subagent A touched sidebar/chrome, Subagent B touched card grid/content. Overlap should be minimal.

- [ ] **Step 2: Delete the entire `const S` block**

Once both branches are merged, verify no `S.` references remain:
```bash
grep "S\." src/pages/Courses.tsx
```
If zero matches, delete lines 40–349 (the entire style object). This is the whole point of the migration.

- [ ] **Step 3: Add `id="main-content"` to main content area**

```tsx
<main id="main-content" className="flex-1 overflow-y-auto bg-gray-50">
```

- [ ] **Step 4: Run full build** — `npm run build` — SUCCESS
- [ ] **Step 5: Run lint** — `npm run lint` — PASS

- [ ] **Step 6: Visual check at 375px**

- Sidebar hidden, mobile header visible
- Cards stack to single column
- Cover images have consistent aspect ratio
- No horizontal scroll

- [ ] **Step 7: Visual check at 1440px**

- Sidebar visible at full width
- Cards in 3-column grid
- Cover images uniform height
- No `const S` references remaining
- No inline styles remaining
- SVG logo renders consistently

- [ ] **Step 8: Commit unified result**

```bash
git add src/pages/Courses.tsx
git commit -m "feat(courses): unified A.5 overhaul — delete const S, responsive grid, SVG logo"
```
