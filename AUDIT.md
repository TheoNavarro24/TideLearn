# TideLearn UI/UX Audit — Full Report
**Scope:** Complete app — landing page, courses list, editor, viewer
**Date:** 2026-03-23
**Method:** Static code analysis (all pages) + deep code audit (Editor.tsx, View.tsx)

---

## Executive Summary

| Severity | Count |
|---|---|
| Critical | 7 |
| High | 11 |
| Medium | 11 |
| Low | 6 |
| **Total** | **35** |

The product's visual identity (teal/dark ocean palette, Lora headings, minimal chrome) is coherent and has clear aesthetic direction. Issues split into two zones:

- **Landing page** — hits nearly every canonical AI-slop fingerprint (dark hero, cyan glow, gradient text, Inter, monospace "technical" chip). This is the first impression.
- **Editor + Viewer** — the two pages users spend 99.9% of their time in — have systemic accessibility failures (keyboard-inaccessible block controls, broken modal, no responsive layout) that will block real users.

---

## Part 1 — App-Wide Audit (Landing, Courses, Shell)

### Anti-Patterns Verdict

**VERDICT: Partial fail.** The landing page (`Index.tsx`) hits several of the most recognisable AI-slop fingerprints:

| Tell | Where |
|------|-------|
| **Gradient text for impact** — `TEAL_GRAD_TEXT` applied to the hero headline | `Index.tsx:547–553` |
| **Dark hero + teal/cyan glowing accents** — canonical AI palette (`#14b8a6 → #06b6d4`) against near-black | `Index.tsx:466–470` |
| **Neon glow dot** — `boxShadow: "0 0 8px #14b8a6"` on the eyebrow pill's indicator | `Index.tsx:518` |
| **`--gradient-teal: 90deg, #14b8a6, #06b6d4, #0891b2`** — that exact cyan drift is in the don't list | `index.css:69` |
| **Centred hero with full-viewport dark section** — everything centre-aligned, no asymmetry | `Index.tsx:487–495` |

The app shell (Editor, Courses, Viewer) avoids most of these. The damage is confined to the landing page, but that's the first thing anyone sees.

---

### Critical Issues

---

**C-1 — Contrast failure: muted text on white**
- **Location**: `src/index.css:83` (`--text-muted: #94a3b8`), hero subhead `Index.tsx:558`, feature descriptions `Index.tsx:428`
- **Category**: Accessibility
- **Description**: `#94a3b8` on `#ffffff` yields a contrast ratio of ~3.06:1. Used for the hero subhead paragraph and all feature row descriptions.
- **Impact**: Fails WCAG 2.1 AA (requires 4.5:1 for normal text). Body copy at 19px and descriptions at 15px both fail.
- **WCAG**: 1.4.3 Contrast (Minimum) — Level AA
- **Recommendation**: Darken muted text to `#64748b` (contrast 5.1:1, passes AA) for body copy contexts. Reserve `#94a3b8` only for truly secondary metadata (timestamps, counts).
- **Suggested command**: `/harden`

---

**C-2 — Landing page has zero responsive design**
- **Location**: `src/pages/Index.tsx` (entire file)
- **Category**: Responsive Design
- **Description**: The entire file uses React inline styles. No `@media` queries, no Tailwind responsive prefixes (`md:`, `lg:`), no CSS variables that change at breakpoints. Fixed values include: nav padding `"18px 56px"`, features section padding `"100px 56px"`, feature grid `gridTemplateColumns: "80px 1fr 1fr"`, EditorCard grid `gridTemplateColumns: "220px 1fr"`.
- **Impact**: On mobile (<768px): nav items overlap, feature rows collapse unreadably, the EditorCard mockup overflows its container, and the CTA buttons may stack outside the viewport.
- **WCAG**: 1.4.10 Reflow — Level AA
- **Recommendation**: Migrate `Index.tsx` to Tailwind classes with responsive prefixes. Replace all fixed pixel padding with `px-6 md:px-14`, feature grid to `grid-cols-1 md:grid-cols-[80px_1fr_1fr]`.
- **Suggested command**: `/adapt`

---

### High-Severity Issues (Part 1)

---

**H-1 — Systemic styling split across pages**
- **Location**: `src/pages/Index.tsx` (100% inline), `src/pages/Courses.tsx` (`const S = { … }` object), vs. all other files using Tailwind
- **Category**: Theming / Maintainability
- **Description**: Three different approaches to styling co-exist: Tailwind utility classes (shadcn components, Editor, View), inline style objects via a `const S` map (Courses.tsx), and ad-hoc inline `style={{}}` objects (Index.tsx). Design token updates in `index.css` only propagate reliably through Tailwind; inline styles that reference CSS vars work but cannot be overridden by Tailwind utilities.
- **Impact**: Refactoring the design system requires touching three different style surfaces. Dark mode can't be toggled via class because inline styles bypass the cascade.
- **Recommendation**: Migrate both pages to Tailwind. The `const S` pattern in Courses.tsx is the lower-effort win — replace with `cn()` class strings.
- **Suggested command**: `/normalize`

---

**H-2 — Gradient text on hero headline**
- **Location**: `Index.tsx:543–553` (`TEAL_GRAD_TEXT` on `<em>`)
- **Category**: Anti-Patterns
- **Description**: Gradient text applied to the climactic word in the headline. This is listed explicitly in the DON'T guidelines: *"gradient text for impact — especially on headings."*
- **Impact**: Looks like templated AI output. Also fails WCAG at lower contrast ratios when the gradient passes through lighter shades.
- **Recommendation**: Use a single strong teal (`--teal-bright`) or white for the emphasis. Italic `<em>` already differentiates it.
- **Suggested command**: `/distill`

---

**H-3 — Dark hero with cyan/teal glowing accents**
- **Location**: `Index.tsx:466–527` (hero section + eyebrow pill)
- **Category**: Anti-Patterns
- **Description**: Dark background (`#0a1f1c`), teal-to-cyan radial gradients, glowing dot (`boxShadow: "0 0 8px #14b8a6"`), neon CTA shadow — this is the canonical AI palette described in the don't list verbatim.
- **Impact**: The first impression of the product looks AI-generated.
- **Recommendation**: Keep the ocean depth as a brand statement, but drop the glow effects and neon CTA shadow. Replace the radial gradient overlay with a more refined texture (the existing line-texture overlay is good — lead with that). Remove the glowing dot from the eyebrow pill.
- **Suggested command**: `/distill`

---

**H-4 — No skip-to-content link on any page**
- **Location**: All pages (missing from `App.tsx`, no global layout wrapper)
- **Category**: Accessibility
- **Description**: There is no `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` link at the top of any page. The landing page nav has 4+ tab stops before reaching the main content.
- **Impact**: Keyboard-only users and screen reader users must tab through the entire navigation on every page load.
- **WCAG**: 2.4.1 Bypass Blocks — Level A
- **Recommendation**: Add a visually-hidden skip link as the very first element in the DOM, revealing on focus.
- **Suggested command**: `/harden`

---

**H-5 — Monospace typography as "technical" shorthand in feature chips**
- **Location**: `Index.tsx:438–447` (FeatureRow visual chip)
- **Category**: Anti-Patterns / Typography
- **Description**: The visual column in each feature row displays text like `"mcp://tidelearn/generate"` and `"📦 course.zip"` in `fontFamily: "monospace"`. The DON'T list explicitly calls this out: *"use monospace typography as lazy shorthand for 'technical/developer' vibes."*
- **Impact**: Looks templated and breaks the editorial feel of the Lora/Inter pairing.
- **Recommendation**: Use Inter at reduced weight with a code-style pill using background colour rather than font-family to signal technical content.
- **Suggested command**: `/polish`

---

**H-6 — `Inter` as primary typeface**
- **Location**: `src/index.css:109`, `Index.tsx:457`, multiple components
- **Category**: Typography
- **Description**: Inter is the most common sans-serif choice in AI-generated UIs, explicitly called out in the DON'T list: *"Inter, Roboto, Arial, Open Sans, system defaults."*
- **Impact**: Contributes to the generic, unbranded feel — especially on the landing page.
- **Recommendation**: Lora (serif, already in use) is distinctive; pair it with a less common sans like **DM Sans**, **Plus Jakarta Sans**, or **Instrument Sans** for body text. Or lean into Lora exclusively for display and use system-ui only for UI chrome.
- **Suggested command**: `/typeset`

---

### Medium-Severity Issues (Part 1)

---

**M-1 — `#94a3b8` used as muted body colour in dark contexts**
- **Location**: `Index.tsx:268, 312` (dark EditorCard mockup)
- **Category**: Accessibility
- **Description**: `#94a3b8` on `#0d1f1d` yields contrast ~3.5:1 for 14px text.
- **WCAG**: 1.4.3 AA (fails for normal text)
- **Recommendation**: Use `#cbd5e1` or `var(--text-on-dark-dim)` for secondary text in dark contexts.
- **Suggested command**: `/harden`

---

**M-2 — Arrow characters in CTA copy read aloud by screen readers**
- **Location**: `Index.tsx:595, 611` ("Start authoring →", "See what it does ↓")
- **Category**: Accessibility
- **Description**: Unicode arrow characters (`→`, `↓`) in button/link text are announced literally as "rightwards arrow" by VoiceOver/NVDA.
- **Recommendation**: Wrap arrows in `<span aria-hidden="true">` or replace with a Lucide icon with `aria-hidden`.
- **Suggested command**: `/harden`

---

**M-3 — No dark mode toggle or `prefers-color-scheme` detection**
- **Location**: `src/index.css`, `tailwind.config.ts`
- **Category**: Theming
- **Description**: Dark mode infrastructure exists (`darkMode: ["class"]`, dark: utilities on prose) but there is no user-facing toggle and no `@media (prefers-color-scheme: dark)` implementation. The CSS variables have no dark variants.
- **Recommendation**: Either add dark token variants inside a `.dark` selector, or remove the infrastructure and commit to light-only for now.
- **Suggested command**: `/colorize`

---

**M-4 — `card-surface` utility uses `backdrop-blur-md` without fallback**
- **Location**: `src/index.css:121`
- **Category**: Performance
- **Description**: `backdrop-blur` triggers GPU compositing and can cause significant performance degradation on older mobile devices and some browsers.
- **Recommendation**: Add `@supports (backdrop-filter: blur())` guard, or replace with a semi-transparent solid background.
- **Suggested command**: `/optimize`

---

**M-5 — Fixed-width EditorCard mockup breaks at 768px**
- **Location**: `Index.tsx:200` (`gridTemplateColumns: "220px 1fr"`)
- **Category**: Responsive Design
- **Description**: The two-column mockup has a fixed 220px sidebar. On viewports narrower than ~600px the right column becomes too narrow to read. The hero's key visual is broken on mobile.
- **Recommendation**: Stack to a single column below `md:`, hiding the sidebar column.
- **Suggested command**: `/adapt`

---

**M-6 — `.text-gradient` utility defined globally but is an anti-pattern**
- **Location**: `src/index.css:125–130`
- **Category**: Anti-Patterns / Theming
- **Description**: A utility class `.text-gradient` is defined with the primary gradient as a text clip. Having this as a utility makes it easy to reuse — and misuse.
- **Recommendation**: Remove the utility. If gradient text is ever legitimately needed, implement it inline at the specific location with a code comment explaining why it's intentional.
- **Suggested command**: `/normalize`

---

**M-7 — Redundant copy: "What it does" + "Everything you need."**
- **Location**: `Index.tsx:647–690`
- **Category**: UX Writing
- **Description**: The features section has a kicker label "What it does" directly above the heading "Everything you need. Nothing you don't." These say the same thing twice.
- **Recommendation**: Drop the kicker entirely or replace it with a more specific descriptor ("5 things that matter").
- **Suggested command**: `/clarify`

---

**M-8 — Logo uses 🌊 emoji as a brand mark**
- **Location**: `Index.tsx:51, 728`, `Courses.tsx` (logoMark)
- **Category**: Visual Details / Typography
- **Description**: The logo mark is an emoji rendered in a gradient square. Emojis render differently across OS/browser (Apple, Google, Samsung each render 🌊 differently), making the brand mark inconsistent across platforms.
- **Recommendation**: Replace with an SVG wave icon for consistent rendering.
- **Suggested command**: `/polish`

---

**M-9 — Course cover images have no defined aspect ratio constraint in cards**
- **Location**: `src/pages/Courses.tsx` (CourseCard component)
- **Category**: Responsive Design
- **Description**: Cover images may render at inconsistent heights depending on the uploaded image's natural aspect ratio, causing uneven card heights in the grid.
- **Recommendation**: Apply `aspect-video` (16:9) or `aspect-[4/3]` with `object-cover` to normalize all cards.
- **Suggested command**: `/adapt`

---

### Low-Severity Issues (Part 1)

**L-1 — `fontFamily: "monospace"` in the fake URL bar in EditorCard**
`Index.tsx:192` — same anti-pattern as H-5, smaller scale.

**L-2 — Module-level constants `TEAL_GRAD`, `TEAL_GRAD_TEXT` duplicate CSS variable values**
`Index.tsx:6–8` — hardcoded hex gradient values that duplicate `var(--gradient-primary)`. If the palette changes, these won't update.

**L-3 — Browser traffic light dots are hardcoded macOS colours**
`Index.tsx:165–179` — red/yellow/green stop-light colours are macOS-specific. Low severity because it's a decorative UI mockup.

**L-4 — Footer copyright year is hardcoded `© 2026`**
`Index.tsx:742` — will silently go stale. Use `new Date().getFullYear()`.

**L-5 — `card-surface` utility is not used anywhere (dead CSS)**
`src/index.css:120–123` — defined but grep reveals no usages. CSS bloat.

**L-6 — Hero section `paddingTop: 120` accounts for nav via magic number**
`Index.tsx:493` — fragile if nav height changes. Use `var(--nav-height)` or a Tailwind utility.

---

### Positive Findings (Part 1)

- **Rockpool design system is excellent** — well-structured HSL tokens in `index.css`, clear naming (`--ocean-mid`, `--teal-bright`), custom radius/shadow/gradient variables.
- **App shell has strong visual identity** — the ocean-mid sidebar against a light main area creates a sophisticated, distinctive feel.
- **Accessibility fundamentals in components are solid** — `aria-label`, `aria-current`, `aria-invalid`, `focus-visible` rings, semantic `<figure>/<figcaption>`, `<button>` throughout.
- **Lora serif for display text** — a strong, distinctive choice that sets TideLearn apart from purely sans-serif tools.
- **shadcn/Radix foundation** — excellent keyboard navigation and ARIA out of the box for all interactive primitives.
- **`--gradient-primary` referenced consistently** in components — the CSS variable system is being used correctly everywhere except `Index.tsx`.

---

---

## Part 2 — Deep Audit: Editor (`src/pages/Editor.tsx`, 1632 lines)

### 2.1 Layout & Structure

**Grid layout works, but is fully inflexible.**
`Editor` uses `display: grid; gridTemplateColumns: "220px 1fr"; gridTemplateRows: "48px 1fr"; height: 100vh; overflow: hidden` — entirely inline. On screens narrower than ~700px the canvas becomes ~50% of viewport with no collapse, no breakpoints, no responsive adaptation at any point in 1632 lines.

**No Tailwind. Zero shadcn components in the main layout.**
Every pixel of the editor is inline styles. This is inconsistent with the rest of the app (shadcn is imported for `RadioGroup` and `Label` in the publish modal — nothing else). Inline styles make dark-mode impossible without JS and any design-system refactor brutal.

**Canvas padding is hardcoded.**
`padding: "20px 64px 80px"` on the canvas, `padding: "16px 32px"` on the lesson header. No `clamp()`, no responsive units.

---

### 2.2 Accessibility — Critical

**Block controls are keyboard-inaccessible.**
Move/duplicate/delete buttons use `opacity: 0` via `.bctrl` CSS class, revealed only on `.block-item:hover`. Keyboard-only users will never see them, because `:hover` never fires on keyboard focus. `aria-label` values exist (`↑`, `↓`, `⧉`, `✕`) but are not useful — these are glyphs, not labels. Correct labels: "Move block up", "Move block down", "Duplicate block", "Delete block".
- **Suggested command**: `/harden`

```tsx
// Editor.tsx:1224 — controls invisible without hover
<div className="bctrl" style={{ position: "absolute", right: -40, ... }}>
```

**Publish modal has no ARIA dialog semantics.**
The modal overlay is a plain `<div>` (line 1318). No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, no focus trap, no Escape key handler. Screen readers will not announce it as a dialog. Focus does not move into it on open. Backdrop-click-to-close is the only close mechanism.
- **Suggested command**: `/harden`

**Course title input has no focus ring.**
`outline: "none"` with no replacement (line 541). The lesson title input also has `outline: "none"` (line 847). Two of the most-used inputs in the editor are invisible to keyboard users when focused.
- **Suggested command**: `/harden`

**Undo/Redo buttons have no `aria-label`.**
`title="Undo (Ctrl+Z)"` provides a tooltip on hover but is not announced by most screen readers. The `↩` arrow character is announced verbatim. Should be `aria-label="Undo"`.
- **Suggested command**: `/harden`

**Block picker: no keyboard navigation within the popup.**
The picker opens and autofocuses search. But tabbing hits all 19 tiles in DOM order. No `role="listbox"` / `role="option"` pattern, no arrow-key navigation, no Escape-to-close announced to screen readers.
- **Suggested command**: `/harden`

---

### 2.3 Accessibility — Serious

**`navigator.platform` is deprecated (line 293).**
Used for Mac detection (`Cmd+Z` vs `Ctrl+Z`). Correct modern API: `navigator.userAgentData?.platform` with `"macOS"` match, falling back to `navigator.platform`.
- **Suggested command**: `/normalize`

```tsx
const isMac = navigator.platform.toUpperCase().includes("MAC"); // deprecated
```

**`window.confirm()` for destructive actions (lines 361, 380, 395).**
Used before JSON/SCORM import replace. `window.confirm()` is synchronous, blocks the main thread, cannot be styled, and is suppressed in many embedded browser contexts — including iframes, which is exactly where SCORM content runs.
- **Suggested command**: `/harden`

**"Remove lesson" button has no confirmation (line 862).**
`onClick={() => removeLesson(selectedLesson.id)}` — no `window.confirm()`, no modal. The undo stack would recover this, but that's not communicated to the user.
- **Suggested command**: `/harden`

**Sidebar footer buttons use emoji as icons.**
`⚙️ Course settings` and `📦 Export SCORM` (lines 799, 815) — emoji rendering varies by OS and will be announced verbatim by screen readers. Use lucide-react icons or `aria-hidden` on the emoji with a visually-hidden label.
- **Suggested command**: `/polish`

---

### 2.4 Style Injection Anti-Pattern

**`<style>` tags injected on every render of `AddBlockRow` (line 1014).**
The entire hover CSS for block controls (`.bctrl`, `.abr`, `.block-item:hover`, `.picker-tile`, `.sidebar-footer-btn`) is injected via a `<style>` literal inside `AddBlockRow`'s render function. This means every block row renders a new identical `<style>` tag into `<head>`. With 10 blocks: 11 identical injected style blocks. CSS is global so styles work — but this pollutes the DOM and is the wrong place for CSS.
- **Suggested command**: `/normalize`

```tsx
// Editor.tsx:1014 — inside render, duplicated per block row
<style>{`
  .abr { opacity: 0; transition: opacity 0.15s; }
  ...
`}</style>
```

---

### 2.5 Interaction Design

**"Course settings" in the sidebar opens the Publish modal.**
Users expect "Course settings" to open a title/description/cover image editor. The Publish modal is actually the export/share hub. These should be separated or the button labelled truthfully: "Publish & Export".
- **Suggested command**: `/clarify`

**"Saved" indicator is a 5px dot with faint text.**
The save state (lines 598–606) is a 5px dot + 11px label at `rgba(94,234,212,0.4)`. Near-invisible in low-vision conditions. Autosave failures (`console.error("Autosave failed:", e)`) are silently swallowed — no toast, no visual indicator.
- **Suggested command**: `/polish`

**Empty lesson state message refers to a hidden button.**
When a content lesson has no blocks: `"No blocks yet. Click '+ Add block' above to get started"` (line 942). The `+ Add block` pill is hidden until hover — so instructing the user to "click it above" is misleading; the button is invisible until you already know to hover.
- **Suggested command**: `/clarify`

**Escape does not close the block picker.**
There is a `mousedown` outside-click handler but no `keydown` for Escape. Standard popup behaviour missing.
- **Suggested command**: `/harden`

---

### 2.6 Design Consistency

**Block type chip at `fontSize: 9` (line 1207).**
9px is below any legibility threshold and will fail WCAG 1.4.4. Design intent is good (category label above the form) but minimum 11px.
- **Suggested command**: `/harden`

**`canvas maxWidth: 700 + 128` arithmetic in JSX (line 879).**
`828px` as a JS arithmetic expression inside JSX. Should be a named constant.
- **Suggested command**: `/normalize`

**Two different font families in inputs.**
Course title uses `fontFamily: "Inter, sans-serif"` (line 545). Lesson title uses `fontFamily: "Lora, Georgia, serif"` (line 848). Intentional differentiation is fine, but undocumented.
- **Suggested command**: `/typeset`

---

---

## Part 3 — Deep Audit: Viewer (`src/pages/View.tsx`, 999 lines)

### 3.1 Layout & Structure

**Sidebar is `width: 200` with no collapse.**
The viewer sidebar (line 584) is fixed at 200px and never collapses at any breakpoint. On a 375px mobile phone, this consumes 53% of the viewport. The content area has `padding: "40px 64px 120px"` — at 175px of available width, content becomes 47px wide. The viewer is entirely unusable on mobile without user zoom.
- **Suggested command**: `/adapt`

**Reading area: `padding: "40px 64px 120px"` inline (line 677).**
128px of horizontal padding hardcoded. Text inside becomes a narrow column on mid-range tablets and non-functional on phones.
- **Suggested command**: `/adapt`

**Bottom nav obscures content on mobile in paged mode.**
`position: fixed; bottom: 0; height: 56`. On iOS with browser chrome, the fixed nav may overlap the browser bottom bar. Combined with the 53% sidebar, paged mode is unusable on phones.
- **Suggested command**: `/adapt`

---

### 3.2 Accessibility — Critical

**Sidebar nav items are `<div onClick>` not `<button>` (line 609).**
All sidebar lesson navigation items use `<div onClick>` with `cursor: "pointer"`. These are not focusable via Tab, not announced as interactive elements, and are not activated via Enter/Space. Screen readers will skip them entirely.
- **Suggested command**: `/harden`

```tsx
// View.tsx:610 — not keyboard accessible
<div key={l.id} onClick={() => { ... }} style={{ cursor: "pointer", ... }}>
```

**Error and loading states have no `role="alert"` (lines 377, 387).**
Both error and no-course states render a plain `<main>` with an `<h1>`. Screen readers may not announce these states on route load.
- **Suggested command**: `/harden`

**Arrow key navigation swallows `ArrowLeft`/`ArrowRight` globally (line 362).**
View.tsx intercepts all `ArrowLeft`/`ArrowRight` keypresses in paged mode, only exempting `INPUT`, `TEXTAREA`, `SELECT`. Any `contenteditable` elements (TipTap blocks, accordions, etc.) will have their arrow navigation swallowed. The guard should also check `(e.target as HTMLElement).isContentEditable`.
- **Suggested command**: `/harden`

---

### 3.3 Accessibility — Serious

**Topbar logo has no `aria-label` (line 472).**
The logo link renders a 🌊 emoji (announced as "wave") and "TideLearn" text. No `aria-label="TideLearn home"`. The emoji should be `aria-hidden="true"`.
- **Suggested command**: `/harden`

**Bottom nav prev/next buttons: arrow characters in text (lines 931, 991).**
`← Previous lesson` and `Next lesson →` — these Unicode arrows will be read as "left arrow Previous lesson" and "Next lesson right arrow". Add `aria-label="Previous lesson"` / `aria-label="Next lesson"` and wrap arrows in `<span aria-hidden="true">`.
- **Suggested command**: `/harden`

**"Mark complete" button: `✓` text in announced label (line 743).**
`aria-pressed` is correctly set. Button text changes to "✓ Completed" when complete. The `✓` will be read as "check mark". Use `aria-label` to set the explicit announced label.
- **Suggested command**: `/harden`

**Progress bar `aria-label` embeds percentage (line 446).**
`aria-label={\`Course progress ${Math.round(courseProgress)} percent\`}` — `aria-valuenow` is also set (correct for `role="progressbar"`). The `aria-label` with the percentage is redundant and will describe a stale value if the label caches. Keep `aria-valuenow/min/max`, set `aria-label="Course progress"` (static).
- **Suggested command**: `/harden`

---

### 3.4 Font Usage

**Entire viewer root uses `fontFamily: "Inter, sans-serif"` (line 442).**
Inter is explicitly on the do-not-use list. The body typeface needs replacing. Lora is correctly used for headings (line 697).
- **Suggested command**: `/typeset`

**Error/no-course states also hardcode Inter (lines 378, 389).**
These fallback states will bypass any future font system update.
- **Suggested command**: `/typeset`

---

### 3.5 Module-Level Side Effects

**Pulse animation injected at module load (lines 41–55).**
```tsx
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.id = "rockpool-pulse-ring";
  s.textContent = pulseStyle;
  document.head.appendChild(s);
}
```
This runs when the module is imported, not when the component mounts. It will run even if `View` is never rendered. It bypasses React's style lifecycle entirely and cannot be cleaned up. Should use a CSS module or a `useEffect` with cleanup.
- **Suggested command**: `/normalize`

---

### 3.6 Interaction Design

**"View All" assessment placeholder has no action (line 813).**
```tsx
<div style={{ fontStyle: "italic" }}>
  Assessment: {questions.length} questions — navigate to this lesson to take the assessment.
</div>
```
The user is told to "navigate to this lesson" while already looking at it in View All mode. No button or link to switch to paged mode and jump to the assessment.
- **Suggested command**: `/clarify`

**Resume button shows no lesson context (line 503).**
"Resume" with no indication of which lesson. "Resume: Lesson 3 — Savings Vehicles" would reduce uncertainty.
- **Suggested command**: `/clarify`

**Progress stripe tracks scroll in View All, completion count in paged mode.**
In View All, the stripe tracks `window.scrollY`. In paged mode it tracks `completed.size / totalLessons`. A user who scrolls through View All without marking complete sees a full bar at 0 completions. `lessonProgress` (per-lesson scroll depth in paged mode) is computed but never displayed anywhere.
- **Suggested command**: `/clarify`

**Gate mode: locked sections have no navigation affordance (line 798).**
"This section is locked. Continue the previous section to unlock." — no link, no scroll-up button, no count of remaining tasks.
- **Suggested command**: `/clarify`

---

---

## Part 4 — Cross-Cutting Issues

### 4.1 `window.confirm()` in SCORM Context
Three instances in Editor.tsx (lines 361, 380, 395). Must be replaced with modal confirmation before any public release — `window.confirm()` is blocked in iframes, which is exactly where SCORM content runs.

### 4.2 No Mobile Breakpoints Anywhere
Neither Editor.tsx nor View.tsx has a single responsive breakpoint, `@media` query, `clamp()`, or `min()`/`max()` call. The entire app is desktop-only. At 375px:
- Editor: sidebar takes ~55% of viewport, canvas is unusable
- Viewer: sidebar takes ~53% of viewport, content is ~47px wide
- Both pages: `padding: "X 64px"` creates content narrower than any readable measure

### 4.3 Inline Styles Prevent Dark Mode and CSS-Based Hover
The two most-used pages use inline styles, while importing Tailwind and shadcn. Three consequences:
1. **No dark mode** — computed inline styles require JS to invert
2. **No `:hover`/`:focus-visible`** — workarounds are the CSS injection anti-pattern and `onMouseEnter`/`onMouseLeave` handlers
3. **No design token enforcement** — `#0d9488`, `#14b8a6`, `rgba(20,184,166,*)` appear in ~60 places across two files with no single source of truth

### 4.4 `onMouseEnter`/`onMouseLeave` for Hover States
Used extensively in both files to imperatively set `style` attributes. JS-based hover states fire correctly but are slower, harder to maintain, and cannot be overridden by CSS. Should be replaced with CSS modules or Tailwind hover classes.

### 4.5 Hardcoded Magic Numbers (No Named Constants)
- `220px` sidebar width (Editor)
- `200px` sidebar width (Viewer)
- `48px` topbar height (both)
- `700 + 128` canvas max-width (Editor)
- `680` reading area max-width (Viewer)
- `64px` horizontal padding (both)

If topbar height changes, every `gridTemplateRows`, `scrollMarginTop`, `padding-bottom`, and `z-index` calculation must be found and updated manually.

### 4.6 Emoji in Functional UI
Emoji used in interactive/functional contexts without `aria-hidden`:
- `⚙️ Course settings` / `📦 Export SCORM` (sidebar footer)
- `🔍` in block picker search
- `🌊` in viewer topbar logo
- `✓ Completed` in mark-complete button
- `← Previous lesson` / `Next lesson →` (arrows in button text)

### 4.7 `postMessage` Target Origin is `"*"` (View.tsx lines 235, 292)
The SCORM bridge posts messages to any parent origin. Best practice is to specify the expected origin, or at minimum document this as a known broadcast.

---

## Part 5 — Publish Modal (`PublishModal`, Editor.tsx:1295–1632)

**Dialog semantics missing.**
```tsx
<div style={{ position: "fixed", inset: 0, ... }}> // no role, no aria-modal
```
No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, no focus trap, no Escape to close. All four are required for WCAG 2.1 AA.
- **Suggested command**: `/harden`

**"Your course is live" heading is always wrong for hash-link users.**
The heading implies the course has been published to a server. For unauthenticated users, the "share link" is a hash URL that is not live on any server. The heading should differentiate: "Ready to share" (hash link) vs "Published" (Supabase ID).
- **Suggested command**: `/clarify`

**Export cards use emoji as primary icons.**
Three export cards use `📦`, `🌐`, `📄`. Should be lucide-react icons for consistency and accessibility.
- **Suggested command**: `/polish`

**Import section is unreachable from the UI.**
`showImport` is toggled by `onToggleImport` — but there is no visible button inside the `PublishModal` to trigger it. The import section appears to be unreachable from the current UI without direct state manipulation.
- **Suggested command**: `/clarify`

---

## Priority Issue Table

### P0 — Blocks real users today
| Issue | File | Line |
|---|---|---|
| Viewer sidebar nav is `<div onClick>` — not keyboard accessible | View.tsx | 610 |
| Block controls hidden via hover — keyboard-inaccessible | Editor.tsx | 1224 |
| Publish modal: no `role="dialog"`, no focus trap, no Escape | Editor.tsx | 1318 |
| Viewer entirely broken on mobile (no responsive layout) | View.tsx | 442, 584, 677 |
| Editor broken on mobile (no responsive layout) | Editor.tsx | 479 |
| `window.confirm()` blocked in SCORM iframe (destroys import flow) | Editor.tsx | 361, 380, 395 |

### P1 — WCAG violations
| Issue | File | Line |
|---|---|---|
| `#94a3b8` body text on white — fails WCAG AA contrast | index.css | 83 |
| No skip-to-content link on any page | App.tsx | — |
| Course title / lesson title: `outline: none` with no focus ring | Editor.tsx | 541, 847 |
| Arrow chars in bottom nav buttons without `aria-label` | View.tsx | 931, 991 |
| Emoji used as functional icons without `aria-hidden` | Both | Multiple |
| Error/loading states: no `role="alert"` | View.tsx | 377, 387 |
| Arrow key navigation swallows keys on contenteditable | View.tsx | 362 |
| Landing page has zero responsive design (WCAG 1.4.10) | Index.tsx | — |

### P2 — Quality / anti-patterns
| Issue | File | Line |
|---|---|---|
| Gradient text on hero headline | Index.tsx | 547 |
| Dark hero with cyan glow (AI-slop fingerprint) | Index.tsx | 466 |
| Inter as primary typeface | index.css | 109 |
| Monospace "technical" shorthand in feature chips | Index.tsx | 438 |
| `<style>` tag injected per `AddBlockRow` render | Editor.tsx | 1014 |
| `pulseStyle` injected at module load (outside component lifecycle) | View.tsx | 41 |
| `navigator.platform` deprecated | Editor.tsx | 293 |
| `postMessage` target `"*"` (SCORM bridge) | View.tsx | 235, 292 |
| "Course settings" mislabelled — opens Publish modal | Editor.tsx | 799 |
| `onMouseEnter/Leave` for all hover states | Both | Multiple |
| Magic numbers: 220, 200, 48, 700, 680, 64 not named | Both | Multiple |
| `fontFamily: "Inter"` on viewer root | View.tsx | 442 |

### P3 — Polish
| Issue | File | Line |
|---|---|---|
| Block type chip at `fontSize: 9` — below legible threshold | Editor.tsx | 1207 |
| "View All" assessment placeholder has no action | View.tsx | 813 |
| Progress stripe behaviour inconsistent between modes | View.tsx | 444 |
| "Your course is live" heading incorrect for hash-link courses | Editor.tsx | 1377 |
| Autosave failures are silent (no toast) | Editor.tsx | 257 |
| Resume button shows no lesson context | View.tsx | 503 |
| `canvas maxWidth: 700 + 128` arithmetic in JSX | Editor.tsx | 879 |
| "Remove lesson" has no confirmation or undo hint | Editor.tsx | 862 |
| Emoji logo renders differently per OS | Index.tsx | 51 |
| Copyright year hardcoded | Index.tsx | 742 |
| `card-surface` utility never used (dead CSS) | index.css | 120 |
| Import section unreachable from PublishModal UI | Editor.tsx | 1520 |

---

## What's Working Well

These are deliberate decisions worth preserving:

- **Rockpool design system** — well-structured HSL tokens, clear naming (`--ocean-mid`, `--teal-bright`), custom radius/shadow/gradient variables. Excellent foundation.
- **Teal brand palette** — cohesive and distinctive. The `#0d9488 → #0891b2` gradient is used consistently.
- **Lora for headings** — correct typographic decision; creates clear hierarchy between navigation and content.
- **`aria-pressed` on Paged/View All toggle** — correct ARIA pattern, implemented properly.
- **`role="progressbar"` with `aria-valuenow/min/max`** — correct.
- **Undo/redo history with debounced autosave** — robust editor foundation.
- **`/` shortcut to open block picker** — power-user affordance with proper input guard.
- **Block picker search with autofocus** — good keyboard entry point.
- **SCORM bridge type definitions** — well-typed `ReadyMessage`, `ProgressMessage`, `ResumeMessage` interfaces.
- **Gate mode with quiz-passing requirement** — genuinely useful LMS feature.
- **IntersectionObserver scrollspy** — correct use for View All active sidebar state.
- **Pulse animation on current lesson dot** — subtle, communicates position well.
- **Drag-and-drop import zone** — good progressive enhancement.
- **Deep link intent handling** — `useDeepLinkIntents` hook shows architectural awareness.
- **shadcn/Radix foundation** — excellent keyboard navigation and ARIA out of the box for all interactive primitives.

---

## Recommended Commands Summary

| Command | Addresses |
|---------|-----------|
| `/harden` | C-1 contrast, H-4 skip link, M-1 dark contrast, M-2 arrow chars, block controls keyboard access, publish modal dialog semantics, focus rings on title inputs, undo/redo aria-labels, block picker keyboard nav, `window.confirm()`, "Remove lesson" confirmation, Escape on block picker, sidebar nav `<div>` → `<button>`, error states `role="alert"`, arrow key swallow on contenteditable, logo aria-label, bottom nav aria-labels, "Mark complete" aria-label, progress bar aria-label |
| `/adapt` | C-2 landing page responsive (WCAG 1.4.10), M-5 EditorCard mobile, M-9 cover image aspect ratio, viewer sidebar collapse, viewer reading area padding, viewer bottom nav mobile safe area, editor canvas padding |
| `/normalize` | H-1 styling split, M-6 `.text-gradient` utility, `<style>` injection in AddBlockRow, `pulseStyle` module-level injection, `navigator.platform` deprecated, `canvas maxWidth` magic number arithmetic |
| `/distill` | H-3 AI dark hero glow effects |
| `/polish` | H-2 gradient headline, M-8 emoji logo, sidebar footer emoji icons, export card emoji icons |
| `/typeset` | H-6 Inter typeface, viewer root Inter, error state Inter, undocumented font family split in editor inputs |
| `/colorize` | M-3 dark mode infrastructure with no implementation |
| `/optimize` | M-4 backdrop-blur without `@supports` fallback |
| `/clarify` | M-7 redundant "What it does" copy, "Course settings" mislabel, empty lesson placeholder text, "View All" assessment placeholder, Resume button context, progress stripe inconsistency, gate mode no navigation affordance, "Your course is live" heading for hash-link users, import section unreachable from PublishModal |
