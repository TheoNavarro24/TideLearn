# Spec 1: Block Form UX

> Polish and friction reduction for the block editor forms — the primary authoring interface.

## Context

TideLearn's block editor is the core authoring surface. After a thorough review comparing it against industry tools (Articulate Rise, iSpring, Storyline), we identified UX friction in several block editor forms, inconsistent feedback behaviour in learner-facing view components, and cascading issues in export renderers. This spec addresses the form-level UX while keeping schema changes minimal — Spec 3 (Validation) handles schema tightening later.

This is **Spec 1 of 3** in the Block Polish series:
- **Spec 1: Block Form UX** (this document)
- Spec 2: Inline Previews
- Spec 3: Validation & Mandatory Fields

## Changes

### 1. QuizForm — add/remove options + radio correct answer

**Current:** Options are fixed at 4 (factory default). Correct answer is marked via a separate checkmark button per option. New quizzes default to `correctIndex: 0` (option A silently "correct").

**After:**
- "Add option" button below the last option (no maximum enforced in UI, minimum 2)
- Each option row has a trash icon to remove it (disabled when only 2 remain)
- Each option row has a **radio button** to select the correct answer — standard pattern across all rapid authoring tools
- Factory changes `correctIndex` from `0` to `-1` (sentinel for "not yet set")
- The form shows a subtle prompt ("Select the correct answer") when `correctIndex === -1`

**Files changed:**
- `src/components/blocks/editor/QuizForm.tsx` — form restructure
- `src/types/course.ts` — factory: `correctIndex: -1`
- `mcp/src/lib/types.ts` — factory: `correctIndex: -1`

**Cascade:**
- `src/components/blocks/view/Quiz.tsx` — handle `correctIndex === -1`: disable Check button, show "No correct answer set" if reached in view
- `src/lib/scorm12.ts` — `renderQuiz()`: handle `-1` (show warning instead of marking an option correct)
- `mcp/src/tools/preview.ts` — `renderBlock()` for quiz: handle `-1`
- `mcp/src/resources/instructions.ts` — document that `correctIndex` can be `-1` (unset) and that options need min 2

### 2. TrueFalse label fix

**Current:** Toggle label always reads "Correct answer is True" regardless of state.

**After:** Label dynamically reads "The correct answer is: **True**" or "The correct answer is: **False**" based on the `correct` field value.

**Files changed:**
- `src/components/blocks/editor/TrueFalseForm.tsx` — label text

**Cascade:** None.

### 3. AccordionForm vertical layout

**Current:** Title and Content sit side-by-side in `sm:grid-cols-2`, cramming the RichTextEditor into half width.

**After:** Each accordion item renders as a vertical stack: title input (full width) above content editor (full width). Items separated by a subtle divider.

**Files changed:**
- `src/components/blocks/editor/AccordionForm.tsx` — layout change

**Cascade:** None.

### 4. CalloutForm — Textarea to RichTextEditor

**Current:** Callout body uses a plain `<textarea>`. Authors cannot bold, link, or format text.

**After:** Callout body uses `<RichTextEditor>` (same Tiptap editor used by Text, Accordion, Tabs, List blocks). The `text` field now contains HTML.

**Files changed:**
- `src/components/blocks/editor/CalloutForm.tsx` — swap `<Textarea>` for `<RichTextEditor>`

**Cascade — this is the important one:**
- `src/components/blocks/view/Callout.tsx` — already renders the text field as raw HTML, so **no change needed** in the frontend view
- `src/lib/scorm12.ts` — SCORM export `renderBlock` case `'callout'` currently uses `esc(b.text)` which would double-escape HTML. Must change to raw `b.text` (matching how `'text'` blocks are already handled). The content originates from the Tiptap editor which produces sanitized HTML.
- `mcp/src/tools/preview.ts` — `renderBlock()` case `"callout"` already uses `${block.text}` (raw, no escaping) — **already correct**, no change needed
- `mcp/src/resources/instructions.ts` — line 18 already notes callout `text` should use HTML. No change needed.

### 5. ListForm inline remove

**Current:** Each list item has a full RichTextEditor followed by a ghost "Remove" button below it. Visually noisy with 5+ items.

**After:** Each item row is a horizontal flex: RichTextEditor (flex-grow) + a small trash icon button (flex-shrink). The separate "Remove" button below each item is removed.

**Files changed:**
- `src/components/blocks/editor/ListForm.tsx` — layout change

**Cascade:** None.

### 6. Media upload error toasts

**Current:** `ImageForm`, `VideoForm`, `AudioForm`, `DocumentForm` all catch upload errors with `console.error` only. No user feedback.

**After:** Each upload catch block calls `toast({ title: "Upload failed", description: "..." })` using the existing toast system from `@/hooks/use-toast`.

**Files changed:**
- `src/components/blocks/editor/ImageForm.tsx`
- `src/components/blocks/editor/VideoForm.tsx`
- `src/components/blocks/editor/AudioForm.tsx`
- `src/components/blocks/editor/DocumentForm.tsx`

**Cascade:** None. Toast system already exists and is imported in Editor.tsx.

### 7. Quiz and ShortAnswer feedback — show on both outcomes

**Current behaviour by block type:**
- **Quiz (view):** Feedback shows only when incorrect (`!isCorrect && block.feedbackMessage`)
- **ShortAnswer (view):** Feedback shows only when incorrect (`!correct && block.feedbackMessage`)
- **TrueFalse (view):** Already shows feedback for both outcomes (separate `feedbackCorrect` / `feedbackIncorrect` fields) — no change needed

**After:** Quiz and ShortAnswer view components show feedback on both correct and incorrect answers, matching TrueFalse behaviour.

**Quiz feedback field structure stays as-is** (`feedbackMessage` single field) — we don't split into correct/incorrect like TrueFalse. The single message serves as an explanation of the correct answer, which is valuable whether the learner got it right or wrong.

**Feedback stays disabled by default** — the `showFeedback` toggle stays off for new blocks. This is an intentional design decision: feedback should be a conscious authoring choice, not an ignored default that leads to empty feedback on summative assessments.

**Files changed:**
- `src/components/blocks/view/Quiz.tsx` — remove `!isCorrect` condition from feedback display
- `src/components/blocks/view/ShortAnswer.tsx` — remove `!correct` condition from feedback display
- `src/lib/scorm12.ts` — `renderQuiz()` and `renderShortAnswer()`: show feedback regardless of correctness
- `mcp/src/tools/preview.ts` — `renderBlock()` for quiz/shortanswer: same change (if feedback rendering exists there)

**Cascade:** None beyond the files listed.

### 8. Shared FieldLabel component

**New file:** `src/components/blocks/editor/FieldLabel.tsx`

A thin wrapper around `<label>` that standardises the label styling across all block forms. Currently every form duplicates `className="text-sm text-muted-foreground"`. This component centralises that and adds a `required` prop (renders a `*` — used in Spec 3, but the prop exists now with default `false`).

```tsx
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

All editor forms updated to use `<FieldLabel>` instead of raw `<label>`. The `required` prop is not used in this spec — it is set up for Spec 3.

## Files changed summary

| File | Change type |
|---|---|
| `src/components/blocks/editor/QuizForm.tsx` | Major restructure |
| `src/components/blocks/editor/TrueFalseForm.tsx` | Label text fix |
| `src/components/blocks/editor/AccordionForm.tsx` | Layout change |
| `src/components/blocks/editor/CalloutForm.tsx` | Textarea to RichTextEditor |
| `src/components/blocks/editor/ListForm.tsx` | Layout change |
| `src/components/blocks/editor/ImageForm.tsx` | Add toast on error |
| `src/components/blocks/editor/VideoForm.tsx` | Add toast on error |
| `src/components/blocks/editor/AudioForm.tsx` | Add toast on error |
| `src/components/blocks/editor/DocumentForm.tsx` | Add toast on error |
| `src/components/blocks/editor/FieldLabel.tsx` | **New file** |
| `src/components/blocks/editor/*.tsx` (all 16) | Use FieldLabel |
| `src/components/blocks/view/Quiz.tsx` | Feedback on both outcomes + handle correctIndex -1 |
| `src/components/blocks/view/ShortAnswer.tsx` | Feedback on both outcomes |
| `src/types/course.ts` | Factory: quiz correctIndex to -1 |
| `mcp/src/lib/types.ts` | Factory: quiz correctIndex to -1 |
| `src/lib/scorm12.ts` | Callout: stop escaping HTML text; Quiz: handle -1; Feedback: both outcomes |
| `mcp/src/tools/preview.ts` | Quiz renderBlock: handle -1 |
| `mcp/src/resources/instructions.ts` | Document correctIndex -1, options min 2 |

## What this does NOT change

- **Zod schemas** — no tightening of validation rules (Spec 3)
- **Required field indicators** — FieldLabel supports it but `required` is not set yet (Spec 3)
- **Inline media previews** — no image/video thumbnails in editor (Spec 2)
- **Block controls** (move/duplicate/delete icons, positioning) — out of scope for this series
- **Drag and drop reordering** — out of scope
- **Block delete confirmation** — out of scope (undo exists)

## Risks

1. **Callout HTML in SCORM export** — the SCORM `renderBlock` for callout currently escapes the text field. After this change, callout text is raw HTML. Existing courses with plain-text callouts will render fine (plain text is valid HTML). New courses with rich callout text will render correctly. The HTML originates from the Tiptap editor which produces sanitized output. No data migration needed.

2. **Quiz correctIndex -1 in existing courses** — this only affects the factory default for NEW quizzes. Existing quizzes keep their current `correctIndex` value. No migration needed.

3. **Quiz correctIndex -1 reaching the learner view** — if an author publishes without setting a correct answer, the quiz renders but the Check button behaviour needs to handle "no correct answer". Design decision: treat all answers as incorrect and show "No correct answer has been set" — this makes the problem visible to learners and the author will hear about it. Spec 3's publish-time validation will prevent this from reaching production.
