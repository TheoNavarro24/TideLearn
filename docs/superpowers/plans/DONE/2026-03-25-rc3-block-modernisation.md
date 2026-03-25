# RC3: Block Modernisation — Design System + Code Quality (B → A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Design System (B to A) and contribute to Code Quality (B+ to A) by converting all block components from `style={{}}` inline objects with hardcoded hex values to Tailwind CSS utility classes and CSS custom property tokens.

**Architecture:** All target files are in `src/components/blocks/view/` and `src/components/blocks/editor/`. Strategy:
1. Static layout/spacing: replace with Tailwind utilities (`p-6`, `rounded-xl`, `flex`, etc.)
2. Brand colours: replace hardcoded hex with CSS token via `text-[var(--accent-hex)]` or Tailwind palette
3. State-driven dynamic colours (Quiz, TrueFalse, ShortAnswer): replace hex literals in JS with CSS var strings
4. Add missing CSS tokens to `src/index.css` for quiz semantic states

**Prerequisites:** RC2 (frontend tests) should be done first — tests provide a safety net for visual regressions.

**No new dependencies.** `cn()` utility already in `src/lib/utils.ts`.

---

## Colour Mapping Reference

Use this table for all replacements. Never introduce new hardcoded hex.

| Hardcoded hex | Replace with |
|---|---|
| `#40c8a0` | `var(--accent-hex)` |
| `#0d9488` | `text-teal-600` / `var(--quiz-correct-text)` in dynamic contexts |
| `#14b8a6` | `text-teal-500` / `var(--quiz-correct-border)` |
| `#5eead4` | `text-teal-300` / `var(--quiz-selected-border)` |
| `#f0fdfb` / `#f8fffe` / `#fafffe` | `bg-[var(--canvas-white)]` |
| `#e0fdf4` | `border-teal-100` / `var(--quiz-idle-border)` |
| `#0d2926` | `text-[var(--ink)]` |
| `#334155` | `text-slate-700` / `var(--quiz-idle-text)` |
| `#475569` | `text-slate-600` |
| `#64748b` | `text-slate-500` |
| `#94a3b8` | `text-slate-400` |
| `#6a7a90` | `text-[var(--text-muted)]` |
| `#1a2030` | `text-[var(--ink)]` |
| `#22c55e` | `text-green-500` |
| `#16a34a` | `text-green-600` |
| `#f59e0b` | `text-amber-400` |
| `#d97706` | `text-amber-600` |
| `#ef4444` | `text-red-500` |
| `#dc2626` | `text-red-600` |
| `#e2e8f0` | `bg-slate-200` |

---

## File Map

| File | Change |
|------|--------|
| `src/index.css` | Add quiz semantic colour tokens |
| `src/components/blocks/view/Callout.tsx` | VARIANT map to Tailwind class strings; style to className |
| `src/components/blocks/view/Quiz.tsx` | Dynamic colour fns to CSS var strings; static styles to Tailwind |
| `src/components/blocks/view/TrueFalse.tsx` | Same pattern as Quiz |
| `src/components/blocks/view/ShortAnswer.tsx` | Same pattern as Quiz |
| `src/components/blocks/view/Document.tsx` | Static inline styles to Tailwind |
| `src/components/blocks/view/Image.tsx` | Static inline styles to Tailwind |
| `src/components/blocks/view/Flashcard.tsx` | Inline styles to Tailwind |
| `src/components/blocks/view/Hotspot.tsx` | Inline styles to Tailwind/CSS vars |
| `src/components/blocks/view/Sorting.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/QuizForm.tsx` | Inline styles to Tailwind/CSS vars |
| `src/components/blocks/editor/TrueFalseForm.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/ShortAnswerForm.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/ImageForm.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/VideoForm.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/AudioForm.tsx` | Inline styles to Tailwind |
| `src/components/blocks/editor/DocumentForm.tsx` | Inline styles to Tailwind |

---

### Task 1: Add missing semantic tokens to index.css

**Files:** Modify `src/index.css`

- [ ] **Step 1: Read src/index.css, find the `:root` block**

- [ ] **Step 2: Add tokens after the `--danger-*` vars**

```css
/* Quiz / assessment state colours */
--quiz-correct-bg:      #f0fdfb;
--quiz-correct-border:  #14b8a6;
--quiz-correct-text:    #0d9488;
--quiz-selected-bg:     #f8fffe;
--quiz-selected-border: #5eead4;
--quiz-idle-border:     #e0fdf4;
--quiz-idle-text:       #334155;
```

- [ ] **Step 3: Build check, commit**

```bash
npm run build 2>&1 | grep -i error | head -10
git add src/index.css
git commit -m "design: add quiz semantic colour tokens to CSS custom properties"
```

---

### Task 2: Modernise Callout.tsx

**Files:** Modify `src/components/blocks/view/Callout.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Rewrite VARIANT object to use Tailwind class strings**

```ts
const VARIANT = {
  info:    { border: "border-l-teal-500",  bg: "bg-teal-50",  title: "text-teal-600" },
  success: { border: "border-l-green-500", bg: "bg-green-50", title: "text-green-600" },
  warning: { border: "border-l-amber-400", bg: "bg-amber-50", title: "text-amber-600" },
  danger:  { border: "border-l-red-500",   bg: "bg-red-50",   title: "text-red-600" },
};
```

Replace all `style={{...}}` props with `className`. Import `cn` from `@/lib/utils`.

- [ ] **Step 3: Build, visual verify (all 4 variants), commit**

```bash
git add src/components/blocks/view/Callout.tsx
git commit -m "design: migrate Callout block from inline hex styles to Tailwind classes"
```

---

### Task 3: Modernise Quiz.tsx

**Files:** Modify `src/components/blocks/view/Quiz.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace hex in colour helper functions**

- `return "#f0fdfb"` to `return "var(--quiz-correct-bg)"`
- `return "#f8fffe"` to `return "var(--quiz-selected-bg)"`
- `"1.5px solid #14b8a6"` to `"1.5px solid var(--quiz-correct-border)"`
- `"1.5px solid #5eead4"` to `"1.5px solid var(--quiz-selected-border)"`
- `"1.5px solid #e0fdf4"` to `"1.5px solid var(--quiz-idle-border)"`
- `return "#0d9488"` to `return "var(--quiz-correct-text)"`
- `return "#334155"` to `return "var(--quiz-idle-text)"`

- [ ] **Step 3: Convert static inline styles to Tailwind className**

Keep `style` only for the 3 dynamic values (background, border, color) on option buttons. Everything else becomes className. Import `cn` from `@/lib/utils`.

- [ ] **Step 4: Run frontend tests to catch regressions**

```bash
npm test 2>&1
```

- [ ] **Step 5: Build, visual verify, commit**

```bash
git add src/components/blocks/view/Quiz.tsx
git commit -m "design: migrate Quiz view from inline hex styles to Tailwind + CSS vars"
```

---

### Task 4: Modernise TrueFalse.tsx and ShortAnswer.tsx

Apply the same Quiz pattern. Both have similar state-based colour logic.

**Files:** `src/components/blocks/view/TrueFalse.tsx`, `src/components/blocks/view/ShortAnswer.tsx`

- [ ] **Step 1: Read each file**
- [ ] **Step 2: Replace hex literals with `var(--quiz-*)` tokens**
- [ ] **Step 3: Convert static inline styles to Tailwind**
- [ ] **Step 4: Run tests, build, commit each separately**

```bash
git add src/components/blocks/view/TrueFalse.tsx
git commit -m "design: migrate TrueFalse view to Tailwind + CSS vars"
git add src/components/blocks/view/ShortAnswer.tsx
git commit -m "design: migrate ShortAnswer view to Tailwind + CSS vars"
```

---

### Task 5: Modernise remaining view blocks

Static-only conversion (no dynamic colour helpers):

**Files:** `Document.tsx`, `Image.tsx`, `Flashcard.tsx`, `Hotspot.tsx`, `Sorting.tsx`

Conversion rules:
- `style={{ margin: "24px 0" }}` to `className="my-6"`
- `style={{ padding: 16 }}` to `className="p-4"`
- `style={{ borderRadius: 8 }}` to `className="rounded-lg"`
- `style={{ display: "flex", alignItems: "center", gap: 8 }}` to `className="flex items-center gap-2"`
- `style={{ fontSize: 13 }}` to `className="text-[13px]"`
- `style={{ fontWeight: 600 }}` to `className="font-semibold"`
- `style={{ color: "#94a3b8" }}` to `className="text-slate-400"`
- `fontFamily: "Inter, sans-serif"` to remove (global DM Sans applies)

For each: read, convert, run tests, build, commit separately.

---

### Task 6: Modernise editor form components

**Files:** `QuizForm.tsx`, `TrueFalseForm.tsx`, `ShortAnswerForm.tsx`, `ImageForm.tsx`, `VideoForm.tsx`, `AudioForm.tsx`, `DocumentForm.tsx`

Same conversion rules as Task 5, plus form-specific patterns:
- Label: `className="block text-xs font-semibold text-primary mb-1"`
- Input: `className="w-full px-[10px] py-[7px] border border-[color:hsl(var(--border))] rounded-md text-[13px] text-foreground bg-background font-sans"`

For each: read, convert, run tests, build, commit separately.

---

### Task 7: Final hex audit

- [ ] **Step 1: Grep for remaining hardcoded hex in block components**

```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" src/components/blocks/ --include="*.tsx" | grep -v "node_modules\|// \|<!--"
```

- [ ] **Step 2: Fix any remaining instances using the colour mapping table**

- [ ] **Step 3: Run full test suite**

```bash
npm test 2>&1
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Visual verify** — open a course in viewer, check text, quiz, callout (all 4), image, document, flashcard

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/
git commit -m "design: complete block component hex colour cleanup"
```
