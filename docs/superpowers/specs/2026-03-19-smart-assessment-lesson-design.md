# Smart Assessment Lesson — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Goal

Add a new `AssessmentLesson` lesson type to TideLearn that delivers an adaptive practice test experience within the normal course flow. Authors build a question bank via a form-based editor or JSON import; learners experience Leitner spaced repetition, confidence tracking, weak-area drilling, and a mistake notebook — all stored in localStorage per course/lesson.

---

## Architecture

### Lesson type becomes a discriminated union

`Lesson` in `src/types/course.ts` becomes:

```typescript
export type AssessmentQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string]; // always exactly 4
  correctIndex: number;                       // 0–3
  feedback?: string;                          // shown after answer revealed
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

export type AssessmentConfig = {
  passingScore?: number; // default: 80 (%)
  examSize?: number;     // default: 20
};

export type ContentLesson = {
  kind: "content";
  id: string;
  title: string;
  blocks: Block[];
};

export type AssessmentLesson = {
  kind: "assessment";
  id: string;
  title: string;
  questions: AssessmentQuestion[];
  config: AssessmentConfig;
};

export type Lesson = ContentLesson | AssessmentLesson;
```

`AssessmentQuestion`, `AssessmentConfig`, `ContentLesson`, `AssessmentLesson` are all exported from `src/types/course.ts` — **not** split into a separate file. Splitting would require `AssessmentLesson` to reference `AssessmentQuestion` across files, creating a cross-import with no isolation benefit. All assessment types live in `course.ts` alongside `Block`, `Lesson`, etc.

The `kind` discriminant is added to all existing lessons on load (migration shim in `courses.ts`). Any lesson without a `kind` field is treated as `"content"`. This is a read-time migration — no write required until the next save.

### Progress storage

Key: `tl_assess_{courseId}_{lessonId}` in localStorage.

```typescript
// src/hooks/useAssessmentProgress.ts (types defined inline here)

type QuestionProgress = {
  box: 1 | 2 | 3 | 4;
  testCount: number;          // total times this question has been answered
  correctCount: number;
  highConfidenceMisses: number;
  lastMissConfidence?: "low" | "med" | "high"; // confidence at time of last incorrect answer
  // incorrectCount is derived: testCount - correctCount (not stored separately)
};

type AssessmentProgress = {
  questions: Record<string, QuestionProgress>; // keyed by question id
  sessionHistory: Array<{ score: number; date: number; mode: "study" | "exam" }>;
};
```

Session history is capped at 20 entries (oldest dropped). Progress is never cleared automatically. New questions not yet in `questions` are initialised on first encounter as `{ box: 1, testCount: 0, correctCount: 0, highConfidenceMisses: 0 }`.

---

## Leitner Eligibility

Box eligibility is based on each question's individual `testCount` (not a global session counter):

| Box | Eligible when |
|-----|--------------|
| 1   | Always (every session) |
| 2   | `testCount % 2 === 0` |
| 3   | `testCount % 4 === 0` |
| 4   | `testCount % 8 === 0` |

A question with `testCount: 0` (never seen) is always eligible. On the very first session, all questions are in box 1 with `testCount: 0`, so all are eligible.

---

## Weakness Score Formula

Used by Weak-Area Drill to rank questions:

```
weaknessScore = (incorrectRatio * boxWeight) + (highConfidenceMisses * 2)
```

Where:
- `incorrectRatio = (testCount - correctCount) / testCount` (0 if never seen)
- `boxWeight`: box 1 = 4, box 2 = 3, box 3 = 2, box 4 = 1 (lower box = more weight)
- `highConfidenceMisses * 2` — HCM bonus, fixed multiplier of 2

Questions with `testCount === 0` are excluded from the drill (no data). Top N weakest questions (N = min(20, available)) are selected.

---

## Domino Map — Files Affected by Discriminated Union

Every file that accesses `lesson.blocks` must be updated with a type guard. Files that create new lessons must add `kind: "content"`.

### Type definitions
- `src/types/course.ts` — discriminated union definition (all assessment types here)
- `mcp/src/lib/types.ts` — MCP mirror; same change; `lessonSchema` Zod schema updated (see below)
- `src/validate/course.ts` — Zod schema updated to discriminated union (see below)

### Core pages
- `src/pages/Editor.tsx` — branch on `lesson.kind`; render `AssessmentEditor` or block canvas. **Also**: the "keep welcome heading in sync" `useEffect` (accesses `first.blocks[0]`) must guard `if (first.kind !== "content") return` before accessing `.blocks`.
- `src/pages/View.tsx` — branch on `lesson.kind`; render `AssessmentView` or block renderer; type-guard all `.blocks` access (3 loops: block rendering, quiz count, view-all mode)

### Library / utilities
- `src/lib/courses.ts` — migration shim adds `kind: "content"` to legacy lessons on load; default lesson creation adds `kind: "content"`
- `src/lib/patch/engine.ts` — all 4 patch operations (`appendBlocks`, `updateBlock`, `removeBlock`, `upsertLesson`) guard against assessment lessons; return a descriptive error string if called on an assessment lesson
- `src/lib/scorm12.ts` — block rendering loop skips assessment lessons silently (they produce no output in the SCORM package)

### MCP tools (defensive guards)
- `mcp/src/tools/lessons.ts` — `add_lesson` adds `kind: "content"`; `list_lessons` exposes `kind` in each lesson object in the response
- `mcp/src/tools/blocks.ts` — **all 6 block operations** (`add_block`, `update_block`, `move_block`, `delete_block`, `list_blocks`, `rewrite_blocks`) return `err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.")` if the target lesson has `kind: "assessment"`
- `mcp/src/tools/semantic.ts` — the following operations must guard against assessment lessons:
  - `replace_lesson` — return error if target lesson is assessment
  - `generate_lesson` — return error if target lesson is assessment (assessment lessons are created via `add_assessment_lesson` only)
  - `rewrite_lesson` — return error if target lesson is assessment
  - `generate_quiz_for_lesson` — return error if target lesson is assessment
  - `rewrite_block` — return error if target lesson is assessment
  - `save_course` — calls `injectIds` which walks `lesson.blocks`; must skip assessment lessons in the inject loop (assessment lessons have no blocks to inject IDs into)
- `mcp/src/tools/preview.ts` — `renderCourseToHtml` and `analyzeCourse` both iterate `lesson.blocks`; assessment lessons are skipped silently; `preview_course` shows a placeholder `<div>Assessment lesson: {title} ({N} questions)</div>` in place of block content; `review_course` reports assessment lesson question count in analytics but skips block-level analysis

### Safe (no change needed)
- `src/components/blocks/view/Toc.tsx` — only accesses `l.id` and `l.title`

---

## Zod Schema Updates

### `src/validate/course.ts`

Replace the current `lessonSchema` with a discriminated union. Assessment lessons use a passthrough to avoid strict question validation at the course level (question validation happens in the editor/import):

```typescript
const contentLessonSchema = z.object({
  kind: z.literal("content"),
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
}).passthrough();

const assessmentLessonSchema = z.object({
  kind: z.literal("assessment"),
  id: z.string(),
  title: z.string(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
  }).passthrough()),
  config: z.object({}).passthrough(),
}).passthrough();

const lessonSchema = z.discriminatedUnion("kind", [
  contentLessonSchema,
  assessmentLessonSchema,
]);
```

### `mcp/src/lib/types.ts`

Same update as above. The `lessonSchema` here is used by `generate_lesson` for validation. After the update, `generate_lesson` must check `lesson.kind === "assessment"` and return `err("assessment_lesson", "...")` before any block operations — the Zod schema change alone does not prevent this.

---

## New Files

| File | Responsibility |
|------|---------------|
| `src/hooks/useAssessmentProgress.ts` | localStorage read/write for Leitner progress + session history |
| `src/lib/assessment.ts` | Leitner eligibility, weakness scoring, test generation (standard + weak-area), source-balanced draw |
| `src/components/assessment/QuestionForm.tsx` | Add/edit a single question (inline form) |
| `src/components/assessment/QuestionCard.tsx` | Question bank list card (preview + edit/delete) |
| `src/components/assessment/JsonImport.tsx` | JSON textarea import + parser/validator |
| `src/components/assessment/AssessmentEditor.tsx` | Full question bank editor (orchestrates form, cards, import, config panel) |
| `src/pages/AssessmentView.tsx` | Full adaptive test experience (home, study, exam, results, drill, notebook) |
| `mcp/src/tools/assessment.ts` | New MCP tools for assessment lessons |

---

## Editor Experience

When adding a new lesson, the user chooses **Content lesson** (existing) or **Assessment lesson** (new).

For assessment lessons, the editor replaces the block canvas with `AssessmentEditor`:

- **Question bank list** — cards showing question text, correct answer, optional Bloom/source tags, edit/delete buttons
- **Add question** — inline form with: question text, 4 option fields, correct answer picker (radio), optional feedback text, optional Bloom level (dropdown), optional source tag (text)
- **Import JSON** — collapsible textarea that accepts an array of question objects; parser validates structure and shows per-question errors before committing
- **Config panel** — passing score (number input, default 80%) and exam size (number input, default 20)

JSON import format matches the question type exactly. Unrecognised fields are stripped silently; missing required fields (`text`, `options`, `correctIndex`) surface as validation errors with the question index shown.

---

## Viewer Experience

`View.tsx` branches on `lesson.kind === "assessment"` and renders `AssessmentView` full-screen (replaces the reading canvas).

### Home screen
- Lesson title and question count
- Last session score and date (if any)
- **Study** and **Exam Simulation** buttons
- **Weak-Area Drill** button (enabled once ≥10 questions have `testCount > 0`)
- **Mistake Notebook** button

### Study mode (Leitner)
1. Draw eligible questions using box/testCount eligibility table above
2. Show question + 4 options
3. Learner selects confidence (Low / Med / High) before revealing answer
4. Answer revealed; optional feedback shown
5. Correct → advance box (max 4); Incorrect → reset to box 1; High-confidence miss → increment `highConfidenceMisses`
6. `testCount` incremented on every answer; session ends when eligible pool exhausted

### Exam Simulation mode
1. Draw `examSize` questions (source-balanced if source tags present; random otherwise)
2. One question at a time, no confidence selector, no feedback during session
3. Score screen at end: percentage, pass/fail badge, per-question review

### Results screen (after either mode)
- Score and pass/fail
- Session score trend (last 10 sessions from `sessionHistory`)
- Bloom's-level breakdown (only shown if ≥1 answered question has a `bloomLevel`)
- Link to Mistake Notebook

### Weak-Area Drill
Selects top N weakest questions by `weaknessScore` (formula above). N = min(20, questions with `testCount > 0`). Delivered as a standard study-mode session with no confidence selector.

### Mistake Notebook
Filterable list of all questions where `testCount - correctCount > 0`, grouped by confidence level at time of last miss (Low / Med / High). Stored as part of per-question progress — add `lastMissConfidence?: "low" | "med" | "high"` to `QuestionProgress`.

---

## MCP Tools (new: `mcp/src/tools/assessment.ts`)

| Tool | Input | Purpose |
|------|-------|---------|
| `add_assessment_lesson` | `course_id`, `title`, `position?` | Creates assessment lesson with empty question bank |
| `list_questions` | `course_id`, `lesson_id` | Lists all questions (id, text, bloomLevel, source) |
| `add_question` | `course_id`, `lesson_id`, question fields | Adds one question |
| `update_question` | `course_id`, `lesson_id`, `question_id`, partial fields | Edits a question by ID |
| `delete_question` | `course_id`, `lesson_id`, `question_id` | Removes a question |
| `import_questions` | `course_id`, `lesson_id`, `questions` JSON array | Bulk imports; validates each; reports per-question errors without partial commit |
| `update_assessment_config` | `course_id`, `lesson_id`, `passingScore?`, `examSize?` | Updates config |

All 6 block tools (`add_block`, `update_block`, `move_block`, `delete_block`, `list_blocks`, `rewrite_blocks`) return a clear error if called on an assessment lesson (see Domino Map above).

---

## SCORM Export Behaviour

Assessment lessons are excluded from SCORM and static web exports. In the publish/export modal (`Editor.tsx`), if the course contains any assessment lessons, a note is shown below the export buttons:

> "Assessment lessons are not included in exported packages."

The note is plain text, styled like the existing export disclaimer text. No action required from the author.

---

## Constraints & Decisions

- **All assessment types in `course.ts`** — no separate `assessment.ts` types file; avoids circular dependencies
- **Progress is localStorage-only** — no learner accounts yet; progress is lost on storage clear or new device
- **No AI question generation** — questions are authored manually or imported via JSON
- **Bloom's taxonomy is optional** — analytics breakdown only shown when questions are tagged
- **Source tags are optional** — balanced draws only activate when tags are present; otherwise random
- **Assessment lessons excluded from SCORM/static export** — with a note in the export modal
- **No branching from assessment results** — course branching is a separate future project
- **Session history capped at 20 entries** — oldest dropped when limit reached
- **Leitner uses 4 boxes** — matching the original practice test tool
- **`incorrectCount` is derived** — `testCount - correctCount`; not stored separately
- **Box eligibility is per-question** — based on each question's own `testCount`, not a global session counter
