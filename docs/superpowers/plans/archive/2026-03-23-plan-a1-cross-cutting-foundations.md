# Plan A.1 — Cross-cutting Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish design tokens, font swap, skip link, and cleanup that all subsequent plans (A.2–A.5) depend on.

**Architecture:** CSS custom properties for layout constants, DM Sans font swap in Tailwind config + Google Fonts, skip-to-content link in App.tsx, dead CSS removal.

**Tech Stack:** CSS, Tailwind, React

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md`

---

### Task 1: Add layout CSS custom properties

**Commands:** `/harden` (C-1 contrast fix), `/normalize` (magic numbers → CSS vars)

**Files:**
- Modify: `src/index.css` (`:root` block, lines 10–99)

- [ ] **Step 1: Add layout variables to :root**

In `src/index.css`, add these properties inside the existing `:root` block (after the existing design tokens, before the closing `}`):

```css
/* Layout constants (used by Editor, Viewer, all pages) */
--sidebar-w-editor: 220px;
--sidebar-w-viewer: 200px;
--topbar-h: 48px;
--canvas-max-w: 828px;
--reading-max-w: 680px;
--content-px: 64px;
```

- [ ] **Step 2: Fix muted text contrast (C-1)**

In the same `:root` block, change:
```css
/* Before */
--text-muted: #94a3b8;
/* After */
--text-muted: #64748b;
```

This raises contrast from 3.06:1 to 5.1:1 (passes WCAG AA).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: SUCCESS — CSS changes are valid, no downstream breakage.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "fix(tokens): add layout CSS vars, fix muted text contrast to WCAG AA"
```

---

### Task 2: Swap Inter → DM Sans

**Commands:** `/typeset` (H-6 Inter typeface)

**Files:**
- Modify: `index.html` (Google Fonts link)
- Modify: `tailwind.config.ts` (line 23)
- Modify: `src/index.css` (line 109, body font-family)

- [ ] **Step 1: Update Google Fonts import in index.html**

Find the existing Inter font import `<link>` in `index.html` and replace with DM Sans. If there's a `<link>` for Inter, change it to:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet">
```

If there's no existing font `<link>`, add this in `<head>` before the closing `</head>`.

- [ ] **Step 2: Update Tailwind config**

In `tailwind.config.ts`, change the `sans` font family (line 23):
```typescript
// Before
sans: ['Inter', 'system-ui', 'sans-serif'],
// After
sans: ['DM Sans', 'system-ui', 'sans-serif'],
```

- [ ] **Step 3: Update body font-family in CSS**

In `src/index.css` (line 109), update the body rule:
```css
/* Before */
font-family: 'Inter', system-ui, sans-serif;
/* After */
font-family: 'DM Sans', system-ui, sans-serif;
```

- [ ] **Step 4: Verify build and visual check**

Run: `npm run build`
Expected: SUCCESS

Run: `npm run dev`
Visually verify that body text across all pages renders in DM Sans (check Courses page, Editor page).

- [ ] **Step 5: Commit**

```bash
git add index.html tailwind.config.ts src/index.css
git commit -m "feat(typography): swap Inter for DM Sans across the app"
```

---

### Task 3: Remove dead CSS and dark mode infrastructure

**Commands:** `/normalize` (L-5, M-6 dead CSS), `/colorize` (M-3 dark mode infra), `/optimize` (M-4 backdrop-blur)

**Files:**
- Modify: `src/index.css` (lines 120–130)
- Modify: `tailwind.config.ts` (line 5)

- [ ] **Step 1: Delete `.card-surface` utility (L-5, also resolves M-4)**

In `src/index.css`, delete the `.card-surface` block (lines 120–123):
```css
/* DELETE THIS ENTIRE BLOCK */
.card-surface {
  @apply bg-white/80 backdrop-blur-md border border-white/20;
}
```

- [ ] **Step 2: Delete `.text-gradient` utility (M-6)**

In `src/index.css`, delete the `.text-gradient` block (lines 125–130):
```css
/* DELETE THIS ENTIRE BLOCK */
.text-gradient {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- [ ] **Step 3: Remove darkMode config (M-3)**

In `tailwind.config.ts`, remove the `darkMode` line (line 5):
```typescript
// DELETE this line:
darkMode: ["class"],
```

- [ ] **Step 4: Search for any `dark:` utility usage in project-authored files and remove**

Run: `grep -r "dark:" src/ --include="*.tsx" --include="*.css"` to find any `dark:` utilities. **Only remove from project-authored files** (pages, custom components). Leave `dark:` utilities in `src/components/ui/` (shadcn-managed — removing them risks merge conflicts on future updates) and `dark:prose-invert` classes (inert without darkMode config, harmless to keep).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "chore: remove dead CSS (.card-surface, .text-gradient) and dark mode infra"
```

---

### Task 4: Add skip-to-content link (H-4)

**Commands:** `/harden` (H-4 skip-to-content link)

**Files:**
- Modify: `src/App.tsx` (line 29, inside BrowserRouter)
- Modify: `src/index.css` (add skip-link styles)

- [ ] **Step 1: Add skip link CSS**

In `src/index.css`, add inside the `@layer utilities` block:
```css
.skip-link {
  @apply sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-teal-700 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-teal-500 focus:outline-none;
}
```

- [ ] **Step 2: Add skip link to App.tsx**

In `src/App.tsx`, add as the first child inside `<BrowserRouter>` (after line 29):
```tsx
<a href="#main-content" className="skip-link">
  Skip to content
</a>
```

- [ ] **Step 3: Add `id="main-content"` targets to each page**

Each page's main content area needs `id="main-content"`. This will be done in each subsequent plan (A.2–A.5) as part of the Tailwind migration for that page. For now, just add the skip link — the target IDs will land with each page rewrite.

- [ ] **Step 4: Verify the skip link works**

Run: `npm run dev`
Tab once from the page — the skip link should appear visually at top-left. It won't navigate to `#main-content` yet (targets come in A.2–A.5), but it should be visible and styled.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat(a11y): add skip-to-content link (WCAG 2.4.1)"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```
Expected: SUCCESS with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: PASS (or only pre-existing warnings).

- [ ] **Step 3: Run MCP tests**

```bash
cd mcp && npm test
```
Expected: All 173+ tests pass. A.1 touches no MCP code, so this is a sanity check.

- [ ] **Step 4: Visual spot-check**

Run `npm run dev` and check:
- Courses page: DM Sans renders for body text, Lora for headings
- Muted text (#64748b) is visibly darker than before
- No visual regressions from removed CSS utilities
