# Plan A.1 — Cross-cutting Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task invokes one or more impeccable plugin skills — use the Skill tool to invoke them (e.g., `Skill("impeccable:harden")`).

**Goal:** Establish design tokens, font swap, skip link, and cleanup that all subsequent plans (A.2–A.5) depend on.

**Architecture:** CSS custom properties for layout constants, DM Sans font swap in Tailwind config + Google Fonts, skip-to-content link in App.tsx, dead CSS removal.

**Tech Stack:** CSS, Tailwind, React

**Spec:** `docs/superpowers/specs/2026-03-23-audit-fixes-design.md`

**Depends on:** Nothing (this is the foundation)

---

### Task 1: Add layout CSS custom properties + fix contrast

**Invoke:** `/harden` — target `src/index.css`, fix C-1 muted text contrast (`--text-muted: #94a3b8` → `#64748b`, 5.1:1 ratio)

**Files:**
- Modify: `src/index.css` (`:root` block)

- [ ] **Step 1: Invoke `/harden`**

Invoke the `impeccable:harden` skill. Context for the skill:
- **Target file:** `src/index.css`
- **Issue C-1:** `--text-muted: #94a3b8` on white yields 3.06:1 contrast. Change to `#64748b` (5.1:1, WCAG AA).
- **Also add** layout CSS custom properties inside `:root`:
  ```css
  --sidebar-w-editor: 220px;
  --sidebar-w-viewer: 200px;
  --topbar-h: 48px;
  --canvas-max-w: 828px;
  --reading-max-w: 680px;
  --content-px: 64px;
  ```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix(tokens): add layout CSS vars, fix muted text contrast to WCAG AA"
```

---

### Task 2: Swap Inter → DM Sans

**Invoke:** `/typeset` — swap Inter for DM Sans across `index.html`, `tailwind.config.ts`, `src/index.css`

**Files:**
- Modify: `index.html` (Google Fonts link)
- Modify: `tailwind.config.ts` (sans font family)
- Modify: `src/index.css` (body font-family)

- [ ] **Step 1: Invoke `/typeset`**

Invoke the `impeccable:typeset` skill. Context for the skill:
- **Issue H-6:** Inter is on the don't-use list (AI-slop typeface).
- **Replacement:** DM Sans — geometric, clean, good x-height, pairs well with Lora (existing serif).
- **Targets:**
  - `index.html`: Update Google Fonts `<link>` to load DM Sans (400–700, italic 400–500) + Lora
  - `tailwind.config.ts`: Change `sans: ['Inter', ...]` to `sans: ['DM Sans', ...]`
  - `src/index.css`: Change body `font-family: 'Inter', ...` to `font-family: 'DM Sans', ...`

- [ ] **Step 2: Verify build and visual check**

Run: `npm run build` — SUCCESS
Run: `npm run dev` — verify DM Sans renders on Courses page, Editor page.

- [ ] **Step 3: Commit**

```bash
git add index.html tailwind.config.ts src/index.css
git commit -m "feat(typography): swap Inter for DM Sans across the app"
```

---

### Task 3: Remove dead CSS and dark mode infrastructure

**Invoke:** `/normalize` — clean up dead utilities and unused dark mode infra in `src/index.css` and `tailwind.config.ts`

**Files:**
- Modify: `src/index.css` (delete `.card-surface`, `.text-gradient`)
- Modify: `tailwind.config.ts` (remove `darkMode: ["class"]`)

- [ ] **Step 1: Invoke `/normalize`**

Invoke the `impeccable:normalize` skill. Context for the skill:
- **Issue L-5:** `.card-surface` utility (lines 120–123) is dead CSS — grep shows zero usages. Delete it. This also resolves M-4 (backdrop-blur without fallback).
- **Issue M-6:** `.text-gradient` utility (lines 125–130) is an anti-pattern utility. Delete it.
- **Issue M-3:** `darkMode: ["class"]` in `tailwind.config.ts` has no implementation. Remove it.
- **`dark:` utilities:** Only remove from project-authored files (pages, custom components). Leave `dark:` utilities in `src/components/ui/` (shadcn-managed) and `dark:prose-invert` classes — they are inert without darkMode config and harmless to keep.

- [ ] **Step 2: Verify build**

Run: `npm run build` — SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "chore: remove dead CSS (.card-surface, .text-gradient) and dark mode infra"
```

---

### Task 4: Add skip-to-content link (H-4)

**Invoke:** `/harden` — add skip-to-content link in `App.tsx` with CSS in `src/index.css`

**Files:**
- Modify: `src/App.tsx` (first child inside BrowserRouter)
- Modify: `src/index.css` (skip-link styles)

- [ ] **Step 1: Invoke `/harden`**

Invoke the `impeccable:harden` skill. Context for the skill:
- **Issue H-4:** No skip-to-content link on any page. WCAG 2.4.1 Bypass Blocks — Level A.
- **Implementation:**
  - Add `<a href="#main-content" className="skip-link">Skip to content</a>` as first child inside `<BrowserRouter>` in `App.tsx`
  - Add `.skip-link` CSS: visually hidden, revealed on focus with `sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999]` etc.
  - Target `id="main-content"` will be added per-page in A.2–A.5.

- [ ] **Step 2: Verify skip link appears on Tab**

Run: `npm run dev` — Tab once, skip link should appear at top-left.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat(a11y): add skip-to-content link (WCAG 2.4.1)"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full build** — `npm run build` — SUCCESS
- [ ] **Step 2: Run lint** — `npm run lint` — PASS
- [ ] **Step 3: Run MCP tests** — `cd mcp && npm test` — all 173+ pass
- [ ] **Step 4: Visual spot-check** — DM Sans renders, muted text darker, no regressions
