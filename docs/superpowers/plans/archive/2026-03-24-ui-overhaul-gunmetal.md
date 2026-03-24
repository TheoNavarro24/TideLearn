# UI Overhaul — Gunmetal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TideLearn's teal Rockpool palette with the Gunmetal direction — blue-grey sidebar, off-white canvas, mint accent — and redesign all three authoring screens (My Courses, Editor, Settings).

**Architecture:** Token-first migration. Update the design token layer (index.css + tailwind.config.ts) first, then rebuild each page on the new tokens. Extract a shared sidebar shell component to eliminate the duplicated sidebar code in Courses.tsx and Editor.tsx. Add motion design as CSS animations. Settings is a new page.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, CSS custom properties, View Transitions API (progressive enhancement)

**Spec:** `docs/superpowers/specs/2026-03-24-ui-overhaul-gunmetal-design.md`
**Mockup:** `.superpowers/brainstorm/433-1774311708/courses-and-editor.html`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/components/AppShell.tsx` | Shared sidebar + top bar layout wrapper |
| `src/pages/Settings.tsx` | Settings page (profile, account, session, danger zone) |

### Modified files
| File | LOC | Changes |
|------|-----|---------|
| `src/index.css` | 147 | Complete token replacement — Rockpool → Gunmetal, shadcn HSL tokens, shadows, utility classes, motion keyframes |
| `tailwind.config.ts` | 103 | No structural changes — shadcn tokens flow through automatically via HSL vars |
| `src/App.tsx` | ~40 | Add `/settings` route |
| `src/pages/Courses.tsx` | 725 | Remove inline sidebar, wrap in AppShell, redesign card grid (cover strip, stats, footer, ··· menu) |
| `src/pages/Editor.tsx` | 888 | Remove inline sidebar/topbar, wrap in AppShell, add breadcrumb top bar, autosave indicator |
| `src/pages/Index.tsx` | 404 | Token swap (ocean/teal → gunmetal/mint) |
| `src/pages/Auth.tsx` | 491 | Token swap |
| `src/pages/View.tsx` | 786 | Token swap |
| `src/pages/AssessmentView.tsx` | 414 | Token swap (if any token references) |
| `src/components/editor/BlockPicker.tsx` | 187 | Token swap |
| `src/components/editor/PublishModal.tsx` | 249 | Token swap |

---

## Task 1: Token Foundation

**Files:**
- Modify: `src/index.css` (lines 1–147 — full rewrite of `:root` block and utilities)
- Modify: `tailwind.config.ts` (verify no changes needed)

This task replaces every design token. All subsequent tasks depend on this.

- [ ] **Step 1: Read current index.css and spec token tables**

Read `src/index.css` fully and `docs/superpowers/specs/2026-03-24-ui-overhaul-gunmetal-design.md` sections "Palette — Gunmetal", "shadcn Semantic Tokens", and "Migration Strategy".

- [ ] **Step 2: Replace shadcn semantic tokens in `:root`**

Replace lines 11–50 (the `--background` through `--sidebar-ring` block) with the new HSL values from the spec's "shadcn Semantic Tokens" section. Keep the exact same property names — only values change.

- [ ] **Step 3: Replace Rockpool custom properties**

Delete lines 52–98 (everything from `/* ── Rockpool custom properties ── */` through `--shadow-popup`). Replace with Gunmetal custom properties:

```css
/* ── Gunmetal custom properties ── */
--sidebar: #252c38;
--sidebar-2: #2d3545;
--sidebar-3: #1e242f;
--canvas: #edf1f7;
--canvas-2: #f2f6fb;
--canvas-white: #f8fbff;
--ink: #1a2030;
--text-muted: #6a7a90;  /* kept as --text-muted (spec says rename to --muted, but 15+ codebase refs use this name — keeping for compat, spec updated to match) */
--accent-hex: #40c8a0;
--accent-bg: rgba(64,200,160,.1);
--sidebar-text: #7a8da4;
--danger: #b04040;

/* Shadows (blue-grey tinted) */
--shadow-card: 0 1px 3px rgba(0,0,0,0.05), 0 1px 8px rgba(26,44,56,0.04);
--shadow-hover: 0 4px 20px rgba(26,44,56,0.12);
--shadow-modal: 0 32px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(26,44,56,0.1);
--shadow-popup: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(26,44,56,0.08);

/* Motion */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

Keep radius scale and layout constants unchanged.

- [ ] **Step 4: Update utility classes**

Replace `.bg-hero` with mint-tinted version. Update `.skip-link` teal classes to emerald. Re-tint `pulse-ring` keyframes. Add reduced-motion media query.

```css
.bg-hero {
  background:
    radial-gradient(ellipse 60% 50% at 50% 40%, rgba(64,200,160,0.08) 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 80% 80%, rgba(64,200,160,0.05) 0%, transparent 55%);
}

.skip-link {
  @apply sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999]
         focus:bg-white focus:text-emerald-700 focus:px-4 focus:py-2 focus:rounded-md
         focus:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none;
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 3px rgba(64,200,160,0.25); }
  50%      { box-shadow: 0 0 0 5px rgba(64,200,160,0.1); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Add motion keyframes**

Add all motion keyframes from the spec's Motion Design section:

```css
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes dropdown-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes block-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* View Transitions (progressive enhancement) */
@supports (view-transition-name: card) {
  .course-card { view-transition-name: course-card; }
}
::view-transition-old(course-card),
::view-transition-new(course-card) {
  animation-duration: 250ms;
  animation-timing-function: var(--ease-out);
}
```

- [ ] **Step 5b: Add global focus indicator style**

Add a global focus-visible style for interactive elements using the mint accent:

```css
:focus-visible {
  outline: 2px solid var(--accent-hex);
  outline-offset: 2px;
}
```

- [ ] **Step 6: Verify tailwind.config.ts needs no changes**

Open `tailwind.config.ts`. Confirm colors reference `hsl(var(--token))` — since we kept the same CSS property names with new HSL values, Tailwind picks them up automatically. No changes needed.

- [ ] **Step 7: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds. There will be visual breakage (pages still reference old token names like `--ocean-mid`) — that's expected and fixed in later tasks.

- [ ] **Step 8: Commit**

```bash
git add src/index.css
git commit -m "feat(tokens): replace Rockpool palette with Gunmetal tokens"
```

---

## Task 2: Shared AppShell Component

**Files:**
- Create: `src/components/AppShell.tsx`
- Reference: `src/pages/Courses.tsx` (lines 286–319 for NavItem, lines 510–570 for sidebar structure)

Currently the sidebar is duplicated between Courses.tsx and Editor.tsx. Extract a shared shell.

- [ ] **Step 1: Read current sidebar implementations**

Read `src/pages/Courses.tsx` focusing on the sidebar structure (look for `<aside>`, NavItem, logo, user avatar section). Read `src/pages/Editor.tsx` sidebar too. Identify the shared parts vs page-specific parts.

- [ ] **Step 2: Create AppShell component**

Create `src/components/AppShell.tsx` with this structure:

```tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { BookOpen, Settings, HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  /** Optional custom sidebar content (e.g., Editor lesson list) */
  sidebar?: React.ReactNode;
  /** Top bar content */
  topBar: React.ReactNode;
}

export function AppShell({ children, sidebar, topBar }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[var(--sidebar-w-editor)] flex-col flex-shrink-0"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--accent-bg)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b"
             style={{ borderColor: "var(--accent-bg)" }}>
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
               style={{ background: "var(--accent-hex)", color: "#0a1c18" }}>
            T
          </div>
          <span className="font-display text-sm font-semibold"
                style={{ color: "hsl(var(--sidebar-foreground))" }}>
            TideLearn
          </span>
        </div>

        {/* Nav or custom sidebar */}
        {sidebar ?? (
          <nav className="flex-1 p-2 space-y-0.5">
            <NavItem
              icon={BookOpen}
              label="My Courses"
              active={location.pathname === "/courses"}
              onClick={() => navigate("/courses")}
            />
            <NavItem
              icon={Settings}
              label="Settings"
              active={location.pathname === "/settings"}
              onClick={() => navigate("/settings")}
            />
            <NavItem
              icon={HelpCircle}
              label="Help"
              active={false}
              onClick={() => {}}
            />
          </nav>
        )}

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-t"
               style={{ borderColor: "var(--accent-bg)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                 style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}>
              {user.email?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs truncate" style={{ color: "var(--sidebar-text)" }}>
              {user.email}
            </span>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden"
           style={{ background: "var(--canvas)" }}>
        {/* Top bar */}
        <header className="h-[var(--topbar-h)] flex items-center px-5 flex-shrink-0 border-b"
                style={{ background: "hsl(var(--muted))", borderColor: "var(--border)" }}>
          {topBar}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
        active
          ? "text-[var(--accent-hex)]"
          : "text-[var(--sidebar-text)] hover:text-[#a0b0c4]"
      )}
      style={active ? { background: "var(--accent-bg)" } : undefined}
    >
      <Icon className="w-[13px] h-[13px] [stroke-width:2]" />
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: Compiles (component not used yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat(shell): add shared AppShell layout component"
```

---

## Task 3: My Courses Page Redesign

**Files:**
- Modify: `src/pages/Courses.tsx` (725 LOC — significant rewrite)
- Reference: mockup `courses-and-editor.html` for exact layout

- [ ] **Step 1: Read current Courses.tsx fully**

Read all 725 lines. Identify: CourseCard sub-component, DropItem, NavItem, sidebar structure, card grid, all state and handlers. Note which handlers/logic must be preserved.

- [ ] **Step 2: Remove inline sidebar, wrap in AppShell**

Replace the outer layout grid and inline `<aside>` with `<AppShell>`. Pass top bar content (title + Import JSON + New Course buttons) as `topBar` prop. Keep all existing state, handlers, and dialogs.

- [ ] **Step 3: Redesign CourseCard component**

Rewrite `CourseCard` to match the Gunmetal spec:
- 82px cover strip with gradient bg + emoji icon
- Card body: title, lesson/quiz stat counters, footer (date + status badge + Edit button on hover)
- ··· button always visible at 35% opacity
- Entire card clickable
- Card entrance animation (`animation: card-in` with staggered delay via `style={{ animationDelay }}`)

- [ ] **Step 4: Redesign card grid and hover transitions**

3-column grid with 16px gap. Cards use `--radius-lg` (10px). No default shadow, shadow on hover. New Course card with dashed border.

Add card hover transition per spec:
```css
transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
/* On hover: */
transform: translateY(-2px);
box-shadow: var(--shadow-hover);
```

- [ ] **Step 5: Redesign DropItem / dropdown menu**

Style dropdown with white background, border, shadow. Items with icons at stroke 1.5. Delete item in red.

Animations per spec:
- **Open:** `animation: dropdown-in 120ms var(--ease-out)`, transform-origin: top-right
- **Close:** opacity 1→0 over 80ms only (no scale on close — feels snappier). Use `transition: opacity 80ms var(--ease-out)` on the closing state.

- [ ] **Step 6: Replace all old token references**

Search and replace in this file:
- `--ocean-mid` → `var(--sidebar)` (but sidebar is now in AppShell)
- `--gradient-primary` → `var(--accent-hex)` (solid mint, no gradient)
- `--text-primary` → `var(--ink)`
- `--text-muted` → `var(--text-muted)`
- `--surface-subtle` → `var(--canvas)`
- `--border-subtle` → `var(--border)`
- etc.

- [ ] **Step 7: Remove NavItem and sidebar code**

Delete the inline `NavItem` component and sidebar markup — now handled by AppShell.

- [ ] **Step 8: Verify in browser**

Run dev server (`npm run dev`). Navigate to `/courses`. Verify:
- Gunmetal sidebar with logo, nav, user avatar
- Card grid with cover strips and stats
- ··· dropdown opens with all actions
- Edit button appears on hover
- Card entrance animation plays

- [ ] **Step 9: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "feat(courses): redesign My Courses page with Gunmetal palette"
```

---

## Task 4: Editor Page Redesign

**Files:**
- Modify: `src/pages/Editor.tsx` (888 LOC — significant rewrite of layout, preserve all editor logic)

- [ ] **Step 1: Read current Editor.tsx fully**

Read all 889 lines. Identify: layout grid, topbar, sidebar (lesson list), canvas, all state management (undo/redo, blocks, lessons, course loading), handlers. The editor logic is complex — preserve ALL of it.

**Important layout note:** The current Editor uses a CSS grid layout (`grid-cols-1 md:grid-cols-[var(--sidebar-w-editor)_1fr] grid-rows-[var(--topbar-h)_1fr]`) where the topbar spans both columns (`col-span-2`). AppShell uses flexbox where the topbar sits inside the main content area (right of sidebar), not spanning above it. This is a deliberate layout change matching the spec — the topbar is now scoped to the content area only. This requires removing the grid layout entirely, not just swapping class names.

- [ ] **Step 2: Restructure layout — replace grid with AppShell flex layout**

The Editor has a custom sidebar (lesson list, not nav). Use `<AppShell>` with the `sidebar` prop for the custom lesson sidebar. Pass the editor top bar (breadcrumb + controls) as `topBar`.

Remove the grid layout wrapper (`grid-cols-1 md:grid-cols-[...]`) and the `col-span-2` topbar. The sidebar mobile overlay system (`hidden md:flex` + hamburger toggle) is deferred — AppShell uses `hidden md:flex` on the sidebar, which matches the current desktop behavior. Mobile sidebar improvements are out of scope per the spec.

The lesson sidebar content includes:
- Back link ("← All courses", navigates to /courses)
- Course title (Lora)
- Lesson count
- Lesson list (numbered, with type icons, active state)
- Add lesson / Add assessment buttons
- Footer: "Export SCORM" button only — **remove the existing "Publish & Export" button from the sidebar footer** (Publish now lives exclusively in the top bar per spec)

- [ ] **Step 3: Redesign editor top bar**

Two-line left section:
- Line 1 (breadcrumb): `← {course.title}` — small muted text, clickable back to courses
- Line 2: Editable lesson title (13.5px, 600, dashed underline hint on hover)

Right section: Undo/Redo icons (stroke 2.0) | Preview (text button) | "✓ Saved" autosave indicator (fades in with `animation: fade-in 200ms var(--ease-out)` after save completes) | Publish (mint button)

- [ ] **Step 4: Update canvas area tokens**

Replace `bg-[var(--surface-subtle)]` with `bg-[var(--canvas)]`. Block canvas inner uses `var(--canvas-white)`. Reading width stays at `--reading-max-w` (680px).

- [ ] **Step 5: Add lesson crossfade animation**

When active lesson changes, apply `animation: fade-in 150ms var(--ease-out)` to the canvas content area. Key the animation on lesson ID using a React `key` prop so the animation re-triggers on change.

- [ ] **Step 5b: Add block add/remove animations**

Per spec Motion Design section:
- **Block add:** New block appears with `animation: block-in 200ms var(--ease-out)`. Use `grid-template-rows: 0fr → 1fr` transition for height expansion if feasible, otherwise use the opacity+translateY keyframe.
- **Block remove:** Fade out (opacity 1→0, 120ms), then collapse. Can use React's `onAnimationEnd` to remove from DOM after animation.
- **Block toolbar:** When a block is selected, the floating toolbar appears with `animation: block-in 100ms var(--ease-out)` (same keyframe — opacity+translateY).

- [ ] **Step 5c: Add View Transitions (progressive enhancement)**

Add `view-transition-name: course-card` to course cards in Courses.tsx (this requires coordination with Task 3 — if running sequentially, add it here; if Task 3 is already committed, edit Courses.tsx).

In the navigation handler (when clicking a card to enter the editor), wrap `navigate()` in `document.startViewTransition?.()`:

```tsx
const handleOpenCourse = (courseId: string) => {
  if (document.startViewTransition) {
    document.startViewTransition(() => navigate(`/editor/${courseId}`));
  } else {
    navigate(`/editor/${courseId}`);
  }
};
```

The CSS for view transitions was already added in Task 1 Step 5. This is progressive enhancement — browsers without support get instant navigation.

- [ ] **Step 6: Replace all old token references**

Same token replacement pattern as Task 3 — ocean/teal/surface → gunmetal/mint/canvas.

- [ ] **Step 7: Verify in browser**

Run dev server. Create or load a course, navigate to editor. Verify:
- Breadcrumb shows course name, lesson title is editable
- Lesson sidebar with back link, lesson list, add buttons
- Export SCORM in footer (no Publish in footer)
- Autosave indicator shows "✓ Saved"
- Block canvas renders correctly
- Lesson switching crossfades
- Undo/redo works

- [ ] **Step 8: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "feat(editor): redesign Editor with Gunmetal palette and breadcrumb topbar"
```

---

## Task 5: Settings Page (New)

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Read App.tsx routing structure**

Read `src/App.tsx` to understand route definitions and auth guard patterns.

- [ ] **Step 2: Add /settings route**

Add a protected route for `/settings` pointing to the new Settings component. Follow the same auth guard pattern as `/courses` and `/editor`.

- [ ] **Step 3: Create Settings.tsx**

Create `src/pages/Settings.tsx` using `<AppShell>` with default nav sidebar (Settings active). Content area: max-width 520px, left-aligned.

Sections:
1. **Profile** — avatar (initials circle with mint bg), display name input, email (read-only), Save changes button
2. **Connected accounts** — Google row with logo + email + "Connected" badge
3. **Session** — Sign out description + ghost button (calls `signOut` from AuthContext)
4. **Danger zone** — red header, delete account button (shows confirmation dialog)

- [ ] **Step 4: Verify in browser**

Navigate to `/settings`. Verify:
- Sidebar shows Settings as active
- Profile section renders with user data from AuthContext
- Sign out button works
- Delete account shows confirmation

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx
git commit -m "feat(settings): add Settings page with profile, account, session management"
```

---

## Task 6: Secondary Pages Token Update

**Files:**
- Modify: `src/pages/Index.tsx` (404 LOC)
- Modify: `src/pages/Auth.tsx` (491 LOC)
- Modify: `src/pages/View.tsx` (786 LOC)
- Modify: `src/pages/AssessmentView.tsx` (414 LOC)

These pages get token swaps only — no structural changes.

- [ ] **Step 1: Update Index.tsx (landing page)**

Read the file. Search for all `var(--ocean-*`, `var(--teal-*`, `var(--gradient-*`, `var(--surface-*`, `var(--text-*` references. Replace with Gunmetal equivalents:
- `--teal-bright` / `--teal-primary` → `var(--accent-hex)` or `hsl(var(--primary))`
- `--ocean-deep` / `--ocean-surface` → `var(--sidebar)` or `var(--sidebar-3)`
- `--gradient-primary` → `var(--accent-hex)` (solid, no gradient)
- `--text-primary` → `var(--ink)`
- `--text-body` → `var(--ink)` or `var(--text-muted)`
- `--surface-subtle` → `var(--canvas)`

Also update any hardcoded teal Tailwind classes (`text-teal-*`, `bg-teal-*`, `border-teal-*`) to emerald equivalents.

- [ ] **Step 2: Update Auth.tsx**

Same token swap pattern. Focus on the auth card, Google sign-in button, background colors.

- [ ] **Step 3: Update View.tsx**

Read and grep for token references. This is the learner-facing viewer — update any ocean/teal/surface tokens.

- [ ] **Step 4: Update AssessmentView.tsx**

Grep for token references. Update if any found.

- [ ] **Step 5: Verify all pages in browser**

Navigate to each page (`/`, `/auth`, `/view?id=...`). Confirm no teal/ocean colors remain visible.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx src/pages/Auth.tsx src/pages/View.tsx src/pages/AssessmentView.tsx
git commit -m "feat(pages): update secondary pages to Gunmetal tokens"
```

---

## Task 7: Component Token Updates

**Files:**
- Modify: `src/components/editor/BlockPicker.tsx` (187 LOC)
- Modify: `src/components/editor/PublishModal.tsx` (249 LOC)

- [ ] **Step 1: Update BlockPicker.tsx**

Read the file. Replace all Rockpool tokens:
- `--border-emphasis` → `var(--border)`
- `--surface-tint` → `var(--canvas-2)`
- `--teal-primary` → `var(--accent-hex)`
- `--text-body` → `var(--ink)`
- `--text-muted` → `var(--text-muted)`

- [ ] **Step 2: Update PublishModal.tsx**

Read the file. Replace tokens. Remove any gradient backgrounds — use solid `var(--accent-hex)` for primary buttons.

- [ ] **Step 3: Verify in browser**

Open editor, click add block row — verify BlockPicker appears with correct colors. Click Publish — verify modal renders correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/BlockPicker.tsx src/components/editor/PublishModal.tsx
git commit -m "feat(components): update BlockPicker and PublishModal to Gunmetal tokens"
```

---

## Task 8: Icon Stroke Weight

**Files:**
- Modify: `src/index.css` (add stroke-width rules)
- Modify: various components (verify Lucide icon usage)

- [ ] **Step 1: Add global stroke-width CSS rules**

Add to `src/index.css` `@layer components`:

```css
/* Interactive icons: stroke 2.0 — use targeted selectors, NOT `button svg` (too broad) */
.sidebar-nav svg,
.toolbar svg,
.lesson-list svg,
.btn-icon svg { stroke-width: 2; }

/* Decorative icons: stroke 1.5 in dropdown menus and inline contexts */
[role="menu"] svg,
[data-radix-popper-content-wrapper] svg,
.dropdown-menu svg { stroke-width: 1.5; }
```

Add the corresponding class names to components:
- AppShell sidebar nav: add `className="sidebar-nav"` to the `<nav>` element
- Editor toolbar: add `className="toolbar"` to the toolbar container
- Editor lesson list: add `className="lesson-list"` to the lesson list container
- Icon buttons (undo/redo, add lesson, etc.): add `className="btn-icon"` or use the existing button + the class

- [ ] **Step 2: Verify icon rendering**

Check sidebar nav icons, editor toolbar, dropdown menus, add block buttons in browser. Confirm structural icons are visibly bolder than dropdown icons.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(icons): configure dual stroke-weight system for Lucide icons"
```

---

## Task 9: Final Sweep and Verification

**Files:**
- All modified files

- [ ] **Step 1: Grep for remaining old tokens**

```bash
grep -rn 'ocean-\|teal-\|gradient-primary\|gradient-teal\|surface-subtle\|surface-tint\|border-subtle\|border-emphasis\|border-mid\|text-on-dark\|text-body\|text-primary' src/ --include='*.tsx' --include='*.ts' --include='*.css'
```

Fix any remaining references.

- [ ] **Step 2: Grep for hardcoded teal Tailwind classes**

```bash
grep -rn 'teal-' src/ --include='*.tsx' --include='*.ts' --include='*.css'
```

Replace with emerald or accent-based equivalents.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 5: Full browser walkthrough**

Navigate through every page in order:
1. Landing page (`/`)
2. Auth (`/auth`)
3. My Courses (`/courses`)
4. Editor (click a course)
5. Settings (`/settings`)
6. View (share a course, open viewer)

Check: no teal/ocean colors visible, all interactions work, card entrance animations play with stagger, card hover lifts with shadow, dropdowns open/close with scale+opacity, autosave indicator fades in, lesson switching crossfades, block add/remove animates, block toolbar appears smoothly, focus indicators are 2px mint outlines.

- [ ] **Step 6: Verify accessibility**

- Check `prefers-reduced-motion` — enable in OS settings, reload. Verify all animations are disabled.
- Tab through pages — verify focus indicators are mint outlines.
- Run Lighthouse accessibility audit on `/courses`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: final sweep — remove all remaining Rockpool references"
```
