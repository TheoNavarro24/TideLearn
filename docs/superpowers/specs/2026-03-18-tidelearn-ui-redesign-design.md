# TideLearn UI Redesign — Design Spec

**Date:** 2026-03-18
**Author:** Theo Navarro
**Status:** Approved for implementation

---

## 1. Overview

TideLearn is a personal e-learning authoring tool with MCP integration. This spec covers a complete UI/UX overhaul replacing the existing violet/generic shadcn aesthetic with the **Rockpool** design system — an ocean-themed palette of deep teals and cyans that feels premium, immersive, and distinctive.

The goal is a tool that looks handcrafted, not off-the-shelf. Immersive dark surfaces for chrome (nav, sidebars, topbars) contrast with clean white content areas. The design is personal and showcase-worthy, not commercial SaaS.

---

## 2. Design System

### 2.1 Colour Tokens

Define as CSS custom properties in `src/index.css`. Replace all violet/purple HSL tokens entirely.

```css
:root {
  /* Dark ocean surfaces */
  --ocean-deepest:  #071612;   /* auth bg, deep backgrounds */
  --ocean-deep:     #0a1f1c;   /* landing hero */
  --ocean-surface:  #0f1f1d;   /* all topbars / navbars */
  --ocean-mid:      #1e4a44;   /* all sidebars */

  /* Teal accent scale */
  --teal-primary:   #0d9488;   /* primary buttons, active states */
  --teal-bright:    #14b8a6;   /* accents, dots, chips, borders */
  --teal-light:     #5eead4;   /* text on dark, hover states */
  --teal-cyan:      #0891b2;   /* gradient end point */
  --teal-glow:      #06b6d4;   /* mid-gradient, glow effects */

  /* Semantic gradients */
  --gradient-primary: linear-gradient(135deg, #0d9488, #0891b2);
  --gradient-teal:    linear-gradient(90deg, #14b8a6, #06b6d4, #0891b2);

  /* Content surfaces */
  --surface:          #ffffff;   /* main content areas */
  --surface-subtle:   #f8fffe;   /* canvas bg, grid bg */
  --surface-tint:     #f0fdfb;   /* hover states, tinted areas */

  /* Borders */
  --border-subtle:    #e0fdf4;   /* card borders, dividers */
  --border-emphasis:  #99f6e4;   /* active/hover borders */
  --border-mid:       #d1faf4;   /* form inputs, mid-weight borders */

  /* Text */
  --text-primary:     #0d2926;   /* headings on white */
  --text-body:        #334155;   /* body copy */
  --text-muted:       #94a3b8;   /* meta, timestamps */
  --text-on-dark:     #ccfbf1;   /* body text on dark surfaces */
  --text-on-dark-dim: rgba(204,251,241,0.6);  /* muted text on dark (teal-100 @ 60%) */
}
```

### 2.2 shadcn Semantic Token Remapping

The existing `src/index.css` uses shadcn's HSL-variable system. Every shadcn component reads `hsl(var(--primary))`, `hsl(var(--border))`, `hsl(var(--ring))`, etc. These tokens **must be preserved** and remapped to Rockpool-equivalent HSL values — they are not removed. The Rockpool custom properties from §2.1 are added alongside them.

Replace the `:root` block in `src/index.css` with both sets of tokens:

```css
:root {
  /* ── shadcn semantic tokens (remapped to Rockpool palette) ── */
  --background:             0 0% 100%;
  --foreground:             176 57% 11%;   /* #0d2926 */

  --card:                   0 0% 100%;
  --card-foreground:        176 57% 11%;

  --popover:                0 0% 100%;
  --popover-foreground:     176 57% 11%;

  --primary:                173 84% 32%;   /* #0d9488 (teal-primary) */
  --primary-foreground:     0 0% 100%;

  --secondary:              168 94% 95%;   /* #f0fdfb (surface-tint) */
  --secondary-foreground:   176 57% 11%;

  --muted:                  168 94% 95%;   /* #f0fdfb */
  --muted-foreground:       215 16% 57%;   /* #94a3b8 */

  --accent:                 168 94% 95%;
  --accent-foreground:      176 57% 11%;

  --destructive:            0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;

  --border:                 153 94% 93%;   /* #e0fdf4 (border-subtle) */
  --input:                  174 75% 89%;   /* #d1faf4 (border-mid) */
  --ring:                   174 72% 40%;   /* #14b8a6 (teal-bright) */

  --radius: 0.5rem;   /* 8px — use --radius-* tokens for finer control */

  /* shadcn sidebar tokens (app uses custom sidebar, these are kept for compatibility) */
  --sidebar-background:          170 38% 20%;   /* #1e4a44 (ocean-mid) */
  --sidebar-foreground:          166 94% 90%;   /* #ccfbf1 */
  --sidebar-primary:             174 72% 40%;   /* #14b8a6 */
  --sidebar-primary-foreground:  0 0% 100%;
  --sidebar-accent:              170 38% 23%;
  --sidebar-accent-foreground:   166 94% 90%;
  --sidebar-border:              170 80% 35%;
  --sidebar-ring:                174 72% 40%;
}
```

> **Note:** The `.dark` block from the original file should be removed — this app does not support a dark mode toggle (§8). Dark surfaces are implemented by explicit `--ocean-*` token usage, not via CSS class toggle.

### 2.4 Typography

Two typefaces throughout:

| Face | Source | Usage |
|------|--------|-------|
| **Lora** (serif) | Google Fonts, weights 600/700 | All primary display headings: page titles, lesson titles, auth headline, landing hero, course cards in learner view |
| **Inter** | Google Fonts, weights 400/500/600/700/800 | All UI text: nav items, labels, body copy, buttons, inputs, metadata |

**Load in `index.html`:**
```html
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Typography scale:**
- Hero headline: Lora 52px / 700 / ls -0.03em (landing only)
- Page title: Lora 18px / 700 / ls -0.02em (topbar "My Courses", "Fire Hazards")
- Section heading: Inter 15px / 700 / ls -0.02em
- Body: Inter 14–15px / 400–500 / lh 1.65
- Label / chip: Inter 10–11px / 700 / uppercase / ls 0.08em
- Meta: Inter 11px / 500 / `--text-muted`

### 2.5 Radius & Shadow

```css
--radius-sm:  6px;   /* buttons, chips, inputs */
--radius-md:  8px;   /* block cards, dropdowns */
--radius-lg:  10px;  /* course cards */
--radius-xl:  14px;  /* modals, auth card */

--shadow-card:   0 1px 3px rgba(0,0,0,0.05), 0 1px 8px rgba(13,148,136,0.04);
--shadow-hover:  0 4px 20px rgba(13,148,136,0.12);
--shadow-modal:  0 32px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(13,148,136,0.1);
--shadow-popup:  0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(13,148,136,0.08);
```

---

## 3. Pages

### 3.1 Landing Page (`/`) — `src/pages/Index.tsx`

**Reference mockup:** `fullpage-immersive.html`

**Layout:** Full-viewport dark hero + wave SVG divider + white features section + dark footer.

**Nav** (fixed, `--ocean-deep` bg, blur backdrop):
- Left: 🌊 logo mark (28px, teal gradient, 6px radius) + "TideLearn" Inter 800 white
- Right: "My Courses" link (teal), "Sign In" button (teal outline)

**Hero section** (`min-height: 100vh`, `--ocean-deep` bg):
- Radial teal glow behind headline: `radial-gradient(ellipse 60% 50% at 50% 40%, rgba(20,184,166,0.12) 0%, transparent 65%)`
- Eyebrow: Inter 11px uppercase teal "PERSONAL · COURSE AUTHORING TOOL"
- Headline: Lora 52px 700 white, `letter-spacing: -0.03em`, line-break with `<em>` italic on "tide" in teal
  > "Build courses
  > the tide *brings in.*"
- Subhead: Inter 18px `rgba(255,255,255,0.6)`, max-width 480px
- CTAs: "Start authoring →" (teal gradient button) + "See features" (ghost white border)
- Editor preview card: `margin-top: 56px`, `max-width: 720px`, dark card (`#0f2e2b`) with teal gradient top stripe, simulated editor chrome, bleeds into features section below

**Wave divider SVG** between hero and features section.

**Features section** (white bg, `padding: 80px 0`):
- Teal gradient 3px top stripe
- Section label: Inter 11px uppercase teal "WHAT'S INSIDE"
- 5 feature rows, each: large number (Lora, teal, 48px), title (Inter 20px 700), description (Inter 15px body)
  1. Block-based editing
  2. Instant publish & shareable URL
  3. SCORM 1.2 export
  4. Cloud sync (Supabase)
  5. Build with LLMs via MCP

**Footer** (`--ocean-deep` bg, centered):
- "A personal project by Theo Navarro" — Inter 13px `rgba(255,255,255,0.4)`
- Year + TideLearn name

---

### 3.2 Auth Page (`/auth`) — `src/pages/Auth.tsx`

**Reference mockup:** `fullpage-auth-v2.html`

**Layout:** Full-viewport `--ocean-deepest` bg with radial teal glow. Single centred card (400px wide, `--radius-xl`, frosted glass effect).

**Background:**
```css
background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,148,136,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(6,182,212,0.1) 0%, transparent 55%);
```

**Card:**
- 3px teal gradient stripe at top
- Logo: 🌊 mark + "TideLearn"
- Headline: Lora 22px 700 white "Welcome back"
- Subtitle: 13px `var(--text-on-dark-dim)` (muted teal on dark)
- Google OAuth button: dark glass style (`rgba(255,255,255,0.06)` bg, white text, Google SVG icon)
- Divider: "or email"
- Email + password inputs: dark glass (`rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.1)` border, white text, teal focus border)
- Submit: teal gradient full-width button "Sign in →"
- Footer note: "No account? Create one free" (teal link)

---

### 3.3 Courses Page (`/courses`) — `src/pages/Courses.tsx`

**Reference mockup:** `fullpage-courses-v7.html` (populated) + `fullpage-courses-empty.html` (empty state)

**Layout:** 216px dark sidebar + white main content. `height: 100vh`.

**Sidebar** (`--ocean-mid` bg, `border-right: 1px solid rgba(20,184,166,0.18)`):
- Logo area (border-bottom): 🌊 mark + "TideLearn" Inter 800 white
- Nav sections with uppercase labels (9.5px, `rgba(94,234,212,0.45)`):
  - LIBRARY: My Courses (with count badge), Quick Draft
  - TOOLS: Import JSON
- Active item: `rgba(20,184,166,0.18)` bg, `#ccfbf1` text, 600 weight
- Hover: `rgba(20,184,166,0.12)` bg
- User footer (border-top): avatar circle (teal gradient initials), name (`#a7f3d0`), email (dimmed), sign-out button

**Topbar** (white, `border-bottom: var(--border-subtle)`, 54px):
- Title: Lora 18px 700 `--text-primary` "My Courses"
- Right: "Import" button (teal outline) + "+ New Course" (teal gradient)

**New course prompt** (white card, `--border-subtle` border, `--radius-md`, `margin: 22px 28px 0`):
- Text input: "Name your new course — e.g. Fire Safety Induction 2026…"
- "Create →" teal gradient button

**Search bar** (white, `border-bottom: #f0fdf4`, `padding: 14px 28px`):
- Search input (260px, teal focus)
- "X courses" count (right-aligned, Lora bold for number)

**Course grid** (`gap: 24px`, `grid-template-columns: repeat(auto-fill, minmax(270px, 1fr))`):

Each card:
- `background: white`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`, `var(--shadow-card)`
- Hover: `border-color: var(--teal-bright)`, `var(--shadow-hover)`, `translateY(-2px)`
- **Card visual header** (88px): `background: var(--gradient-primary)` with white radial highlights (not dark teal — bright and vibrant)
  - Dots (top-right): 3–4 dots, `rgba(255,255,255,0.3)` inactive / `rgba(255,255,255,0.85)` active
  - Lesson count: `rgba(255,255,255,0.9)` 11px 600
- **Card body** (`padding: 14px 16px 16px`):
  - Title: Inter 15px 700 `--text-primary`, `letter-spacing: -0.02em`
  - Meta: Inter 11px 500 `--text-muted`
  - Footer: "Open →" teal gradient button (flex: 1) + "···" overflow button (32px square, `--border-mid`)
- **Overflow dropdown** (positioned `bottom: calc(100% + 6px)`, `right: 0`, `z-index: 100`, `var(--shadow-popup)`):
  - Items: 📋 Duplicate, 📤 Export JSON, 📦 Export SCORM, 🔗 Copy share link, [separator], 🗑 Delete (red)

**Empty state** (when 0 courses, replaces grid):
- 96px circle `#e0fdf7` bg with 🌊 40px emoji
- Lora 22px 700: "Your ocean is empty"
- Subtitle 14px `--text-muted`
- Two CTAs: "+ Create a course" (teal gradient) + (if MCP available: note for advanced users only, no UI button)
- Link: "or import an existing JSON file"

---

### 3.4 Editor Page (`/editor`) — `src/pages/Editor.tsx`

**Reference mockup:** `fullpage-editor-v3.html`

**Layout:** `grid-template-columns: 220px 1fr; grid-template-rows: 48px 1fr; height: 100vh`

**Topbar** (`--ocean-surface` bg, `border-bottom: rgba(20,184,166,0.15)`, 48px):
- Left: "← My Courses" button (12px 600, `rgba(94,234,212,0.5)`, hover full teal)
- Divider (1px `rgba(20,184,166,0.15)`)
- Course title: editable inline input (13px 600 white, transparent bg)
- Right: "Saved" indicator (5px teal dot + "Saved" text) + "👁 Preview" button (teal glass) + "↗ Publish" (teal gradient)

**Sidebar** (same as Courses sidebar, `--ocean-mid` bg):
- Header label: "LESSONS"
- Lesson list: numbered (teal number on active), title, block count. Active has `rgba(20,184,166,0.18)` bg
- "+ Add lesson" dashed button at bottom of list
- Footer: "⚙️ Course settings" + "📦 Export SCORM"

**Canvas area** (`--surface-subtle` bg, `overflow-y: auto`):
- Lesson header (white, `border-bottom: var(--border-subtle)`, `padding: 16px 32px`):
  - Lesson title: **Lora 19px 700** `--text-primary` (editable input — author sees what learner sees)
  - Block count meta (right-aligned)
- Canvas (`padding: 20px 64px 80px`, flex column, centred):
  - Content max-width: 700px
  - **Add block rows**: appear between every block pair (opacity 0 by default, opacity 1 on hover / when active). `+ Add block` pill button (white bg, `--border-emphasis`, teal text, teal gradient when active/open)
  - **Block cards** (white bg, transparent border → `--border-mid` on hover → `--border-emphasis` + teal glow on focused):
    - Block type chip: 9px uppercase teal label
    - Block content (type-specific, see §4)
  - **Block controls**: appear on block hover, positioned `right: -40px`, column of 26px square buttons (↑ ↓ ⧉ ✕). Danger (delete) gets red on hover.

**Block picker popup** (opens from active add-block row; implemented as the `AddBlockMenu` component defined inline in `src/pages/Editor.tsx` ~line 395 — currently a simple dropdown, needs full redesign to match this spec):
- White card, `--radius-md`, `var(--shadow-popup)`, 420px wide
- Search input at top
- 4 category sections with labels + 4-column grid (labels match registry `category` strings):
  - **Text** (`"Text"`): Heading, Text, List, Quote, Callout, Code, Divider, Contents (ToC)
  - **Media** (`"Media"`): Image, Video, Audio
  - **Interactive** (`"Interactive"`): Accordion, Tabs
  - **Knowledge** (`"Knowledge"`): True/False, Multiple Choice (block type `quiz`), Short Answer
- "Multiple Choice" is the display label for the `quiz` block type — aligns with the registry entry `{ type: "quiz", label: "Quiz (simple)" }` which should be relabelled to "Multiple Choice" for consistency with this UI
- Each tile: 34px icon area (category-tinted bg: green/blue/purple/amber), 10px label, hover/selected teal state

---

### 3.5 View Page (`/view`) — `src/pages/View.tsx`

**Reference mockup:** `fullpage-view.html`

**Layout:** Dark topbar + 200px lesson sidebar + main reading column.

**Progress bar**: 3px teal gradient, full width, very top of viewport, shows lesson completion %.

**Topbar** (`--ocean-surface` bg, 48px):
- Left: 🌊 logo mark + "TideLearn"
- Centre: course title (13px 600 white)
- Right: "Exit" (teal text button)

**Lesson sidebar** (200px, `--surface-subtle` bg, `border-right: var(--border-subtle)`):
- "LESSONS" label
- Numbered list. Each lesson: progress dot (filled teal = complete, pulsing ring = current, empty = upcoming) + lesson title
- Active: `border-left: 2px solid var(--teal-primary)`, teal text

**Reading column** (white bg, `max-width: 680px`, `padding: 40px 64px`, centred):
- Lesson label: Inter 11px uppercase teal "LESSON N"
- Lesson title: Lora 28px 700 `--text-primary`
- Blocks rendered clean (no editor chrome):
  - Heading: Inter 22px 800 `--text-primary`
  - Text: Inter 15px lh 1.75 `--text-body`
  - Callout: left border 3px `--teal-primary`, `--surface-tint` bg
  - Image: rounded corners, full width
  - Quiz/True-False: styled answer buttons (teal border on correct answer reveal)

**Bottom nav bar** (fixed, white, `border-top: var(--border-subtle)`, 56px):
- Left: "← Previous lesson"
- Centre: "Lesson N of Y"
- Right: "Next lesson →" (teal gradient button)

---

### 3.6 Publish Modal

**Reference mockup:** `fullpage-publish-v2.html` (approved). Note: `fullpage-publish-modal.html` also exists in the brainstorm folder — it is an earlier draft; use `fullpage-publish-v2.html` only.

Triggered by "↗ Publish" button in editor topbar. Modal overlay (`rgba(7,22,18,0.7)` + editor blurred behind).

**Modal** (500px, `--radius-xl`, 3px teal top stripe):
- 52px success circle (teal gradient, white ✓)
- Lora 22px 700: "Your course is live"
- Subtitle 13px `--text-muted`
- **Share link**: "SHARE LINK" label + monospace URL box + teal "Copy" button
- Divider: "Export for offline & LMS"
- **3 export cards** (side by side): SCORM 1.2 (📦 amber tint), HTML Export (🌐 blue tint), Course JSON (💾 green tint)
- "Done" dismiss link

---

## 4. Block Rendering

All blocks render identically in editor canvas and learner view (author sees exactly what learner sees, including Lora headings).

| Block type | Editor + View appearance |
|------------|--------------------------|
| `heading` | Inter 22px 800 `--text-primary` |
| `text` | Inter 15px lh 1.75 `--text-body` (rich text via TipTap) |
| `image` | Full-width, `--radius-md`, caption below in `--text-muted` |
| `list` | Teal bullet dots (`--teal-bright`), Inter 14px |
| `quote` | Left border 3px `--teal-bright`, italic Lora 16px, cite in `--text-muted` |
| `callout` | `--surface-tint` bg, 3px `--teal-primary` left border, bold title in `--teal-primary` |
| `code` | Monospace, dark bg `#0f2e2b`, teal syntax accent |
| `divider` | 1px `--border-subtle`, `margin: 16px 0` |
| `toc` | Auto-generated list from `heading` blocks, teal links |
| `video` | Embedded player, rounded, full-width |
| `audio` | Teal-styled audio player bar |
| `accordion` | Teal expand chevron, `--border-subtle` border |
| `tabs` | Teal active tab underline |
| `truefalse` | Two large answer buttons, teal border on correct reveal |
| `quiz` | Radio options with teal selected state, Submit button teal gradient |
| `shortanswer` | Text input with teal focus, Submit teal gradient |

---

## 5. Component Overrides (shadcn)

These shadcn components need CSS variable overrides to pick up the Rockpool palette:

- **Button**: `variant="default"` → teal gradient; `variant="outline"` → teal border + text; `variant="ghost"` → transparent + teal hover
- **Input**: teal focus ring (`--teal-bright`), `--border-mid` border
- **Textarea**: teal focus ring (`--teal-bright`), `--border-mid` border (same treatment as Input — used in block editor forms)
- **Card**: `--border-subtle` border, `--radius-lg`
- **Badge**: teal bg tint + teal text
- **Dialog**: `--radius-xl`, `--shadow-modal`, teal top stripe
- **DropdownMenu**: `--radius-md`, `var(--shadow-popup)`, teal hover state

---

## 6. Key Interaction Decisions

- **Add block UX**: Rise-style — `+ Add block` rows between every block, hidden until hover. Clicking opens block picker popup. Popup has search + 4 category sections. No persistent toolbar.
- **Block controls**: Hover-reveal only. Right-side column of icon buttons (↑ ↓ ⧉ ✕). Never shown at rest — keeps canvas clean for reading/writing.
- **Course card actions**: Single primary "Open →" CTA + "···" overflow for secondary actions (duplicate, export, share, delete). No equal-weight button rows.
- **Overflow dropdown**: Positions `bottom: calc(100% + 6px)` above the card — never clips through adjacent cards.
- **Lesson title in editor**: Uses Lora serif so author sees exactly what learner will see. WYSIWYG.
- **Publish flow**: "↗ Publish" → modal with share link + 3 export options. Not a separate page.
- **MCP / Build with AI**: Removed from app UI. MCP integration operates externally through Claude Desktop, Cursor, or any MCP-compatible client connecting to TideLearn's MCP server. No in-app chat or AI interface.
- **Save state**: Auto-save with live "Saved" / "Saving…" indicator in editor topbar (green dot = saved, spinning = saving).

---

## 7. Files to Change

| File | Change type | Notes |
|------|-------------|-------|
| `src/index.css` | Full rewrite | Replace violet HSL tokens with Rockpool CSS custom properties |
| `index.html` | Add fonts + meta | Lora + Inter Google Fonts link; update `<title>` and OG tags (currently reference "Lovable" — should say "TideLearn") |
| `src/pages/Index.tsx` | Full rewrite | Immersive dark landing page |
| `src/pages/Auth.tsx` | Full rewrite | Dark frosted glass auth card |
| `src/pages/Courses.tsx` | Full rewrite | Sidebar app layout + card redesign + empty state |
| `src/pages/Editor.tsx` | Layout upgrade | Lesson sidebar, topbar, canvas with add-block UX |
| `src/pages/View.tsx` | Moderate rewrite | Lesson sidebar, reading column, bottom nav, progress bar |
| `src/components/blocks/` | Colour polish | Update block editors/viewers to use new tokens |
| shadcn components | Token override | Button, Input, Card, Badge, Dialog, DropdownMenu |

---

## 8. Out of Scope

- Mobile/responsive layout (desktop-only tool)
- Dark mode toggle
- New block types
- Any changes to backend/Supabase logic
- MCP server changes
- SCORM export logic changes
