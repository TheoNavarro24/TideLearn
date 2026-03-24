# UI Overhaul — Gunmetal Direction

**Date:** 2026-03-24
**Status:** Draft
**Mockup:** `.superpowers/brainstorm/433-1774311708/courses-and-editor.html`

## Summary

Revolutionary redesign of TideLearn's authoring UI. Replaces the current teal Rockpool palette with the Gunmetal direction — a blue-grey sidebar, off-white canvas, and mint accent. Covers all three authoring screens: My Courses, Editor, and Settings (new page).

## Design Decisions

### Palette — Gunmetal

Custom properties used directly in component code:

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar` | `#252c38` | Sidebar background |
| `--sidebar-2` | `#2d3545` | Sidebar borders, hover states |
| `--sidebar-3` | `#1e242f` | Sidebar deep background |
| `--canvas` | `#edf1f7` | Main content area background |
| `--canvas-2` | `#f2f6fb` | Secondary canvas surface |
| `--canvas-white` | `#f8fbff` | Card/block canvas surface |
| `--ink` | `#1a2030` | Primary text |
| `--muted` | `#6a7a90` | Secondary text (5.1:1 on canvas-white) |
| `--border` | `#c8d4e0` | Borders, dividers |
| `--accent` | `#40c8a0` | Primary accent (mint) — **documentation only; in CSS this is the shadcn HSL token** |
| `--accent-bg` | `rgba(64,200,160,.1)` | Accent background tint |
| `--sidebar-text` | `#7a8da4` | Sidebar inactive text |
| `--danger` | `#b04040` | Destructive actions |

**Key principle:** Neutrals are tinted blue-grey, never pure black or pure white. The accent is mint (#40c8a0), not teal — distinct from the old Rockpool palette.

**Note on token names:** The palette table above is for **design reference**. In CSS, shadcn semantic tokens (`--accent`, `--border`, `--muted`, etc.) use bare HSL triplets — see the "shadcn Semantic Tokens" section. Custom properties that do NOT collide with shadcn names (`--sidebar`, `--canvas`, `--ink`, `--accent-bg`, `--sidebar-text`, `--danger`) are written as hex values directly.

### shadcn Semantic Tokens (HSL triplets)

shadcn/ui requires bare HSL triplets consumed via `hsl(var(--token))`. All existing shadcn tokens must be remapped:

```css
:root {
  /* Core */
  --background:             218 24% 95%;   /* #edf1f7 (canvas) */
  --foreground:             220 30% 14%;   /* #1a2030 (ink) */

  --card:                   216 50% 98%;   /* #f8fbff (canvas-white) */
  --card-foreground:        220 30% 14%;

  --popover:                216 50% 98%;
  --popover-foreground:     220 30% 14%;

  --primary:                160 52% 52%;   /* #40c8a0 (accent) */
  --primary-foreground:     164 75% 8%;    /* #0a1c18 (dark on accent) */

  --secondary:              218 24% 95%;   /* #edf1f7 */
  --secondary-foreground:   220 30% 14%;

  --muted:                  214 28% 93%;   /* #e2e9f1 */
  --muted-foreground:       215 16% 49%;   /* #6a7a90 */

  --accent:                 160 52% 52%;   /* same as primary for shadcn compatibility */
  --accent-foreground:      220 30% 14%;

  --destructive:            0 47% 47%;     /* #b04040 */
  --destructive-foreground: 0 0% 98%;

  --border:                 210 25% 83%;   /* #c8d4e0 */
  --input:                  210 25% 83%;
  --ring:                   160 52% 52%;   /* #40c8a0 */

  /* Sidebar (shadcn Sidebar component) */
  --sidebar-background:          219 20% 18%;   /* #252c38 */
  --sidebar-foreground:          210 20% 65%;   /* #7a8da4 */
  --sidebar-primary:             160 52% 52%;   /* #40c8a0 */
  --sidebar-primary-foreground:  164 75% 8%;
  --sidebar-accent:              218 18% 22%;   /* #2d3545 */
  --sidebar-accent-foreground:   160 52% 52%;
  --sidebar-border:              218 18% 20%;   /* solid approx of 10% mint on sidebar */
  --sidebar-ring:                160 52% 52%;
}
```

### Typography

**No change from Rockpool.** Keep the existing font stack:

- **Display:** Lora (serif), weight 500–600. Used for: page titles, lesson headings in the editor canvas, course card titles in the viewer.
- **Body:** DM Sans, weight 400–600. Used for: all UI chrome, sidebar, buttons, form labels, body text.

### Icons

**Library:** Lucide (already ships with shadcn/ui).

**Stroke weight strategy (new):**
- **2.0** for interactive/structural icons: nav items, toolbar buttons, lesson list icons, undo/redo, add lesson/assessment, back arrow, card action buttons
- **1.5** for decorative/inline icons: dropdown menu items, cover upload hint, status badges, inline indicators

Implementation: set `strokeWidth={1.5}` as the Lucide default, then override to `2` on interactive surfaces via CSS:

```css
.sidebar-nav svg,
.toolbar svg,
.lesson-list svg,
.btn svg { stroke-width: 2; }
```

## Screen Designs

### 1. My Courses

**Layout:** Gunmetal sidebar (220px, uses `--sidebar-w-editor`) + top bar (48px, uses `--topbar-h`) + 3-column card grid.

**Sidebar (shared shell across all pages):**
- Logo mark (mint square with "T") + "TideLearn" in Lora
- Nav items: My Courses, Settings, Help — each with icon (stroke 2.0) + label (12px, DM Sans 500)
- Active state: mint background tint + mint text
- Sidebar nav text: 12px, weight 500 (validates AA at 4.8:1 since 12px bold equivalent)
- User avatar row at bottom: initials circle + email

**Top bar:**
- Left: "My Courses" (Lora, 15px, 600)
- Right: Import JSON (ghost button) + New Course (primary mint button)

**Card grid:**
- 3 columns, 16px gap
- Each card: white surface (`--canvas-white`), `--radius-lg` (10px), 1px border (`--border`), no default box-shadow
- Hover: translateY(-2px) + `--shadow-hover` (shadow appears only on hover)

**Card anatomy (top to bottom):**
1. **Cover strip** — 82px fixed height, dark gradient background, emoji icon in bottom-left. Not a hero image — just a visual identifier. "Change cover" hint appears on hover.
2. **Card body** — title (13px, 600), lesson/quiz stat counters (15px bold number + 9.5px uppercase label), footer row.
3. **Footer** — last-edited date (left), status badge (Published/Draft), Edit button (right, appears on hover).

**Interactions:**
- **Whole card** is clickable → navigates to Editor
- **··· button** — always visible at 35% opacity, full opacity on hover. Opens dropdown with: Duplicate, Export JSON, Export SCORM 1.2, Copy share link, Make private/public, Delete (red).
- **Edit button** — appears on hover, shortcut to enter Editor
- **"+ New Course" card** — dashed border placeholder in last grid slot

**Responsive behavior** is out of scope for this spec — existing breakpoints are preserved as-is, but a dedicated responsive pass follows separately.

### 2. Editor

**Layout:** Lesson sidebar (220px, `--sidebar-w-editor`) + top bar (48px, `--topbar-h`) + block canvas.

**Lesson sidebar:**
- **Header:** back link ("← All courses"), course title (Lora), lesson count ("12 lessons · 1 quiz")
- **Lesson list:** numbered items with type icons (document for content, checkmark-circle for assessment). Active lesson: mint highlight. Drag handle appears on hover.
- **Actions:** "+ Add lesson", "+ Add assessment" below the list
- **Footer:** "Export SCORM" button only. No Publish here (lives in top bar to avoid duplication).

**Top bar:**
- **Left:** Two-line structure:
  - Line 1 (breadcrumb): "← Course Name" (10px, muted, clickable — navigates back to My Courses)
  - Line 2 (title): Lesson title (13.5px, 600, click-to-edit with dashed underline hint on hover)
- **Right:** Undo/Redo icon buttons | Preview (text button) | "✓ Saved" autosave indicator (green) | Publish (primary mint button)

**Block canvas:**
- White background (`--canvas-white`), 40px padding
- Content constrained to `--reading-max-w` (680px, unchanged), centered
- Blocks: heading (Lora), paragraph (DM Sans 14px), callout (mint left border + mint tint bg), image drop zone
- **Add block rows** between every block: horizontal mint line + circular "+" button. Visible on hover.
- **Selected block:** 2px mint outline + floating block toolbar above (dark background, icons for: bold, italic, move up, move down, delete)

**Autosave:**
- No Save button. App autosaves to localStorage.
- Top bar shows "✓ Saved" in green when synced. Shows "Saving..." during write. Shows "● Unsaved" if there's an error.

### 3. Settings (New Page)

This is a **new page** — no `Settings.tsx` exists yet. Requires:
- New file: `src/pages/Settings.tsx`
- New route: `/settings`
- Sidebar nav link addition

**Layout:** Same sidebar shell (Settings nav item active) + top bar ("Settings") + form content.

**Content area:** max-width 520px, left-aligned (not centered).

**Sections (each with uppercase label header + divider):**

1. **Profile**
   - Avatar (52px circle, mint tint bg, initials, pencil edit overlay)
   - Display name (text input)
   - Email (read-only input, greyed, hint: "Managed by Google")
   - Save changes button

2. **Connected accounts**
   - Google row: Google logo + email + "Connected" badge

3. **Session**
   - Sign out: description + ghost Sign out button

4. **Danger zone**
   - Red header, red-tinted border
   - Delete account: description + red-outlined Delete button

## What's Not Changing

- **Landing page** — Already redesigned in A.4. Will receive token updates (palette swap) but no structural changes.
- **Viewer** (learner-facing) — Already redesigned in A.3. Will receive token updates but no structural changes.
- **Auth page** — Minimal Google OAuth screen. Token updates only.
- **Block types** — All 19 block types keep their current behavior. Only styling tokens change.
- **MCP server** — No changes.
- **Data model** — No changes to course JSON, Supabase schema, or localStorage format.
- **Layout CSS vars** — `--sidebar-w-editor` (220px), `--sidebar-w-viewer` (200px), `--topbar-h` (48px), `--canvas-max-w` (828px), `--reading-max-w` (680px), `--content-px` (64px) — all unchanged.

## Migration Strategy

### Token System

All tokens stay as **bare HSL triplets** for shadcn compatibility (consumed via `hsl(var(--token))`). The new shadcn token values are defined in the "shadcn Semantic Tokens" section above. Custom Gunmetal properties use hex values directly.

### Complete Rockpool → Gunmetal Token Mapping

**Removed (delete entirely):**

| Token | Reason |
|-------|--------|
| `--ocean-deepest`, `--ocean-deep`, `--ocean-surface`, `--ocean-mid` | Replaced by `--sidebar`, `--sidebar-2`, `--sidebar-3` |
| `--teal-primary`, `--teal-bright`, `--teal-light`, `--teal-cyan`, `--teal-glow` | Replaced by `--accent` (#40c8a0). No scale needed — single accent color. |
| `--gradient-primary`, `--gradient-teal` | No gradients in Gunmetal. |
| `--surface`, `--surface-subtle`, `--surface-tint` | Replaced by `--canvas`, `--canvas-2`, `--canvas-white` |
| `--border-subtle`, `--border-emphasis`, `--border-mid` | Replaced by single `--border` (#c8d4e0) |
| `--text-primary`, `--text-body`, `--text-on-dark`, `--text-on-dark-dim` | Replaced by `--ink`, `--muted`, `--sidebar-text` |
| `--text-muted` | **Kept as `--text-muted`** (#6a7a90) — same value, same name. Referenced 15+ times in component code; renaming would be churn for no benefit. Note: shadcn's `--muted-foreground` maps to the same HSL value, so both are available. |

**Updated (change value):**

| Token | Old value | New value |
|-------|-----------|-----------|
| `--shadow-card` | teal-tinted rgba | `0 1px 3px rgba(0,0,0,0.05), 0 1px 8px rgba(26,44,56,0.04)` |
| `--shadow-hover` | teal-tinted rgba | `0 4px 20px rgba(26,44,56,0.12)` |
| `--shadow-modal` | teal-tinted rgba | `0 32px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(26,44,56,0.1)` |
| `--shadow-popup` | teal-tinted rgba | `0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(26,44,56,0.08)` |

**Unchanged:** `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, all layout vars.

### Utility Class Updates

| Utility | Change |
|---------|--------|
| `.bg-hero` | Re-tint from teal to Gunmetal: `radial-gradient(ellipse 60% 50% at 50% 40%, rgba(64,200,160,0.08) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(64,200,160,0.05) 0%, transparent 55%)` |
| `.skip-link` | Replace `focus:text-teal-700` with `focus:text-emerald-700`, `focus:ring-teal-500` with `focus:ring-emerald-500` (closest Tailwind match for mint) |
| `@keyframes pulse-ring` | Re-tint from `rgba(20,184,166,*)` to `rgba(64,200,160,*)` |

### Removed Concepts

- **`.card-surface`** — already removed in A.5, do not recreate
- **`.text-gradient`** — already removed, do not recreate
- **Dark mode** — stays removed (`darkMode` config already deleted)
- **Gradient buttons** — no gradients anywhere in the new system

### Icon Migration

Lucide is already installed. Change is stroke-width only — add a global CSS rule for interactive surfaces and leave decorative icons at default 1.5.

## Accessibility

- All text meets WCAG AA contrast on its target background:
  - `--ink` (#1a2030) on `--canvas-white` (#f8fbff): 14.2:1
  - `--muted` (#6a7a90) on `--canvas-white` (#f8fbff): 5.1:1
  - `--sidebar-text` (#7a8da4) on `--sidebar` (#252c38): 4.8:1 — valid for sidebar nav text at 12px weight 500 (equivalent to bold per WCAG)
  - `--accent` (#40c8a0) on `--sidebar` (#252c38): 5.7:1
- Focus indicators: 2px mint outline on interactive elements
- Keyboard navigation: all actions reachable via Tab/Enter/Escape
- `prefers-reduced-motion`: global kill switch disables all animations and transitions (see Motion Design section)
- Skip-to-content link already in App.tsx, targets `#main-content`

## Motion Design

All motion uses CSS transitions/animations. No JS animation libraries. Every motion must respect `prefers-reduced-motion` (see Accessibility section).

**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (expo ease-out) for all transitions. Stored as `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.

### Card hover (My Courses)

```css
.card {
  transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
```

### Staggered card entrance (My Courses)

Cards fade in with translateY(12px→0) on page load, staggered by 40ms per card. CSS only via `animation-delay` on nth-child.

```css
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card {
  animation: card-in 350ms var(--ease-out) both;
}
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 40ms; }
.card:nth-child(3) { animation-delay: 80ms; }
/* etc — cap at 200ms total stagger */
```

### Dropdowns and popovers

Open: scale(0.95)→scale(1) + opacity 0→1 over 120ms. Origin: top-right for ··· menu.
Close: opacity 1→0 over 80ms (no scale on close — feels snappier).

```css
.dropdown[data-state="open"] {
  animation: dropdown-in 120ms var(--ease-out);
}
@keyframes dropdown-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
```

### Block add/remove (Editor)

**Add:** New block fades in with height expansion using `grid-template-rows: 0fr → 1fr` transition (avoids animating `height` directly). Duration: 200ms.

**Remove:** Block fades out (opacity 100→0, 120ms), then collapses height (grid-template-rows 1fr→0fr, 150ms). Total: 270ms.

**Block toolbar:** Appears with opacity 0→1 + translateY(4px→0) over 100ms when block is selected.

### Lesson switching (Editor)

Canvas content crossfades on lesson change. Outgoing lesson: opacity 1→0 (80ms). Incoming lesson: opacity 0→1 (150ms). No translateX/Y — just a soft cut.

```css
.canvas-content-enter { animation: fade-in 150ms var(--ease-out); }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
```

### Save state indicator

"✓ Saved" text fades in with opacity 0→1 over 200ms after autosave completes. No exit animation (stays visible).

### Page transitions (My Courses ↔ Editor)

Use View Transitions API where supported (`document.startViewTransition`). Fallback: simple opacity crossfade via React transition.

```css
@supports (view-transition-name: card) {
  .card { view-transition-name: course-card; }
}
::view-transition-old(course-card),
::view-transition-new(course-card) {
  animation-duration: 250ms;
  animation-timing-function: var(--ease-out);
}
```

Progressive enhancement — browsers without View Transitions get instant navigation (current behavior). No polyfill.

### Reduced motion

All of the above is disabled under `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Out of Scope

- Responsive mobile layout (addressed as separate task after desktop is complete)
- New features (no new block types, no new settings beyond Settings page shell)
- Backend changes
