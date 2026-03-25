# Phase 2B — Assessment Question Types + Validation Catch-up

**Date:** 2026-03-25
**Status:** Approved for implementation planning

---

## Goal

Extend TideLearn with four new interaction types (multiple response, fill-in-the-blank, matching, drag-drop/sorting) available as both content blocks and assessment questions. Migrate the `AssessmentQuestion` type to a proper discriminated union. Update the Leitner assessment UI to render all question types. Bake in validation for all new blocks, and apply the same validation treatment to the 9 Phase 2A blocks that missed it.

---

## Scope

### New block types (3)
- `multipleresponse`
- `fillinblank`
- `matching`

Note: `sorting` (drag-drop) already exists as a content block — no new block needed.

### New assessment question types (4)
- `multipleresponse`
- `fillinblank`
- `matching`
- `sorting` (drag-drop categorisation — shares `buckets`/`items` structure with SortingBlock but omits `showFeedback`; assessment grading is handled by the Leitner engine)

### Other work
- `AssessmentQuestion` discriminated union migration (MCQ gets `kind: "mcq"`)
- Leitner assessment UI updated to render all question types
- Per-kind grading functions in `assessment.ts`
- Validation for 3 new blocks (required fields, Zod, MCP, publish warnings)
- Validation catch-up for 9 Phase 2A blocks (same treatment)
- Full MCP updates baked in throughout

---

## Data Model

### AssessmentQuestion — discriminated union

```typescript
type MCQQuestion = {
  kind: "mcq";
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

type MultipleResponseQuestion = {
  kind: "multipleresponse";
  id: string;
  text: string;
  options: string[];        // 2–6 options
  correctIndices: number[]; // ≥2 correct (a multiple-response with 1 correct is functionally MCQ)
  feedback?: string;
};

type FillInBlankQuestion = {
  kind: "fillinblank";
  id: string;
  text: string; // template with {{1}}, {{2}} markers
  blanks: Array<{
    id: string;
    acceptable: string[];
    caseSensitive?: boolean;
  }>;
  feedback?: string;
};

type MatchingQuestion = {
  kind: "matching";
  id: string;
  text: string;
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pairs: Array<{ leftId: string; rightId: string }>;
  feedback?: string;
};

type SortingQuestion = {
  kind: "sorting";
  id: string;
  text: string;
  buckets: Array<{ id: string; label: string }>;
  items: Array<{ id: string; text: string; bucketId: string }>;
  feedback?: string;
};

type AssessmentQuestion =
  | MCQQuestion
  | MultipleResponseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | SortingQuestion;
```

**Migration strategy:** Permissive schema defaults `kind` to `"mcq"` when absent. Existing courses load without changes. A `migrateQuestions` function is added to `src/lib/courses.ts` (same file and pattern as the existing `migrateLessons` function at line 26) — it walks assessment lesson questions and adds `kind: "mcq"` to any question missing a `kind` field. Called from `loadCourse()` alongside `migrateLessons`. Note: `loadCourseFromCloud()` currently does not call `migrateLessons` either — preserve this existing gap as-is; do not fix it as part of Phase 2B.

The `assessmentLessonSchema` in **both** `src/types/course.ts` and `mcp/src/lib/types.ts` must have their `questions` array updated from the current hardcoded MCQ shape (4-tuple options, `correctIndex: number`) to a discriminated union schema covering all 5 question types. Both strict and permissive variants need updating. The permissive variant must use `.catch()` or `.default()` on the `kind` field to default to `"mcq"` — same principle as block schema permissive variants. Failing to update the permissive schema causes the viewer to silently show "Course not found" (see CLAUDE.md critical rules).

`bloomLevel` exists only on `MCQQuestion`. Any code that accesses `q.bloomLevel` (e.g. the bloom breakdown memo in `AssessmentView.tsx`) must narrow to `kind === "mcq"` before accessing it, or it will produce a TypeScript error on the union type.

### New block types

```typescript
type MultipleResponseBlock = {
  type: "multipleresponse";
  id: string;
  question: string;
  options: string[];
  correctIndices: number[];
  showFeedback?: boolean;
  feedbackMessage?: string;
};

type FillInBlankBlock = {
  type: "fillinblank";
  id: string;
  template: string; // e.g. "The capital of {{1}} is {{2}}."
  blanks: Array<{
    id: string;
    acceptable: string[];
    caseSensitive?: boolean;
  }>;
  showFeedback?: boolean;
};

type MatchingBlock = {
  type: "matching";
  id: string;
  prompt: string;
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pairs: Array<{ leftId: string; rightId: string }>;
  showFeedback?: boolean;
};
```

Notes on field naming conventions (consistent with existing project patterns):
- `FillInBlankBlock` uses `template` (the sentence with gaps); `FillInBlankQuestion` uses `text` (the question stem)
- `MatchingBlock` uses `prompt`; `MatchingQuestion` uses `text` — same divergence, same rationale: blocks use `prompt`, questions use `text`

---

## Block Editor UX

### Multiple response
Standard form: question text field, option list (add/remove), checkboxes to mark correct answers. Requires ≥2 options and ≥2 marked correct.

### Fill-in-the-blank
- Author types the sentence in a rich template editor
- **"+ Insert gap"** button inserts a styled chip (e.g. `[Gap 1]`) at the cursor position
- Chips are **draggable** within the template so authors can reposition after insertion
- Raw `{{n}}` markers stored under the hood; chips are the visual representation
- Below the template: one acceptable-answers field per gap (comma-separated or tag input)
- Optional case-sensitivity toggle per gap

### Matching
Two-column editor: add left items, add right items, then draw connections between them (or use dropdowns). Requires ≥2 items per column and all pairs defined.

---

## Learner Experience

Each type works identically whether in a content lesson (block) or assessment (question).

- **Multiple response:** Checkboxes, submit when ready, correct/incorrect feedback
- **Fill-in-the-blank:** Sentence displayed with text input fields in gap positions
- **Matching:** Left column fixed, right column matched via drag or dropdown
- **Sorting/drag-drop:** Items dragged into labelled buckets (same as existing SortingBlock viewer)

---

## Leitner Integration

All 4 new question types participate in Leitner spaced repetition identically to MCQ: correct → advance a box, incorrect → back to box 1.

**Per-kind grading functions** added to `src/lib/assessment.ts`:

| Kind | Correct when |
|------|-------------|
| `multipleresponse` | All correctIndices selected, no incorrect ones selected |
| `fillinblank` | All blanks answered correctly (respecting caseSensitive per blank) |
| `matching` | All pairs correct |
| `sorting` | All items placed in their correct bucket |

**AssessmentView.tsx** updated throughout (study, exam, drill, mistake notebook) to switch on `question.kind` and render the appropriate interactive UI for each type. Currently hardcoded to MCQ (`currentQ.correctIndex`, `currentQ.options`) — all such references replaced with kind-aware rendering.

**`src/lib/assessment.ts`** — `generateExamSession` and `generateSourceBalanced` access `q.source` directly; after migration, `source` only exists on `MCQQuestion`. Both functions must narrow to `kind === "mcq"` before accessing `source`.

---

## Validation

### New blocks (Phase 2B)

| Block | Required fields | Optional fields |
|-------|----------------|-----------------|
| `multipleresponse` | `question`, ≥2 options, ≥2 `correctIndices` | `showFeedback`, `feedbackMessage` |
| `fillinblank` | `template` with ≥1 gap, ≥1 acceptable answer per gap | `showFeedback` |
| `matching` | `prompt`, ≥2 left items, ≥2 right items, all pairs defined | `showFeedback` |

### Phase 2A blocks (catch-up)

Several Phase 2A Zod schemas already have tight constraints (e.g. `sorting`, `branching` already use `.min(1)` on required strings and `.min(2)` on arrays). The catch-up work for Phase 2A blocks is primarily:
1. `<FieldLabel required>` asterisks on editor form fields (currently absent for all Phase 2A blocks)
2. Publish modal warning integration
3. Any remaining Zod gaps (verify per-block — do not redundantly re-add constraints already present)

| Block | Required fields (verify Zod already tight before adding) |
|-------|----------------|
| `button` | `label`, `url` |
| `embed` | `url` |
| `flashcard` | `front`, `back` |
| `timeline` | ≥2 events, each with non-empty label (**intentional tightening** from current ≥1 — a timeline with 1 event is not meaningful) |
| `process` | ≥2 steps, each with non-empty label (**intentional tightening** from current ≥1 — a process with 1 step is not meaningful) |
| `chart` | `title`, ≥1 data series with ≥1 data point |
| `sorting` | `prompt`, ≥2 buckets, ≥2 items |
| `hotspot` | `src`, ≥1 hotspot with non-empty label |
| `branching` | ≥2 branches, each with non-empty label and ≥1 option |

### Validation layers (same as existing system)

1. `required` asterisk on editor form fields via `<FieldLabel required>`
2. Zod schemas: `z.string().min(1)` on required strings, `.min(2)` on arrays requiring multiple items, both in `src/types/course.ts` and `mcp/src/lib/types.ts`
3. MCP tools reject incomplete blocks/questions on write with descriptive error messages
4. Publish modal warns on misconfigured blocks

**Error messages:**
- "Question text is required"
- "Add at least 2 options"
- "Mark at least 2 correct answers" (multipleresponse requires ≥2 correct — a single correct answer is functionally MCQ)
- "Template must contain at least one gap"
- "Gap {{n}} needs at least one acceptable answer"
- "Add at least 2 items to each column"
- "All left-column items must be matched"

---

## MCP Updates

All MCP work ships with its corresponding feature — no deferred cleanup phase.

| File | Change |
|------|--------|
| `mcp/src/lib/types.ts` | New Zod schemas for 3 block types + 5 question types (incl. migrated MCQ); tighten Phase 2A block schemas |
| `mcp/src/tools/blocks.ts` | `add_block` description + input schema for 3 new block types |
| `mcp/src/tools/questions.ts` | `add_question` + `update_question` support `kind` parameter and all 5 question shapes |
| `mcp/src/tools/semantic.ts` | `injectSubItemIds` — handle `fillinblank` block blanks (one pass), `matching` block left items AND right items (two separate passes); add a new `injectQuestionSubItemIds` function for question types (`fillinblank` blanks, `matching` left AND right items, `sorting` items/buckets) — called from `add_question` in `questions.ts` |
| `mcp/src/tools/preview.ts` | `renderBlock` — 3 new cases; add new `renderQuestion` function with cases for all 5 question types (MCQ + 4 new) |
| `mcp/src/resources/instructions.ts` | Docs for all new block/question types |
| `mcp/src/tools/__tests__/` | Tests for all new schemas, injectSubItemIds cases, grading logic |

---

## Implementation Tiers

### Tier 1 — Foundation: AssessmentQuestion discriminated union

- Add `kind` to all 5 question type definitions in `src/types/course.ts`
- Update permissive schema to default `kind: "mcq"` on legacy questions
- Add `migrateQuestions` function to `src/lib/courses.ts` (same pattern as `migrateLessons` at line 26)
- Update `mcp/src/lib/types.ts` with new question union schema
- Update `add_question` + `update_question` MCP tools for discriminated union
- Update `generateExamSession` and `generateSourceBalanced` in `src/lib/assessment.ts` to narrow to `kind === "mcq"` before accessing `source` and `bloomLevel`
- Update bloom breakdown memo in `AssessmentView.tsx` to narrow to `kind === "mcq"`
- All existing MCQ tests still pass

### Tier 2 — Multiple response (simplest new type)

- `MultipleResponseBlock` and `MultipleResponseQuestion` types + schemas + factories
- Block: editor form, viewer, registry entry
- Question: grading function, `AssessmentView.tsx` renderer for all 4 screens
- Validation: FieldLabel required props, Zod `.min(1)`/`.min(2)`, MCP errors
- MCP: `add_block` + `add_question` support, `injectSubItemIds` (none needed — options are strings), `renderBlock` + `renderQuestion` cases
- Tests

### Tier 3 — Fill-in-the-blank + Matching

- Types, schemas, factories for both block and question variants
- Block editors (fill-in-the-blank with draggable gap chips; matching two-column editor)
- Block viewers + question renderers in `AssessmentView.tsx`
- Grading functions for both
- Validation for both
- MCP updates: `injectSubItemIds` for blanks and matching left AND right items (two passes); `injectQuestionSubItemIds` called from `add_question` for both types; `renderBlock` + `renderQuestion` cases; `instructions.ts` docs
- Tests

### Tier 4 — Sorting question + Phase 2A validation catch-up + full tests

- `SortingQuestion` type + schema + factory (block already exists)
- `AssessmentView.tsx` renderer for sorting question
- Grading function for sorting
- MCP: `add_question` sorting support, `injectSubItemIds` for sorting question, `renderQuestion` case
- Phase 2A validation catch-up: `FieldLabel required` props, Zod schema tightening, MCP error messages for all 9 Phase 2A blocks
- Comprehensive test suite covering all new pure functions, schemas, grading logic
- Update `instructions.ts` with complete documentation for all new types

---

## Hotspot MCP Workflow

Hotspot blocks require image coordinates (x/y as percentages) for each pin — impossible to determine without visually inspecting the image. The MCP workflow is therefore a two-step handoff:

**Via MCP:** Author calls `add_block` with `type: "hotspot"`, image URL (from `upload_media`), and hotspot labels. Coordinates are set to a default placeholder (e.g. `x: 50, y: 50` for all pins — centred on the image).

**MCP response** includes a clear direction: *"Hotspot block created with [n] pins at placeholder positions. Open the editor to click the image and position each pin correctly."*

**In the editor:** When a hotspot block has any pins at the default placeholder coordinates, the block shows a visible prompt banner: *"Pin positions need setting — click the image to place each pin."*

**`instructions.ts`** documents this as the standard hotspot authoring flow: MCP for image + labels, editor for pin placement.

This pattern (MCP creates the scaffold, editor handles the visual interaction) is the correct division of responsibility for any block where spatial/visual input is required.

---

## Out of Scope (Phase 2B)

- Collaboration / multi-author
- xAPI / SCORM 2004
- In-app AI generation buttons
- Hosting / deployment (Phase 5)
- Templates / onboarding (Phase 4)
