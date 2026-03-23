# Plan A.4 — Index.tsx (Landing Page) Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task invokes one or more impeccable plugin skills — use the Skill tool to invoke them (e.g., `Skill("impeccable:distill")`).

**Goal:** Rewrite landing page from inline styles to Tailwind, remove AI-slop anti-patterns (gradient text, glow effects, monospace chips), add responsive design, fix typography.

**Architecture:** Full Tailwind migration. Strip `TEAL_GRAD`/`TEAL_GRAD_TEXT`/`OCEAN_DEEP` constants — use CSS vars. Replace emoji logo with Lucide icon. Make all sections responsive.

**Tech Stack:** React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.4)

**Depends on:** Plan A.1 (CSS vars, DM Sans font, contrast fix)

**Orchestration:** All tasks in Phase 1 touch `src/pages/Index.tsx`. Dispatch parallel subagents in isolated worktrees — each handles a different concern. Phase 2 unifies the branches and verifies.

---

## Phase 1 — Parallel subagents (worktree isolation)

Dispatch these three subagents in parallel using `superpowers:dispatching-parallel-agents`. Each runs in its own git worktree so edits don't conflict.

---

### Task 1: Visual anti-pattern removal (Subagent A)

**Invoke:** `/distill` then `/polish` — strip hero anti-patterns, replace emoji with SVG, fix monospace chips

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Invoke `/distill`**

Invoke the `impeccable:distill` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- **Issue H-2:** Gradient text on hero headline (`TEAL_GRAD_TEXT` on `<em>`, lines 543–553). Replace with solid teal emphasis: `<em className="text-teal-400 not-italic font-semibold">`.
- **Issue H-3:** Dark hero with cyan glow effects (lines 466–527). Remove:
  - Radial gradient overlay in background
  - Glowing dot `boxShadow: "0 0 8px #14b8a6"` on eyebrow pill
  - Neon CTA button shadow
  - Keep: dark ocean background, line-texture overlay (that's the good part)
- **Delete** module-level constants `TEAL_GRAD`, `TEAL_GRAD_TEXT`, `OCEAN_DEEP` (lines 6–8) — use CSS vars via Tailwind instead (L-2).

- [ ] **Step 2: Invoke `/polish`**

Invoke the `impeccable:polish` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- **Issue M-8:** Replace 🌊 emoji logo with Lucide `Waves` icon in both Nav (line 51) and footer (line 728):
  ```tsx
  import { Waves } from "lucide-react";
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
    <Waves className="w-5 h-5 text-white" />
  </div>
  ```
- **Issue H-5:** Replace `fontFamily: "monospace"` in feature visual chips (lines 438–447) with sans pill styling: `font-sans text-sm font-medium bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg`.
- **Issue L-1:** Same monospace fix in EditorCard URL bar (line 192).

- [ ] **Step 3: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "fix(landing): strip gradient text, glow effects, emoji→SVG, monospace→pills"
```

---

### Task 2: Responsive layout (Subagent B)

**Invoke:** `/adapt` — make entire landing page responsive across all sections

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Invoke `/adapt`**

Invoke the `impeccable:adapt` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- **Issue C-2:** Entire file has zero responsive design. No `@media`, no Tailwind responsive prefixes, no breakpoints. On mobile: nav overlaps, features collapse unreadably, EditorCard overflows.
- **Nav:** Replace fixed `padding: "18px 56px"` with `px-6 md:px-14`. Add mobile hamburger with overlay dropdown (hidden md:flex for desktop links, md:hidden for hamburger). Add state `mobileNavOpen`, close on link click and Escape.
- **Hero:** Responsive padding `pt-32 md:pt-40 pb-20 md:pb-32 px-6 md:px-14`. Responsive headline sizing `text-4xl md:text-6xl lg:text-7xl`. CTA buttons stack vertically on mobile.
- **Issue M-5:** EditorCard mockup — stack to single column below `md:`, hide sidebar: `grid-cols-1 md:grid-cols-[220px_1fr]` with sidebar `hidden md:block`.
- **Features grid:** `grid-cols-1 md:grid-cols-[80px_1fr_1fr]` with `gap-6 md:gap-8`.
- **Footer:** Responsive padding `px-6 md:px-14`.
- **Replace all** `onMouseEnter`/`onMouseLeave` handlers with Tailwind `hover:` utilities.
- **Migrate all remaining** inline `style={{}}` objects to Tailwind utilities — not just the named sections above. Every `style={{` in the file should be eliminated.

- [ ] **Step 2: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(landing): responsive layout across all sections (WCAG 1.4.10)"
```

---

### Task 3: Accessibility + copy + typography (Subagent C)

**Invoke:** `/harden` then `/clarify` then `/typeset` — a11y fixes, copy cleanup, font migration

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Invoke `/harden`**

Invoke the `impeccable:harden` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- **Issue M-1:** `#94a3b8` text on dark EditorCard mockup background (`#0d1f1d`) yields 3.5:1. Replace with `#cbd5e1` (passes AA).
- **Issue M-2:** Arrow characters in CTA copy ("Start authoring →", "See what it does ↓") are read aloud by screen readers. Wrap in `<span aria-hidden="true">`.

- [ ] **Step 2: Invoke `/clarify`**

Invoke the `impeccable:clarify` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- **Issue M-7:** Redundant copy — "What it does" kicker above "Everything you need. Nothing you don't." heading (lines 647–690). Drop the kicker entirely or replace with a specific descriptor.
- **Issue L-4:** Footer copyright year hardcoded `© 2026`. Replace with `{new Date().getFullYear()}`.

- [ ] **Step 3: Invoke `/typeset`**

Invoke the `impeccable:typeset` skill. Context for the skill:
- **Target file:** `src/pages/Index.tsx`
- Replace all remaining `fontFamily: "Inter"` and `fontFamily: "Inter, sans-serif"` references with Tailwind `font-sans` class (which now maps to DM Sans from A.1).
- **Do not change** Lora serif references — those are correct and intentional for headings.

- [ ] **Step 4: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "fix(landing): a11y contrast+arrows, drop redundant copy, Inter→DM Sans"
```

---

## Phase 2 — Unify and verify

### Task 4: Merge parallel branches + final cleanup

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Merge all three worktree branches into the working branch**

Merge Subagent A, B, and C branches sequentially. Resolve any conflicts — most will be in `src/pages/Index.tsx`. The anti-pattern removal (A) and responsive layout (B) may conflict on the same elements; prefer B's Tailwind classes with A's content changes applied on top.

- [ ] **Step 2: Add `id="main-content"` to first content section**

Add the skip link target (from A.1) to the main content area:
```tsx
<main id="main-content">
```

- [ ] **Step 3: Verify no inline styles remain**

Search for `style={{` in Index.tsx — should return zero results.

- [ ] **Step 4: Run full build** — `npm run build` — SUCCESS
- [ ] **Step 5: Run lint** — `npm run lint` — PASS
- [ ] **Step 6: Run MCP tests** — `cd mcp && npm test` — all 173+ pass (sanity check, A.4 touches no MCP code)

- [ ] **Step 7: Start dev server and open browser**

Start the dev server and open a Chromium browser for visual verification:
```bash
npm run dev
```
Use the Chrome DevTools MCP (`chrome-devtools`) or Claude Preview tools to open the app at `http://localhost:8080`. Log in with Google using your credentials (stored in memory) — you have a registered TideLearn account.

- [ ] **Step 8: Visual check at 375px**

Resize the browser to 375px width. Take a screenshot. Verify:
- Hamburger nav visible, links hidden
- Hero text readable, no overflow
- EditorCard: sidebar hidden, single column
- Feature rows: stacked vertically
- CTA buttons: stacked vertically
- No horizontal scroll

- [ ] **Step 9: Visual check at 768px**

Resize to 768px. Take a screenshot. Verify:
- EditorCard: two-column layout still fits
- Feature grid: three-column or graceful wrap
- Nav: desktop links visible (above md breakpoint)
- No horizontal scroll

- [ ] **Step 10: Visual check at 1440px**

Resize to 1440px. Take a screenshot. Verify:
- Full nav visible
- Hero: no gradient text, no glow effects, clean teal emphasis
- EditorCard: two-column layout
- Feature grid: three-column
- No monospace font in chips or URL bar
- No inline styles remaining

- [ ] **Step 11: Anti-pattern verification**

On the 1440px view, confirm removal of: gradient text, glowing dot, neon CTA shadow, radial gradient overlay, monospace in chips/URL bar, emoji logo, "What it does" kicker.

- [ ] **Step 12: Keyboard navigation check**

Tab through the landing page:
- Skip link → nav links → CTA buttons → feature section → footer links
- Hamburger menu opens/closes with Enter/Space, Escape closes
- No focus traps, logical tab order

- [ ] **Step 13: Commit unified result**

```bash
git add src/pages/Index.tsx
git commit -m "feat(landing): unified A.4 overhaul — anti-patterns, responsive, a11y, typography"
```
