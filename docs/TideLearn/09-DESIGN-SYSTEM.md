# TideLearn — Design System (Rockpool)

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← MCP Server](08-MCP-SERVER.md) | [Index](00-INDEX.md) | Next: [SCORM Export →](10-SCORM-EXPORT.md)*

---

## Overview

**Rockpool** is TideLearn's design system. It defines CSS custom properties, typography, spacing, and colour tokens used throughout the application. The system prioritizes calm clarity — reducing cognitive load so content shines.

---

## Brand Identity

| Attribute | Value |
|-----------|-------|
| **Personality** | Calm, clear, professional |
| **Accent colour** | `#40c8a0` (teal) |
| **Body font** | DM Sans |
| **Display font** | Lora (serif) |
| **Dark mode** | None — `darkMode` config removed; `dark:` utilities in shadcn/ui are inert |

---

## Colour Tokens

### Core Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-hex` | `#40c8a0` | Brand accent. Use for CTAs, active states, links |
| `--text-muted` | `#6a7a90` | Muted text (5.1:1 contrast — WCAG AA) |

### Gunmetal Theme

The app uses a dark Gunmetal theme established in the Gunmetal UI Overhaul. CSS custom properties are defined in `src/index.css` under `:root`.

### Removed Tokens

These tokens no longer exist — do not recreate:
- `--color-teal-*` (replaced by `--accent-hex`)
- `.card-surface` (utility class removed)
- `.text-gradient` (utility class removed)

---

## Typography

### Font Stack

```css
/* Body text */
font-family: 'DM Sans', sans-serif;

/* Display headings */
font-family: 'Lora', serif;
```

### Scale

Use Tailwind's default type scale. Key usage:
- **Headings** in viewer: Lora (serif) for visual hierarchy
- **Body text**: DM Sans for readability
- **Code blocks**: System monospace stack

### Accessibility

- Minimum body text: `text-base` (16px)
- Line height: Tailwind defaults (1.5 for body)
- `text-balance` for headings, `text-pretty` for body paragraphs

---

## Layout Tokens

CSS custom properties for consistent layout (defined in `:root`):

| Token | Purpose |
|-------|---------|
| `--sidebar-w-editor` | Editor sidebar width |
| `--sidebar-w-viewer` | Viewer sidebar width |
| `--topbar-h` | Top navigation bar height |
| `--canvas-max-w` | Maximum editor canvas width |
| `--reading-max-w` | Maximum reading area width (viewer) |
| `--content-px` | Content horizontal padding |

**Rule**: Use these CSS custom properties instead of magic numbers. They ensure consistency across breakpoints.

---

## Component Library (shadcn/ui)

TideLearn uses shadcn/ui as its component primitive library.

### Rules

1. **Never modify** files in `src/components/ui/` — they are shadcn/ui primitives
2. Create wrapper components in `src/components/` for custom behavior
3. Use built-in variants before adding custom styles
4. Use `cn()` from `@/lib/utils` for conditional class merging:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-classes", condition && "conditional-classes")} />
```

### Key Components Used

| Component | Usage in TideLearn |
|-----------|-------------------|
| `Button` | Actions, CTAs, navigation |
| `Dialog` | Course creation, block settings |
| `DropdownMenu` | Block type picker, course actions |
| `Input`, `Textarea` | Form fields in block editors |
| `Select` | Dropdowns (block type, chart type, etc.) |
| `Tabs` | Editor/viewer layout tabs |
| `Tooltip` | Icon button labels, help text |
| `AlertDialog` | Destructive actions (delete course, etc.) |

---

## Accessibility Standards

### Requirements

- **WCAG AA minimum** — every component
- **Semantic HTML** — prefer native elements (`<button>`, `<nav>`, `<main>`)
- **Keyboard navigation** — all interactive elements reachable by Tab
- **Focus management** — visible focus rings, focus trapping in dialogs
- **ARIA attributes** — `aria-live` for quiz results, `aria-label` for icon buttons
- **Skip-to-content** — Link in `App.tsx` targeting `#main-content`
- **Colour contrast** — 4.5:1 minimum for text, 3:1 for large text

### Audit Status

All accessibility audits (A.1–A.5) have been completed and merged to main. Key fixes included:
- Accessible dialogs with focus trapping
- HotspotForm keyboard navigation
- `aria-live` regions for quiz results
- Focus management on lesson navigation
- Skip-to-content link

---

## Design Principles

1. **Content is king** — Minimize chrome, maximize reading area
2. **Quiet confidence** — Teal accent sparingly for wayfinding
3. **Accessible by default** — WCAG AA, semantic HTML, keyboard nav
4. **System consistency** — Use Rockpool tokens, Tailwind utilities, shadcn/ui
5. **Progressive disclosure** — Show what's needed, when it's needed

---

## Styling Rules

### Do

- Use Tailwind utilities for all styling
- Use CSS custom properties from Rockpool (`var(--accent-hex)`, etc.)
- Use `cn()` for conditional classes
- Use layout tokens instead of magic numbers

### Don't

- Hard-code colour hex values — use tokens
- Use inline styles — use Tailwind classes
- Create new CSS utility classes unless absolutely necessary
- Add `dark:` variants (no dark mode)
- Recreate removed utilities (`.card-surface`, `.text-gradient`)
