# Block Form UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish block editor forms — add/remove quiz options, fix labels, improve layouts, show feedback on both outcomes, add error toasts, and introduce a shared FieldLabel component.

**Architecture:** All changes are isolated to individual components with no shared state changes. The FieldLabel component is a new shared primitive. Factory changes (`correctIndex: -1`) propagate to view components, SCORM export, and MCP preview. Feedback changes touch view components and both SCORM renderers.

**Tech Stack:** React, TypeScript, Zod, Tiptap (RichTextEditor), shadcn/ui components

**Spec:** `docs/superpowers/specs/2026-03-22-block-form-ux-design.md`

**Testing:** MCP-side has Vitest (`cd mcp && npm test`). Frontend has no test framework — verify visually. SCORM changes are string templates inside `src/lib/scorm12.ts` — test by building and inspecting output.

---

### Task 1: Create FieldLabel component

**Files:**
- Create: `src/components/blocks/editor/FieldLabel.tsx`

- [ ] **Step 1: Create the FieldLabel component**

```tsx
// src/components/blocks/editor/FieldLabel.tsx
export function FieldLabel({ children, required, htmlFor }: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/FieldLabel.tsx
git commit -m "feat: add shared FieldLabel component with required prop"
```

---

### Task 2: Adopt FieldLabel in all 15 editor forms

**Files:**
- Modify: `src/components/blocks/editor/HeadingForm.tsx`
- Modify: `src/components/blocks/editor/TextForm.tsx`
- Modify: `src/components/blocks/editor/ImageForm.tsx`
- Modify: `src/components/blocks/editor/VideoForm.tsx`
- Modify: `src/components/blocks/editor/AudioForm.tsx`
- Modify: `src/components/blocks/editor/DocumentForm.tsx`
- Modify: `src/components/blocks/editor/CodeForm.tsx`
- Modify: `src/components/blocks/editor/QuizForm.tsx`
- Modify: `src/components/blocks/editor/TrueFalseForm.tsx`
- Modify: `src/components/blocks/editor/ShortAnswerForm.tsx`
- Modify: `src/components/blocks/editor/ListForm.tsx`
- Modify: `src/components/blocks/editor/QuoteForm.tsx`
- Modify: `src/components/blocks/editor/AccordionForm.tsx`
- Modify: `src/components/blocks/editor/TabsForm.tsx`
- Modify: `src/components/blocks/editor/CalloutForm.tsx`

- [ ] **Step 1: Replace all `<label className="text-sm text-muted-foreground">` with `<FieldLabel>`**

In each file:
1. Add import: `import { FieldLabel } from "./FieldLabel";`
2. Replace every `<label className="text-sm text-muted-foreground">...</label>` with `<FieldLabel>...</FieldLabel>`
3. Do NOT set `required={true}` yet — that's Spec 3

Example for ImageForm.tsx — change:
```tsx
<label className="text-sm text-muted-foreground">Image URL</label>
```
to:
```tsx
<FieldLabel>Image URL</FieldLabel>
```

Do this for all 15 forms. Skip DividerForm and TocForm (no labels).

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/*.tsx
git commit -m "refactor: adopt FieldLabel in all 15 editor forms"
```

---

### Task 3: QuizForm — add/remove options + radio correct answer

**Files:**
- Modify: `src/components/blocks/editor/QuizForm.tsx`
- Modify: `src/types/course.ts` (factory only)
- Modify: `mcp/src/lib/types.ts` (factory only)

- [ ] **Step 1: Change quiz factory `correctIndex` from `0` to `-1` in both type files**

In `src/types/course.ts` line 355, change:
```ts
correctIndex: 0,
```
to:
```ts
correctIndex: -1,
```

In `mcp/src/lib/types.ts` line 342, same change.

- [ ] **Step 2: Rewrite QuizForm with add/remove options and radio selection**

Replace the entire contents of `src/components/blocks/editor/QuizForm.tsx`:

```tsx
import { QuizBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "./FieldLabel";
import { Trash2 } from "lucide-react";

export function QuizForm({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  const addOption = () => onChange({ ...block, options: [...block.options, ""] });

  const removeOption = (idx: number) => {
    const next = block.options.filter((_, i) => i !== idx);
    let ci = block.correctIndex;
    if (idx === ci) ci = -1;
    else if (idx < ci) ci--;
    onChange({ ...block, options: next, correctIndex: ci });
  };

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <FieldLabel>Question</FieldLabel>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>

      {block.correctIndex === -1 && (
        <p className="text-xs text-amber-600">Select the correct answer below.</p>
      )}

      {block.options.map((opt, i) => (
        <div key={i} className="space-y-1">
          <FieldLabel>Option {String.fromCharCode(65 + i)}</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${block.id}`}
              checked={i === block.correctIndex}
              onChange={() => onChange({ ...block, correctIndex: i })}
              className="accent-teal-600"
            />
            <Input
              className="flex-1"
              value={opt}
              onChange={(e) => {
                const next = [...block.options];
                next[i] = e.target.value;
                onChange({ ...block, options: next });
              }}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={block.options.length <= 2}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              title="Remove option"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addOption}>
        Add option
      </Button>

      {/* Feedback section */}
      <div style={{ borderTop: "1px solid #e0fdf4", paddingTop: 12, marginTop: 4 }}>
        <div className="flex items-center gap-2 mb-2">
          <Switch
            id={`feedback-${block.id}`}
            checked={block.showFeedback ?? false}
            onCheckedChange={(v) => onChange({ ...block, showFeedback: v })}
          />
          <Label htmlFor={`feedback-${block.id}`} className="text-sm text-muted-foreground">
            Show feedback after answer
          </Label>
        </div>
        {block.showFeedback && (
          <div className="space-y-1">
            <FieldLabel>Feedback message</FieldLabel>
            <Textarea
              value={block.feedbackMessage ?? ""}
              onChange={(e) => onChange({ ...block, feedbackMessage: e.target.value })}
              placeholder="Explain the correct answer..."
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/editor/QuizForm.tsx src/types/course.ts mcp/src/lib/types.ts
git commit -m "feat: QuizForm add/remove options, radio correct answer, correctIndex -1 factory"
```

---

### Task 4: Quiz view — handle correctIndex -1

**Files:**
- Modify: `src/components/blocks/view/Quiz.tsx`

- [ ] **Step 1: Add correctIndex -1 guard**

At the top of the component, after the state declarations, add:

```tsx
const unset = block.correctIndex === -1;
```

Then change the Check button's `onClick`:
```tsx
onClick={() => {
  if (revealed || selected == null || unset) return;
  setRevealed(true);
  const ok = selected === block.correctIndex;
  window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
}}
disabled={revealed || selected == null || unset}
```

After the Reset button, before the `{revealed && (` block, add:

```tsx
{unset && (
  <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
    No correct answer has been set for this question.
  </span>
)}
```

- [ ] **Step 2: Show feedback on both outcomes (not just incorrect)**

Change the feedback condition from:
```tsx
{block.showFeedback && block.feedbackMessage && !isCorrect && (
```
to:
```tsx
{block.showFeedback && block.feedbackMessage && (
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/view/Quiz.tsx
git commit -m "feat: Quiz view handles correctIndex -1, shows feedback on both outcomes"
```

---

### Task 5: ShortAnswer view — feedback on both outcomes

**Files:**
- Modify: `src/components/blocks/view/ShortAnswer.tsx`

- [ ] **Step 1: Change feedback condition**

Change:
```tsx
{block.showFeedback && block.feedbackMessage && revealed && !correct && (
```
to:
```tsx
{block.showFeedback && block.feedbackMessage && revealed && (
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/ShortAnswer.tsx
git commit -m "feat: ShortAnswer shows feedback on both outcomes"
```

---

### Task 6: TrueFalse label fix

**Files:**
- Modify: `src/components/blocks/editor/TrueFalseForm.tsx`

- [ ] **Step 1: Fix the toggle label**

Change line 15:
```tsx
<p className="text-sm font-medium">Correct answer is True</p>
```
to:
```tsx
<p className="text-sm font-medium">The correct answer is: <strong>{block.correct ? "True" : "False"}</strong></p>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/TrueFalseForm.tsx
git commit -m "fix: TrueFalse label dynamically shows True/False"
```

---

### Task 7: AccordionForm vertical layout

**Files:**
- Modify: `src/components/blocks/editor/AccordionForm.tsx`

- [ ] **Step 1: Change layout from side-by-side to vertical stack**

Change the item container from:
```tsx
<div key={it.id} className="grid gap-2 sm:grid-cols-2">
```
to:
```tsx
<div key={it.id} className="space-y-2 border-b border-border pb-3 last:border-0">
```

Remove the `sm:col-span-2` wrapper around the Remove button:
```tsx
<div className="sm:col-span-2">
  <Button variant="ghost" onClick={() => removeItem(idx)}>Remove section</Button>
</div>
```
becomes:
```tsx
<Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>Remove section</Button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/AccordionForm.tsx
git commit -m "fix: AccordionForm uses vertical stack layout"
```

---

### Task 8: CalloutForm — Textarea to RichTextEditor

**Files:**
- Modify: `src/components/blocks/editor/CalloutForm.tsx`

- [ ] **Step 1: Swap Textarea for RichTextEditor**

Add import:
```tsx
import { RichTextEditor } from "@/components/richtext/RichTextEditor";
```

Remove the `Textarea` import.

Change the text field from:
```tsx
<Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
```
to:
```tsx
<RichTextEditor value={block.text} onChange={(html) => onChange({ ...block, text: html })} placeholder="Callout content..." />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/CalloutForm.tsx
git commit -m "feat: CalloutForm uses RichTextEditor for rich text support"
```

---

### Task 9: SCORM callout — stop escaping HTML

**Files:**
- Modify: `src/lib/scorm12.ts`

- [ ] **Step 1: Fix callout rendering in BOTH renderers**

The callout case appears twice in scorm12.ts (static renderer ~line 179 and SCORM renderer ~line 511). In both places, change:

```js
esc(b.text)
```
to:
```js
(b.text || '')
```

Only the `b.text` part — keep `esc(b.title)` as-is since titles are plain text.

Static renderer (line ~179):
```js
return '<div class="callout ' + b.variant + '">' + (b.title ? '<div class="callout-title">'+esc(b.title)+'</div>' : '') + (b.text || '') + '</div>';
```

SCORM renderer (line ~511):
```js
return '<div class="callout ' + b.variant + '">' + (b.title ? '<div class="callout-title">'+esc(b.title)+'</div>' : '') + (b.text || '') + '</div>';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scorm12.ts
git commit -m "fix: SCORM callout renders HTML text instead of double-escaping"
```

---

### Task 10: SCORM — quiz handle correctIndex -1

**Files:**
- Modify: `src/lib/scorm12.ts`

- [ ] **Step 1: Guard renderQuiz in BOTH renderers**

In both `renderQuiz(b)` functions (static ~line 231 and SCORM ~line 563), add a guard at the top:

After the opening `var html = '<div class="quiz" id="'+id+'"><p>'+esc(b.question)+'</p>';` and the options loop, before the Submit button line, add:

```js
if (b.correctIndex === -1) {
  html += '<p style="color:#94a3b8;font-size:13px;font-style:italic">No correct answer has been set for this question.</p>';
  html += '<div class="feedback" id="'+id+'-fb"></div></div>';
  return html;
}
```

This skips the Submit button and feedback div when correctIndex is -1.

- [ ] **Step 2: Guard checkQuiz in BOTH renderers**

In both `checkQuiz` functions (static ~line 242 and SCORM ~line 574), add at the very top:

```js
if (correctIndex === -1) {
  var fb = document.getElementById(id+'-fb');
  if (fb) { fb.textContent = 'No correct answer set.'; fb.className = 'feedback incorrect'; }
  return;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scorm12.ts
git commit -m "fix: SCORM quiz handles correctIndex -1 gracefully"
```

---

### Task 11: SCORM — feedback on both outcomes for quiz and shortanswer

**Files:**
- Modify: `src/lib/scorm12.ts`

- [ ] **Step 1: Fix checkQuiz feedback in BOTH renderers**

In both `checkQuiz` functions (static ~line 248 and SCORM ~line 580), change the feedback logic:

Current:
```js
fb.textContent = correct ? (feedbackMessage || '✓ Correct!') : '✗ Incorrect — try again.';
```

Change to:
```js
var prefix = correct ? '✓ Correct!' : '✗ Incorrect — try again.';
fb.textContent = feedbackMessage ? prefix + ' ' + feedbackMessage : prefix;
```

- [ ] **Step 2: Fix checkSA feedback in BOTH renderers**

In both `checkSA` functions (static ~line 291 and SCORM ~line 623), change:

Current:
```js
fb.textContent = correct ? (feedbackMessage || '✓ Correct!') : '✗ Not quite — try again.';
```

Change to:
```js
var prefix = correct ? '✓ Correct!' : '✗ Not quite — try again.';
fb.textContent = feedbackMessage ? prefix + ' ' + feedbackMessage : prefix;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scorm12.ts
git commit -m "feat: SCORM shows feedback on both correct and incorrect outcomes"
```

---

### Task 12: ListForm inline remove

**Files:**
- Modify: `src/components/blocks/editor/ListForm.tsx`

- [ ] **Step 1: Change list item layout to horizontal flex with inline trash icon**

Change each item from:
```tsx
<div key={idx} className="space-y-2">
  <RichTextEditor value={it} onChange={(html) => updateItem(idx, html)} placeholder={`Item ${idx + 1}`} />
  <Button variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
</div>
```
to:
```tsx
<div key={idx} className="flex items-start gap-2">
  <div className="flex-1">
    <RichTextEditor value={it} onChange={(html) => updateItem(idx, html)} placeholder={`Item ${idx + 1}`} />
  </div>
  <button
    type="button"
    onClick={() => removeItem(idx)}
    className="mt-2 text-muted-foreground hover:text-destructive"
    title="Remove item"
  >
    <Trash2 size={14} />
  </button>
</div>
```

Add import: `import { Trash2 } from "lucide-react";`

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/ListForm.tsx
git commit -m "fix: ListForm uses inline trash icon instead of separate Remove button"
```

---

### Task 13: Media upload error toasts

**Files:**
- Modify: `src/components/blocks/editor/ImageForm.tsx`
- Modify: `src/components/blocks/editor/VideoForm.tsx`
- Modify: `src/components/blocks/editor/AudioForm.tsx`
- Modify: `src/components/blocks/editor/DocumentForm.tsx`

- [ ] **Step 1: Add toast to all four forms' catch blocks**

In each file, add import:
```tsx
import { toast } from "@/hooks/use-toast";
```

In each `catch (e)` block, add after `console.error`:
```tsx
toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Please try again." });
```

Example for ImageForm.tsx:
```tsx
} catch (e) {
  console.error("Upload failed", e);
  toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Please try again." });
}
```

Apply the same pattern to all four files.

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/ImageForm.tsx src/components/blocks/editor/VideoForm.tsx src/components/blocks/editor/AudioForm.tsx src/components/blocks/editor/DocumentForm.tsx
git commit -m "feat: media upload forms show error toast on failure"
```

---

### Task 14: MCP preview — quiz correctIndex -1 label

**Files:**
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Write failing test**

Add to `mcp/tests/preview.test.ts`:

```typescript
it("renders quiz with correctIndex -1 as unset", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [{
        id: "b1",
        type: "quiz",
        question: "Q?",
        options: ["A", "B"],
        correctIndex: -1,
      }],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("no correct answer set");
  expect(html).not.toContain("✓");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: FAIL — no "no correct answer set" text

- [ ] **Step 3: Implement the change**

In `mcp/src/tools/preview.ts`, change the quiz case in `renderBlock()` (line 33):

From:
```ts
case "quiz":
  return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Quiz:</strong> ${esc(block.question)}<ul>${block.options.map((o, i) => `<li>${i === block.correctIndex ? "✓ " : ""}${esc(o)}</li>`).join("")}</ul></div>`;
```

To:
```ts
case "quiz":
  return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Quiz:</strong> ${esc(block.question)}<ul>${block.options.map((o, i) => `<li>${block.correctIndex >= 0 && i === block.correctIndex ? "✓ " : ""}${esc(o)}</li>`).join("")}</ul>${block.correctIndex === -1 ? "<p><em>(no correct answer set)</em></p>" : ""}</div>`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "feat: MCP preview shows explicit label for quiz with correctIndex -1"
```

---

### Task 15: MCP instructions — document correctIndex -1 and options min 2

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Update quiz documentation**

In the Block Types Reference section, update the quiz line to note:
- `correctIndex` can be `-1` (unset — no correct answer chosen yet)
- Options require minimum 2 entries

Change the quiz line from:
```
quiz        { type: "quiz",        question: "...",  options: ["A","B","C","D"],  correctIndex: 2,  showFeedback?: true,  feedbackMessage?: "..." }
              ↑ correctIndex is a NUMBER (0-based index into options), never a string
```

To:
```
quiz        { type: "quiz",        question: "...",  options: ["A","B","C","D"],  correctIndex: 2,  showFeedback?: true,  feedbackMessage?: "..." }
              ↑ correctIndex is a NUMBER (0-based index into options, or -1 for "not yet set"). Options need at least 2 entries.
```

- [ ] **Step 2: Commit**

```bash
git add mcp/src/resources/instructions.ts
git commit -m "docs: MCP instructions document correctIndex -1 and min 2 options"
```

---

### Task 16: Run all MCP tests

- [ ] **Step 1: Run full test suite**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All tests pass

- [ ] **Step 2: Verify app builds**

Run: `npm run build`
Expected: No errors
