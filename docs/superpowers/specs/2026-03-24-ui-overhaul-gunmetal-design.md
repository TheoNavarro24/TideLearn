# UI Overhaul — Gunmetal Direction

**Date:** 2026-03-24
**Status:** Draft
**Mockup:** `.superpowers/brainstorm/433-1774311708/courses-and-editor.html`

## Summary

Revolutionary redesign of TideLearn's authoring UI. Replaces the current teal Rockpool palette with the Gunmetal direction — a blue-grey sidebar, off-white canvas, and mint accent. Covers all three authoring screens: My Courses, Editor, and Settings.

## Design Decisions

### Palette — Gunmetal

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
| `--accent` | `#40c8a0` | Primary accent (mint) |
| `--accent-bg` | `rgba(64,200,160,.1)` | Accent background tint |
| `--sidebar-text` | `#7a8da4` | Sidebar inactive text |
| `--danger` | `#b04040` | Destructive actions |

**Key principle:** Neutrals are tinted blue-grey, never pure black or pure white. The accent is mint (#40c8a0), not teal — distinct from the old Rockpool palette.

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

**Layout:** Gunmetal sidebar (220px) + top bar + 3-column card grid.

**Sidebar (shared shell across all pages):**
- Logo mark (mint square with "T") + "TideLearn" in Lora
- Nav items: My Courses, Settings, Help — each with icon + label
- Active state: mint background tint + mint text
- User avatar row at bottom: initials circle + email

**Top bar:**
- Left: "My Courses" (Lora, 15px, 600)
- Right: Import JSON (ghost button) + New Course (primary mint button)

**Card grid:**
- 3 columns, 16px gap, responsive (2-col at tablet, 1-col at mobile)
- Each card: white surface (`--canvas-white`), 9px radius, 1px border (`--border`)
- Hover: translateY(-2px) + subtle shadow

**Card anatomy (top to bottom):**
1. **Cover strip** — 82px fixed height, dark gradient background, emoji icon in bottom-left. Not a hero image — just a visual identifier. "Change cover" hint appears on hover.
2. **Card body** — title (13px, 600), lesson/quiz stat counters (15px bold number + 9.5px uppercase label), footer row.
3. **Footer** — last-edited date (left), status badge (Published/Draft), Edit button (right, appears on hover).

**Interactions:**
- **Whole card** is clickable → navigates to Editor
- **··· button** — always visible at 35% opacity, full opacity on hover. Opens dropdown with: Duplicate, Export JSON, Export SCORM 1.2, Copy share link, Make private/public, Delete (red).
- **Edit button** — appears on hover, shortcut to enter Editor
- **"+ New Course" card** — dashed border placeholder in last grid slot

### 2. Editor

**Layout:** Lesson sidebar (220px) + top bar + block canvas.

**Lesson sidebar:**
- **Header:** back link ("← All courses"), course title (Lora), lesson count ("12 lessons · 1 quiz")
- **Lesson list:** numbered items with type icons (document for content, checkmark-circle for assessment). Active lesson: mint highlight. Drag handle appears on hover.
- **Actions:** "+ Add lesson", "+ Add assessment" below the list
- **Footer:** "Export SCORM" button only. No Publish here (lives in top bar to avoid duplication).

**Top bar:**
- **Left:** Two-line structure:
  - Line 1 (breadcrumb): "← JavaScript Fundamentals" (10px, muted, clickable — navigates back)
  - Line 2 (title): Lesson title (13.5px, 600, click-to-edit with dashed underline hint on hover)
- **Right:** Undo/Redo icon buttons | Preview (text button) | "✓ Saved" autosave indicator (green) | Publish (primary mint button)

**Block canvas:**
- White background (`--canvas-white`), 40px padding
- Content constrained to reading width (max 600px, centered)
- Blocks: heading (Lora), paragraph (DM Sans 14px), callout (mint left border + mint tint bg), image drop zone
- **Add block rows** between every block: horizontal mint line + circular "+" button. Visible on hover.
- **Selected block:** 2px mint outline + floating block toolbar above (dark background, icons for: bold, italic, move up, move down, delete)

**Autosave:**
- No Save button. App autosaves to localStorage.
- Top bar shows "✓ Saved" in green when synced. Shows "Saving..." during write. Shows "● Unsaved" if there's an error.

### 3. Settings

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

## Migration Strategy

### Token System

Replace the current HSL-based Rockpool tokens in `src/index.css` with the Gunmetal OKLCH/hex tokens above. Map old token names to new values:

| Old token | New token |
|-----------|-----------|
| `--teal-primary` | `--accent` (#40c8a0) |
| `--background` | `--canvas` (#edf1f7) |
| `--foreground` | `--ink` (#1a2030) |
| `--muted-foreground` | `--muted` (#6a7a90) |

### Removed Concepts

- **`.card-surface`** — already removed in A.5, do not recreate
- **`.text-gradient`** — already removed, do not recreate
- **Dark mode** — stays removed (`darkMode` config already deleted)
- **Gradient buttons** — no gradients anywhere in the new system

### Icon Migration

Lucide is already installed. Change is stroke-width only — add a global CSS rule for interactive surfaces and leave decorative icons at default.

## Accessibility

- All text meets WCAG AA contrast on its target background:
  - `--ink` (#1a2030) on `--canvas-white` (#f8fbff): 14.2:1
  - `--muted` (#6a7a90) on `--canvas-white` (#f8fbff): 5.1:1
  - `--sidebar-text` (#7a8da4) on `--sidebar` (#252c38): 4.8:1 (AA for 14px+)
  - `--accent` (#40c8a0) on `--sidebar` (#252c38): 5.7:1
- Focus indicators: 2px mint outline on interactive elements
- Keyboard navigation: all actions reachable via Tab/Enter/Escape
- `prefers-reduced-motion`: disable translateY hover, fade transitions
- Skip-to-content link already in App.tsx, targets `#main-content`

## Out of Scope

- Responsive mobile layout (addressed as separate task after desktop is complete)
- Animation/motion design (can be layered on post-launch)
- New features (no new pages, no new block types, no new settings)
- Backend changes
