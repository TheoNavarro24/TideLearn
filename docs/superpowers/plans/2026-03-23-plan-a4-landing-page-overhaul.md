# Plan A.4 — Index.tsx (Landing Page) Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite landing page from inline styles to Tailwind, remove AI-slop anti-patterns (gradient text, glow effects, monospace chips), add responsive design, fix typography.

**Architecture:** Full Tailwind migration. Strip `TEAL_GRAD`/`TEAL_GRAD_TEXT`/`OCEAN_DEEP` constants — use CSS vars. Replace emoji logo with Lucide icon. Make all sections responsive.

**Tech Stack:** React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md` (section A.4)

**Depends on:** Plan A.1 (CSS vars, DM Sans font, contrast fix)

---

### Task 1: Migrate Nav component to Tailwind + responsive

**Files:**
- Modify: `src/pages/Index.tsx` (Nav component, lines 11–127)

- [ ] **Step 1: Replace emoji logo with Lucide icon (M-8)**

```tsx
import { Waves } from "lucide-react";

// Before: 🌊 emoji in a gradient box
// After:
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
  <Waves className="w-5 h-5 text-white" />
</div>
```

If Lucide doesn't have a `Waves` icon, check available alternatives (`Wave`, `Droplets`, etc.) or use a simple custom SVG.

- [ ] **Step 2: Convert nav layout to Tailwind with responsive**

```tsx
<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-14 h-16 bg-[#0a1f1c]/95 backdrop-blur-sm">
```

- [ ] **Step 3: Add mobile hamburger + responsive nav links**

Hide nav links on mobile, show hamburger:
```tsx
{/* Desktop nav */}
<div className="hidden md:flex items-center gap-6">
  {/* nav links */}
</div>

{/* Mobile hamburger */}
<button className="md:hidden" aria-label="Menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
  <Menu className="w-5 h-5 text-white" />
</button>

{/* Mobile nav overlay */}
{mobileNavOpen && (
  <div className="md:hidden absolute top-full inset-x-0 bg-[#0a1f1c] border-t border-white/10 p-4 flex flex-col gap-3">
    {/* Same nav links, stacked vertically */}
    <button className="absolute top-2 right-2 text-white" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
      <X className="w-5 h-5" />
    </button>
  </div>
)}
```

Add state: `const [mobileNavOpen, setMobileNavOpen] = useState(false);`
Close on link click and Escape key.

- [ ] **Step 4: Remove all inline styles from Nav**

Replace every `style={{}}` with Tailwind classes. Remove `fontFamily: "Inter"` — `font-sans` now maps to DM Sans.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(landing): migrate Nav to Tailwind, SVG logo, responsive hamburger"
```

---

### Task 2: Strip anti-patterns from hero section

**Files:**
- Modify: `src/pages/Index.tsx` (hero section, lines 461–618 + constants lines 6–8)

- [ ] **Step 1: Remove module-level gradient constants**

Delete lines 6–8:
```tsx
// DELETE these:
const TEAL_GRAD = "linear-gradient(135deg, #14b8a6, #06b6d4)";
const TEAL_GRAD_TEXT = "linear-gradient(135deg, #14b8a6, #67e8f9)";
const OCEAN_DEEP = "#0a1f1c";
```

Use CSS vars (`var(--gradient-primary)`, `var(--ocean-deepest)`) via Tailwind instead.

- [ ] **Step 2: Remove gradient text from headline (H-2)**

Find the `<em>` with `TEAL_GRAD_TEXT` applied (lines 543–553). Replace:
```tsx
// Before: gradient text with WebkitBackgroundClip
<em style={{ ...TEAL_GRAD_TEXT stuff }}>craft</em>

// After: solid teal emphasis
<em className="text-teal-400 not-italic font-semibold">craft</em>
```

- [ ] **Step 3: Remove glow effects from hero (H-3)**

Remove:
- Radial gradient overlay (`radialGradient` in background)
- Glowing dot on eyebrow pill (`boxShadow: "0 0 8px #14b8a6"`)
- Neon CTA button shadow

Keep:
- The dark ocean background (`bg-[var(--ocean-deepest)]`)
- The line-texture overlay (this is the good visual element)

- [ ] **Step 4: Convert hero section to Tailwind**

```tsx
<section className="relative bg-[var(--ocean-deepest)] pt-32 md:pt-40 pb-20 md:pb-32 px-6 md:px-14 text-center">
```

Hero headline: keep `font-display` (Lora), responsive sizing with `text-4xl md:text-6xl lg:text-7xl`.

Subhead: use `text-[var(--text-muted)]` (now #64748b from A.1 — but in dark context, use a lighter color like `text-slate-300`).

- [ ] **Step 5: Fix CTA arrow characters (M-2)**

```tsx
// Before
<a>Start authoring →</a>
// After
<a>Start authoring<span aria-hidden="true"> →</span></a>

// Before
<a>See what it does ↓</a>
// After
<a>See what it does<span aria-hidden="true"> ↓</span></a>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 7: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "fix(landing): strip gradient text, glow effects, neon shadows (anti-patterns)"
```

---

### Task 3: Migrate EditorCard mockup to Tailwind + responsive

**Files:**
- Modify: `src/pages/Index.tsx` (EditorCard component, lines 130–322)

- [ ] **Step 1: Convert EditorCard to Tailwind**

Replace all inline styles. Key layout:
```tsx
<div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d1f1d] shadow-2xl max-w-3xl mx-auto">
```

- [ ] **Step 2: Fix monospace in URL bar (L-1)**

Replace `fontFamily: "monospace"`:
```tsx
// Before
<span style={{ fontFamily: "monospace" }}>tidelearn.app/editor</span>
// After
<span className="font-sans text-xs tracking-tight opacity-60">tidelearn.app/editor</span>
```

Use background-colour pill styling instead of font-family to signal "technical":
```tsx
<span className="bg-white/5 px-2 py-0.5 rounded text-xs">tidelearn.app/editor</span>
```

- [ ] **Step 3: Make responsive — stack on mobile (M-5)**

```tsx
<div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
  {/* Sidebar — hidden on mobile */}
  <div className="hidden md:block border-r border-white/10 p-4">
    {/* sidebar content */}
  </div>
  {/* Main content — always visible */}
  <div className="p-4 md:p-6">
    {/* editor mockup content */}
  </div>
</div>
```

- [ ] **Step 4: Fix muted text contrast in dark context (M-1)**

In the mockup, replace `#94a3b8` text on dark backgrounds with `#cbd5e1` (passes AA on dark):
```tsx
className="text-slate-300" // instead of text-[#94a3b8]
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(landing): EditorCard to Tailwind, responsive stack, fix monospace and contrast"
```

---

### Task 4: Migrate features section to Tailwind + fix anti-patterns

**Files:**
- Modify: `src/pages/Index.tsx` (FeatureRow + features section, lines 344–702)

- [ ] **Step 1: Fix redundant copy (M-7)**

```tsx
// Before: "What it does" kicker + "Everything you need. Nothing you don't."
// After: drop the kicker entirely, keep the heading
```

- [ ] **Step 2: Convert features section to Tailwind + responsive grid**

```tsx
<section className="px-6 md:px-14 py-16 md:py-24 max-w-6xl mx-auto">
```

Feature rows:
```tsx
<div className="grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] gap-6 md:gap-8 items-start">
```

- [ ] **Step 3: Fix monospace feature chips (H-5)**

Replace `fontFamily: "monospace"` in feature visual chips:
```tsx
// Before
<span style={{ fontFamily: "monospace" }}>mcp://tidelearn/generate</span>

// After
<span className="font-sans text-sm font-medium bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg">
  mcp://tidelearn/generate
</span>
```

Use background colour + rounded pill to signal "technical" instead of monospace font.

- [ ] **Step 4: Remove all onMouseEnter/onMouseLeave handlers**

Replace with Tailwind `hover:` utilities on feature rows and any interactive elements.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(landing): features to Tailwind, fix monospace chips, drop redundant copy"
```

---

### Task 5: Migrate footer + final cleanup

**Files:**
- Modify: `src/pages/Index.tsx` (footer, lines 705–744 + WaveDivider)

- [ ] **Step 1: Convert footer to Tailwind**

```tsx
<footer className="bg-[var(--ocean-deepest)] text-slate-400 px-6 md:px-14 py-12">
```

- [ ] **Step 2: Fix hardcoded copyright year (L-4)**

```tsx
// Before
<span>© 2026 TideLearn</span>
// After
<span>© {new Date().getFullYear()} TideLearn</span>
```

- [ ] **Step 3: Replace footer emoji logo with Lucide icon**

Same Waves icon treatment as Task 1.

- [ ] **Step 4: Convert WaveDivider to Tailwind**

Replace any inline styles on the SVG wave divider component.

- [ ] **Step 5: Add `id="main-content"` to main content area**

Add the skip link target to the first content section after the hero:
```tsx
<main id="main-content">
```

- [ ] **Step 6: Replace all remaining `fontFamily: "Inter"` with `font-sans`**

Search the entire file for any remaining `fontFamily: "Inter"` references and replace with the Tailwind `font-sans` class.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 8: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(landing): footer to Tailwind, dynamic year, SVG logo, final cleanup"
```

---

### Task 6: Final verification for A.4

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
- Hamburger nav visible, links hidden
- Hero text readable, no overflow
- EditorCard: sidebar hidden, single column
- Feature rows: stacked vertically
- CTA buttons: stacked vertically
- No horizontal scroll

- [ ] **Step 4: Visual check at 1440px**

- Full nav visible
- Hero: no gradient text, no glow effects, clean teal emphasis
- EditorCard: two-column layout
- Feature grid: three-column
- No monospace font in chips or URL bar
- No inline styles remaining

- [ ] **Step 5: Anti-pattern verification**

Confirm removal of:
- Gradient text on headline
- Glowing dot on eyebrow pill
- Neon CTA shadow
- Radial gradient overlay
- Monospace in all chips and URL bar
- Emoji logo (should be SVG now)
- "What it does" redundant kicker
