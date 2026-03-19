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
export type Lesson = ContentLesson | AssessmentLesson;

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
```

The `kind` discriminant is added to all existing lessons on load (migration shim in `courses.ts`). This is backward-compatible — any lesson without a `kind` field is treated as `"content"`.

### Question type

```typescript
export type AssessmentQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string]; // always exactly 4
  correctIndex: number;                       // 0–3
  feedback?: string;                          // shown after answer revealed
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV"; // optional
  source?: string;                            // optional tag for balanced draws
};

export type AssessmentConfig = {
  passingScore?: number; // default: 80 (%)
  examSize?: number;     // questions per exam session, default: 20
};
```

### Progress storage

Key: `tl_assess_{courseId}_{lessonId}` in localStorage.

```typescript
type QuestionProgress = {
  box: 1 | 2 | 3 | 4;         // Leitner box
  testCount: number;
  correctCount: number;
  highConfidenceMisses: number;
};

type AssessmentProgress = {
  questions: Record<string, QuestionProgress>; // keyed by question id
  sessionHistory: Array<{ score: number; date: number; mode: "study" | "exam" }>;
};
```

Session history is capped at 20 entries. Progress is never cleared automatically.

---

## Domino Map — Files Affected by Discriminated Union

Every file that accesses `lesson.blocks` must be updated with a type guard. Files that create new lessons must add `kind: "content"`.

### Type definitions (update both)
- `src/types/course.ts` — discriminated union definition
- `mcp/src/lib/types.ts` — duplicate, same change
- `src/validate/course.ts` — Zod schema updated to discriminated union

### Core pages
- `src/pages/Editor.tsx` — branch on `lesson.kind`; render AssessmentEditor or block canvas
- `src/pages/View.tsx` — branch on `lesson.kind`; render AssessmentView or block renderer; type-guard all `.blocks` access (3 loops)

### Library / utilities
- `src/lib/courses.ts` — migration shim adds `kind: "content"` to legacy lessons on load; default lesson creation adds `kind: "content"`
- `src/lib/patch/engine.ts` — all 4 patch operations (`appendBlocks`, `updateBlock`, `removeBlock`, `upsertLesson`) guard against assessment lessons
- `src/lib/scorm12.ts` — block rendering loop skips assessment lessons

### MCP tools (defensive guards)
- `mcp/src/tools/lessons.ts` — `add_lesson` adds `kind: "content"`; `list_lessons` exposes `kind` in response
- `mcp/src/tools/blocks.ts` — all 5 block operations reject calls on assessment lessons with a clear error
- `mcp/src/tools/semantic.ts` — `replace_lesson` and `generate_lesson` guard against assessment lessons
- `mcp/src/tools/preview.ts` — block enumeration filters to content lessons only

### Safe (no change needed)
- `src/components/blocks/view/Toc.tsx` — only accesses `l.id` and `l.title`

---

## New Files

| File | Responsibility |
|------|---------------|
| `src/types/assessment.ts` | `AssessmentQuestion`, `AssessmentConfig`, `AssessmentProgress` types |
| `src/hooks/useAssessmentProgress.ts` | localStorage read/write for Leitner progress + session history |
| `src/lib/assessment.ts` | Leitner logic, eligibility checks, weakness scoring, test generation (standard + weak-area) |
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

JSON import format matches the question type exactly, accepting the same fields. Unrecognised fields are stripped silently; missing required fields (`text`, `options`, `correctIndex`) surface as validation errors.

---

## Viewer Experience

`View.tsx` branches on `lesson.kind === "assessment"` and renders `AssessmentView` full-screen (replaces the reading canvas).

### Home screen
- Lesson title and question count
- Last session score and date (if any)
- **Study** and **Exam Simulation** buttons
- **Weak-Area Drill** button (enabled once ≥10 questions have been answered)
- **Mistake Notebook** button

### Study mode (Leitner)
1. Draw eligible questions: box 1 every session, box 2 every 2nd session, box 3 every 4th session, box 4 every 8th session (using `testCount` modulo)
2. Show question + 4 options
3. Learner selects confidence (Low / Med / High) before revealing answer
4. Answer revealed; optional feedback shown
5. Correct → advance box; Incorrect → reset to box 1; High-confidence miss → flag as HCM
6. Session ends when eligible pool exhausted

### Exam Simulation mode
1. Draw `examSize` questions (source-balanced if source tags present; random otherwise)
2. One question at a time, no confidence selector, no feedback during session
3. Score screen at end: percentage, pass/fail badge, per-question review

### Results screen (after either mode)
- Score and pass/fail
- Session score trend sparkline (last 10 sessions)
- Bloom's-level breakdown (only shown if ≥1 question has a `bloomLevel`)
- Link to Mistake Notebook

### Weak-Area Drill
Generates a set of the weakest questions using a weakness score:
`weaknessScore = (incorrectCount / totalSeen) * boxWeight + hcmBonus`

### Mistake Notebook
Filterable list of all incorrectly-answered questions, grouped by confidence level at time of miss (Low / Med / High).

---

## MCP Tools (new: `mcp/src/tools/assessment.ts`)

| Tool | Input | Purpose |
|------|-------|---------|
| `add_assessment_lesson` | `course_id`, `title`, `position?` | Creates assessment lesson with empty question bank |
| `list_questions` | `course_id`, `lesson_id` | Lists all questions (id, text, bloomLevel, source) |
| `add_question` | `course_id`, `lesson_id`, question fields | Adds one question |
| `update_question` | `course_id`, `lesson_id`, `question_id`, partial fields | Edits a question |
| `delete_question` | `course_id`, `lesson_id`, `question_id` | Removes a question |
| `import_questions` | `course_id`, `lesson_id`, `questions` JSON array | Bulk imports, validates each, reports errors per question |
| `update_assessment_config` | `course_id`, `lesson_id`, `passingScore?`, `examSize?` | Updates config |

All block tools (`add_block`, `update_block`, `move_block`, `delete_block`, `list_blocks`) return a clear error if called on an assessment lesson.

---

## Constraints & Decisions

- **Progress is localStorage-only** — no learner accounts yet; progress is lost on storage clear or new device
- **No AI question generation** — questions are authored manually or imported via JSON
- **Bloom's taxonomy is optional** — analytics breakdown only shown when questions are tagged
- **Source tags are optional** — balanced draws only activate when tags are present; otherwise random
- **Assessment lessons are excluded from SCORM export** — SCORM packages only contain content lessons (assessment lessons are skipped with a note in the export UI)
- **No branching from assessment results** — course branching is a separate future project
- **History capped at 20 session entries** — oldest dropped when limit reached
- **Leitner stack capped at 4 boxes** — matching the original practice test tool
