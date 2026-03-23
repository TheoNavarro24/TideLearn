# Plan A.3 — View.tsx Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite View.tsx from inline styles to Tailwind, fix all P0/P1 accessibility issues, add responsive layout, fix interaction bugs.

**Architecture:** Migrate all inline styles to Tailwind. Add responsive sidebar collapse. Replace `<div onClick>` nav with `<button>`. Move pulse animation to CSS. Unify progress tracking.

**Tech Stack:** React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.3)

**Depends on:** Plan A.1 (CSS vars, font swap)
**Can run in parallel with:** Plan A.2 (no shared files)

---

### Task 1: Move pulseStyle to CSS

**Commands:** `/normalize` (module-level side effect → proper CSS)

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/View.tsx` (lines 39–54)

- [ ] **Step 1: Add pulse-ring keyframe to index.css**

In `src/index.css`, add at the bottom (outside any `@layer`):
```css
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 3px rgba(20,184,166,0.25); }
  50%       { box-shadow: 0 0 0 5px rgba(20,184,166,0.1); }
}
```

- [ ] **Step 2: Remove module-level side effect from View.tsx**

Delete the `pulseStyle` constant and the `if (typeof document !== "undefined")` block (lines 39–54). The CSS is now in `index.css`.

- [ ] **Step 3: Verify the dot animation still references the keyframe**

Search View.tsx for where `pulse-ring` is applied (around line 433). Ensure it references the animation by name — it should work since the keyframe is now global CSS.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/pages/View.tsx
git commit -m "refactor(viewer): move pulse-ring animation to CSS, remove module-level side effect"
```

---

### Task 2: Migrate header/topbar to Tailwind

**Commands:** `/typeset` (Inter → DM Sans), `/harden` (logo aria-label), `/clarify` (resume button context)

**Files:**
- Modify: `src/pages/View.tsx` (lines 461–578)

- [ ] **Step 1: Convert header container**

Replace inline styles with:
```tsx
<header className="h-[var(--topbar-h)] flex items-center justify-between px-4 md:px-8 border-b border-[#e0fdf4] bg-white shrink-0">
```

- [ ] **Step 2: Convert logo link + add aria-label (P1)**

```tsx
<a href="/courses" aria-label="TideLearn home" className="flex items-center gap-2 no-underline">
  <span aria-hidden="true" className="...">🌊</span>
  <span className="font-display text-lg font-semibold text-[var(--ocean-mid)]">TideLearn</span>
</a>
```

- [ ] **Step 3: Convert view mode toggle, resume button, exit link**

Replace all inline `fontFamily: "Inter, sans-serif"` with `font-sans` (which now maps to DM Sans from A.1).

For the resume button, add lesson context:
```tsx
// Before
<button>Resume</button>
// After
<button>Resume: {currentLesson?.title || "Continue"}</button>
```

- [ ] **Step 4: Convert progress bar + fix aria-label (P1)**

```tsx
<div
  role="progressbar"
  aria-label="Course progress"
  aria-valuenow={Math.round(courseProgress)}
  aria-valuemin={0}
  aria-valuemax={100}
  className="h-[3px] w-full bg-gray-100 shrink-0"
>
  <div
    className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-300"
    style={{ width: `${courseProgress}%` }}
  />
</div>
```

Remove the redundant percentage from `aria-label` — keep it static.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/View.tsx
git commit -m "refactor(viewer): migrate header to Tailwind, fix logo aria-label, resume context"
```

---

### Task 3: Migrate sidebar to Tailwind + responsive + P0 fix

**Commands:** `/harden` (div onClick → button, keyboard-accessible sidebar), `/adapt` (responsive sidebar collapse)

**Files:**
- Modify: `src/pages/View.tsx` (lines 584–667)

- [ ] **Step 1: Add mobile sidebar state**

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

- [ ] **Step 2: Replace `<div onClick>` nav items with `<button>` (P0)**

This is the most critical accessibility fix in the viewer. Every sidebar lesson item (line 610) must change from `<div onClick>` to `<button>`:

```tsx
// Before
<div key={l.id} onClick={() => { ... }} style={{ cursor: "pointer", ... }}>

// After
<button
  key={l.id}
  onClick={() => { ... }}
  className={cn(
    "w-full text-left px-3 py-2 flex items-center gap-2 rounded-md text-sm",
    "hover:bg-[#f0fdfb] transition-colors",
    isActive && "bg-[#f0fdfb] font-medium"
  )}
>
```

- [ ] **Step 3: Convert sidebar container with responsive collapse**

```tsx
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-20 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
<nav
  aria-label="Lesson navigation"
  className={cn(
    "fixed md:relative z-30 md:z-auto",
    "w-[var(--sidebar-w-viewer)] h-full",
    "bg-white border-r border-[#e0fdf4] flex flex-col shrink-0",
    "transition-transform md:transition-none",
    sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  )}
>
```

- [ ] **Step 4: Add hamburger toggle to header (mobile only)**

```tsx
import { Menu } from "lucide-react";

// In header, before the logo:
<button
  className="md:hidden p-2 -ml-2"
  aria-label="Toggle lesson list"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  <Menu className="w-5 h-5" />
</button>
```

- [ ] **Step 5: Remove onMouseEnter/onMouseLeave handlers**

Delete the hover handlers on sidebar items — Tailwind `hover:` class handles this now.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 7: Commit**

```bash
git add src/pages/View.tsx
git commit -m "feat(viewer): sidebar div→button (P0 a11y), responsive collapse, Tailwind"
```

---

### Task 4: Migrate main content area to Tailwind + responsive

**Commands:** `/adapt` (responsive reading area padding), `/harden` ("Mark complete" aria-label), `/clarify` ("View All" assessment placeholder action, gate mode navigation)

**Files:**
- Modify: `src/pages/View.tsx` (lines 670–880)

- [ ] **Step 1: Convert layout container**

Replace the flex root (line 581):
```tsx
<div className="flex flex-1 overflow-hidden">
```

- [ ] **Step 2: Convert main reading area**

```tsx
<main id="main-content" className="flex-1 overflow-y-auto">
  <div className="max-w-[var(--reading-max-w)] mx-auto px-4 md:px-16 py-10 pb-32">
```

The `id="main-content"` connects to the skip link from A.1.

- [ ] **Step 3: Convert paged mode lesson view**

Replace all inline styles for breadcrumb, title, block content, and completion button. Replace `fontFamily: "Inter"` with `font-sans`.

- [ ] **Step 4: Fix "Mark complete" button aria (P1)**

```tsx
<button
  aria-label={isCompleted ? "Completed" : "Mark as complete"}
  aria-pressed={isCompleted}
  className="..."
>
  {isCompleted ? (
    <><span aria-hidden="true">✓ </span>Completed</>
  ) : (
    "Mark complete"
  )}
</button>
```

- [ ] **Step 5: Convert View All mode**

Replace all inline styles. For the assessment placeholder, add an action link:

```tsx
// Before
<div style={{ fontStyle: "italic" }}>
  Assessment: {questions.length} questions — navigate to this lesson to take the assessment.
</div>

// After
<div className="italic text-[var(--text-muted)]">
  Assessment: {questions.length} questions —{" "}
  <button
    className="text-teal-600 hover:underline font-medium not-italic"
    onClick={() => { setIsPaged(true); setCurrentLessonId(lesson.id); }}
  >
    Take assessment
  </button>
</div>
```

- [ ] **Step 6: Fix gate mode locked section navigation**

Add a "Go to previous section" button:
```tsx
<button
  className="text-teal-600 hover:underline text-sm mt-1"
  onClick={() => { const prev = lessons.findLast((l, i) => i < lessonIdx && !isGated(l)); if (prev) { setCurrentLessonId(prev.id); setIsPaged(true); } }}
>
  Go to previous section
</button>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 8: Commit**

```bash
git add src/pages/View.tsx
git commit -m "refactor(viewer): migrate content area to Tailwind, responsive padding, a11y fixes"
```

---

### Task 5: Migrate bottom nav to Tailwind + accessibility fixes

**Commands:** `/adapt` (iOS safe area inset), `/harden` (arrow chars aria-hidden, aria-labels on prev/next)

**Files:**
- Modify: `src/pages/View.tsx` (lines 883–995)

- [ ] **Step 1: Convert bottom nav container**

```tsx
<nav
  aria-label="Lesson pagination"
  className={cn(
    "fixed bottom-0 inset-x-0 h-14 flex items-center justify-between px-4 md:px-8",
    "bg-white border-t border-[#e0fdf4] z-10",
    "pb-[env(safe-area-inset-bottom)]"
  )}
>
```

Note `pb-[env(safe-area-inset-bottom)]` for iOS safe area (prevents overlap with browser chrome).

- [ ] **Step 2: Fix arrow characters in buttons (P1)**

```tsx
// Previous button
<button aria-label="Previous lesson" className="...">
  <span aria-hidden="true">← </span>Previous lesson
</button>

// Next button
<button aria-label="Next lesson" className="...">
  Next lesson<span aria-hidden="true"> →</span>
</button>
```

- [ ] **Step 3: Remove onMouseEnter/onMouseLeave handlers**

Delete hover handlers on prev/next buttons — replace with Tailwind `hover:` classes.

- [ ] **Step 4: Replace `fontFamily: "Inter"` with `font-sans`**

All bottom nav button font references should use the Tailwind class instead.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/View.tsx
git commit -m "refactor(viewer): migrate bottom nav to Tailwind, fix arrow a11y, iOS safe area"
```

---

### Task 6: Fix remaining P0/P1 and interaction issues

**Commands:** `/harden` (arrow key contentEditable guard, role="alert" on error states, progress bar aria-label), `/clarify` (progress stripe unification, postMessage documentation)

**Files:**
- Modify: `src/pages/View.tsx`

- [ ] **Step 1: Fix arrow key navigation guard (P0)**

Find the keyboard handler (line 362 area). Add contentEditable guard:
```tsx
const onKey = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  if (el?.tagName && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
  if (el?.isContentEditable) return; // NEW: guard for TipTap, accordions, etc.
  if (e.key === "ArrowLeft") { e.preventDefault(); go("prev"); }
  if (e.key === "ArrowRight") { e.preventDefault(); go("next"); }
};
```

- [ ] **Step 2: Add role="alert" to error/loading states (P0)**

```tsx
// Error state (line 377 area)
<main role="alert" className="...">
  <h1>Error</h1>
  ...
</main>

// No-course state (line 387 area)
<main role="alert" className="...">
  <h1>Course not found</h1>
  ...
</main>
```

Also convert these states from inline styles to Tailwind. Replace `fontFamily: "Inter"` with `font-sans`.

- [ ] **Step 3: Unify progress tracking**

Remove `lessonProgress` (scroll-based tracking). The progress bar should always use `completed.size / totalLessons` in both paged and View All modes.

Find and remove the scroll-based `lessonProgress` calculation (lines 338–359 area). The `courseProgress` calculation (line 419) already uses completion count — ensure it's the only thing driving the progress bar width.

- [ ] **Step 4: Document postMessage target origin**

Find the two `postMessage` calls (lines 235, 291 area). Add code comments:
```tsx
// SCORM bridge: target origin is "*" intentionally — SCORM players
// serve content from unpredictable origins, so scoping is not reliable.
window.parent.postMessage(msg, "*");
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/View.tsx
git commit -m "fix(viewer): arrow key contentEditable guard, role=alert, progress unification"
```

---

### Task 7: Final verification for A.3

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
- Open a course in viewer
- Sidebar hidden on mobile, hamburger visible
- Reading area full-width with responsive padding
- Bottom nav doesn't overlap iOS browser chrome area
- Progress bar visible and reflects completion count

- [ ] **Step 5: Visual check at 1440px**

- Sidebar visible at 200px width
- Reading area centered, max-width 680px
- Layout matches previous appearance
- No inline styles remaining in View.tsx

- [ ] **Step 6: Keyboard navigation check**

Tab through the viewer:
- Skip link → header buttons → sidebar lesson buttons → main content → bottom nav
- Sidebar items are focusable (they're buttons now)
- Arrow keys don't swallow navigation in contentEditable areas
- Previous/Next buttons have clean screen reader labels (no "left arrow")
