# Smart Assessment Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `AssessmentLesson` lesson type to TideLearn that delivers Leitner spaced-repetition adaptive practice within the course flow, with a form-based question editor and JSON import for authoring.

**Architecture:** `Lesson` becomes a discriminated union (`ContentLesson | AssessmentLesson`), requiring a read-time migration shim on load, type guards in every file that accesses `.blocks`, new assessment logic/progress modules, new authoring components, a full-screen viewer, and new MCP tools. Tasks are ordered by dependency: types → guards → logic → UI → MCP.

**Tech Stack:** React 18.3, TypeScript, Vite (no test suite — verify with `npm run build` + browser), Zod, localStorage, inline styles (no Tailwind in feature components).

**Spec:** `docs/superpowers/specs/2026-03-19-smart-assessment-lesson-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/course.ts` | Modify | Add `AssessmentQuestion`, `AssessmentConfig`, `ContentLesson`, `AssessmentLesson`; update `Lesson` union and `lessonSchema` |
| `mcp/src/lib/types.ts` | Modify | Mirror of course.ts — same changes |
| `src/lib/courses.ts` | Modify | Migration shim (`migrateLessons`); add `kind: "content"` to `createNewCourse` and `defaultLesson` |
| `src/validate/course.ts` | Modify | Update `lessonSchema` to discriminated union |
| `src/lib/patch/engine.ts` | Modify | Guard `appendBlocks`, `updateBlock`, `removeBlock` against assessment lessons |
| `src/lib/scorm12.ts` | Modify | Skip assessment lessons in the SCORM/static render loop |
| `src/pages/Editor.tsx` | Modify | Guard welcome sync effect; add lesson type picker; render `AssessmentEditor` for assessment lessons |
| `src/pages/View.tsx` | Modify | Guard 3 `.blocks` access points; branch on `lesson.kind === "assessment"` to render `AssessmentView` |
| `mcp/src/tools/lessons.ts` | Modify | `add_lesson` adds `kind: "content"`; `list_lessons` exposes `kind` |
| `mcp/src/tools/blocks.ts` | Modify | All 6 block ops guard against assessment lessons |
| `mcp/src/tools/semantic.ts` | Modify | Fix `injectIds`/`injectLessonIds` for assessment lessons; guard block-targeting ops |
| `mcp/src/tools/preview.ts` | Modify | Skip assessment lessons in render/analysis loops |
| `src/lib/assessment.ts` | Create | Leitner eligibility, weakness scoring, session generation |
| `src/hooks/useAssessmentProgress.ts` | Create | localStorage CRUD for Leitner progress + session history |
| `src/components/assessment/QuestionForm.tsx` | Create | Add/edit a single question inline form |
| `src/components/assessment/QuestionCard.tsx` | Create | Question bank list card |
| `src/components/assessment/JsonImport.tsx` | Create | JSON textarea import + validator |
| `src/components/assessment/AssessmentEditor.tsx` | Create | Orchestrates question bank editor |
| `src/pages/AssessmentView.tsx` | Create | Full adaptive test experience |
| `mcp/src/tools/assessment.ts` | Create | New MCP tools for assessment lessons |
| `mcp/src/index.ts` | Modify | Register `registerAssessmentTools` |

---

## Task 1: Add discriminated union to `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts:111-112` (Lesson type and lessonSchema)

- [ ] **Step 1: Replace the `Lesson` type and add assessment types**

After line 109 (closing `| AudioBlock;`), find and replace lines 111–112:

```typescript
// REMOVE:
export type Lesson = { id: string; title: string; blocks: Block[] };
export type Course = { schemaVersion: 1; title: string; lessons: Lesson[] };
```

Replace with:

```typescript
export type AssessmentQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

export type AssessmentConfig = {
  passingScore?: number;
  examSize?: number;
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
export type Course = { schemaVersion: 1; title: string; lessons: Lesson[] };
```

- [ ] **Step 2: Update `lessonSchema`**

Find lines 236–246 (the existing `lessonSchema` and `courseSchema`) and replace:

```typescript
// REMOVE:
export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});

export const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
});
```

Replace with:

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

export const lessonSchema = z.discriminatedUnion("kind", [
  contentLessonSchema,
  assessmentLessonSchema,
]);

export const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
});
```

- [ ] **Step 3: Update `defaultLesson` in `Editor.tsx` (line 18–26)**

The `defaultLesson` constant at the top of `src/pages/Editor.tsx` creates a `Lesson` without a `kind`. Add it:

```typescript
const defaultLesson: ContentLesson = {
  kind: "content",
  id: uid(),
  title: "Welcome",
  blocks: [
    { id: uid(), type: "heading", text: "Welcome to My Course" },
    { id: uid(), type: "text", text: "This welcome page introduces your course. Use the Table of Contents below to jump to any lesson." },
    { id: uid(), type: "toc" as any },
  ],
};
```

Also update the import on line 14 to include the new types:
```typescript
import { Block, ContentLesson, AssessmentLesson, Lesson, uid } from "@/types/course";
```

- [ ] **Step 4: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | head -60
```

Expected: TypeScript errors in files that still use the old `Lesson` type without a `kind` field. This is expected — the guards come in the next tasks. The types file itself should compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/types/course.ts src/pages/Editor.tsx
git commit -m "feat(types): add AssessmentLesson discriminated union to Lesson type"
```

---

## Task 2: Update MCP mirror types (`mcp/src/lib/types.ts`)

**Files:**
- Modify: `mcp/src/lib/types.ts:110-111` (Lesson type and lessonSchema)

- [ ] **Step 1: Apply the same Lesson type changes**

In `mcp/src/lib/types.ts`, find the Lesson and Course types (lines 110–111) and replace:

```typescript
// REMOVE:
export type Lesson = { id: string; title: string; blocks: Block[] };
export type Course = { schemaVersion: 1; title: string; lessons: Lesson[] };
```

Add the same assessment types and update, identical to Task 1 Step 1.

- [ ] **Step 2: Update `lessonSchema` in `mcp/src/lib/types.ts`**

Find lines 243–253 (lessonSchema and courseSchema) and replace with the same discriminated union schema from Task 1 Step 2.

- [ ] **Step 3: Build check**

```bash
cd /Users/theonavarro/TideLearn/mcp && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add mcp/src/lib/types.ts
git commit -m "feat(mcp/types): mirror AssessmentLesson discriminated union"
```

---

## Task 3: Migration shim in `src/lib/courses.ts`

**Files:**
- Modify: `src/lib/courses.ts`

All existing lessons in localStorage lack a `kind` field. This task adds a read-time shim and updates lesson creation to include `kind: "content"`.

- [ ] **Step 1: Add `migrateLessons` helper and apply it in `loadCourse`**

After the import block at the top of `src/lib/courses.ts`, add:

```typescript
import type { ContentLesson } from "@/types/course";
```

After the `LEGACY_MIGRATED_KEY` constant, add:

```typescript
/** Adds kind: "content" to any lesson that is missing it. Safe to call multiple times. */
function migrateLessons(course: Course): Course {
  return {
    ...course,
    lessons: course.lessons.map((l: any) =>
      l.kind ? l : { ...l, kind: "content" }
    ) as Course["lessons"],
  };
}
```

Then update `loadCourse` (line 34) to apply the shim:

```typescript
export function loadCourse(id: string): Course | null {
  try {
    const raw = localStorage.getItem(COURSE_KEY(id));
    if (!raw) return null;
    return migrateLessons(JSON.parse(raw) as Course);
  } catch {
    return null;
  }
}
```

Also update `migrateFromLegacy` (line 104) — replace:
```typescript
    lessons: parsed.lessons as Lesson[],
```
with:
```typescript
    lessons: (parsed.lessons as any[]).map((l: any) =>
      l.kind ? l : { ...l, kind: "content" }
    ) as Lesson[],
```

- [ ] **Step 2: Update `createNewCourse` welcome lesson to include `kind: "content"`**

In `createNewCourse` (line 83), update the `welcome` lesson:

```typescript
  const welcome: ContentLesson = {
    kind: "content",
    id: uid(),
    title: "Welcome",
    blocks: [
      { id: uid(), type: "heading", text: `Welcome to ${title}` } as HeadingBlock,
      { id: uid(), type: "text", text: "Write a short course description here." } as TextBlock,
      { id: uid(), type: "toc" } as TocBlock,
    ],
  };
```

- [ ] **Step 3: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/courses.ts
git commit -m "feat(courses): migration shim adds kind:'content' to legacy lessons on load"
```

---

## Task 4: Update validation schema (`src/validate/course.ts`)

**Files:**
- Modify: `src/validate/course.ts`

- [ ] **Step 1: Replace `lessonSchema` with discriminated union**

Replace the entire contents of `src/validate/course.ts`:

```typescript
import { z } from "zod"
import type { Course } from "@/types/course"

const blockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough()

const contentLessonSchema = z.object({
  kind: z.literal("content"),
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
}).passthrough()

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
}).passthrough()

const lessonSchema = z.discriminatedUnion("kind", [
  contentLessonSchema,
  assessmentLessonSchema,
])

const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
})

export function validateCourse(data: unknown): { ok: boolean; course?: Course; summary: string } {
  const parsed = courseSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, summary: parsed.error.errors.map(e => e.message).join("; ") }
  }
  return { ok: true, course: parsed.data as Course, summary: `${parsed.data.lessons.length} lessons` }
}
```

- [ ] **Step 2: Verify `mcp/src/lib/validate.ts` requires no changes**

`mcp/src/lib/validate.ts` imports `courseSchema` directly from `./types.js`:

```typescript
import { courseSchema, type Course } from "./types.js";
```

It has no internal `lessonSchema` — it delegates entirely to `courseSchema`. The discriminated union change in Task 2 (to `mcp/src/lib/types.ts`) is sufficient; no edits needed here. Confirm by reading the file — if it imports from types.js and has no local lessonSchema, skip this step.

- [ ] **Step 3: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
cd /Users/theonavarro/TideLearn/mcp && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/validate/course.ts
git commit -m "feat(validate): update lessonSchema to discriminated union"
```

---

## Task 5: Defensive guards — `src/lib/patch/engine.ts` and `src/lib/scorm12.ts`

**Files:**
- Modify: `src/lib/patch/engine.ts:53-98`
- Modify: `src/lib/scorm12.ts` (renderLesson function)

- [ ] **Step 1: Guard `appendBlocks`, `updateBlock`, `removeBlock` in `patch/engine.ts`**

In `handleOp`, the three block cases currently assume the lesson has `.blocks`. Add guards after the lesson lookup in each case:

```typescript
    case "appendBlocks": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`appendBlocks: lesson ${op.lessonId} not found`);
        return;
      }
      if (lesson.kind === "assessment") {
        report.warnings.push(`appendBlocks: lesson ${op.lessonId} is an assessment lesson — block operations not supported`);
        return;
      }
      // ... rest unchanged
    }
    case "updateBlock": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`updateBlock: lesson ${op.lessonId} not found`);
        return;
      }
      if (lesson.kind === "assessment") {
        report.warnings.push(`updateBlock: lesson ${op.lessonId} is an assessment lesson — block operations not supported`);
        return;
      }
      // ... rest unchanged
    }
    case "removeBlock": {
      const lesson = course.lessons.find((l) => l.id === op.lessonId);
      if (!lesson) {
        report.warnings.push(`removeBlock: lesson ${op.lessonId} not found`);
        return;
      }
      if (lesson.kind === "assessment") {
        report.warnings.push(`removeBlock: lesson ${op.lessonId} is an assessment lesson — block operations not supported`);
        return;
      }
      // ... rest unchanged
    }
```

- [ ] **Step 2: Guard `renderLesson` in `src/lib/scorm12.ts`**

In the embedded JavaScript string inside `buildScormIndexHtml` (around line 390), find `renderLesson`:

```javascript
  function renderLesson(idx) {
    var lesson = COURSE.lessons[idx];
    if (!lesson) return;
    currentIdx = idx;
    var html = '<h2>' + esc(lesson.title) + '</h2>';
    (lesson.blocks||[]).forEach(function(b){ html += renderBlock(b); });
```

Replace the blocks line with:

```javascript
    (lesson.kind === 'assessment' ? [] : (lesson.blocks||[])).forEach(function(b){ html += renderBlock(b); });
```

Also find the `renderCourseToHtml` equivalent in the static export (`exportStaticWebZip`) — it also has a `lesson.blocks.forEach` in the page HTML template string. Apply the same fix there.

- [ ] **Step 3: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/patch/engine.ts src/lib/scorm12.ts
git commit -m "fix(patch,scorm): guard block operations against assessment lessons"
```

---

## Task 6: Defensive guards — `src/pages/Editor.tsx` and `src/pages/View.tsx`

**Files:**
- Modify: `src/pages/Editor.tsx:103-124` (welcome sync effect), `src/pages/Editor.tsx:127` (addLesson)
- Modify: `src/pages/View.tsx:265-273` (quiz counting loop), `src/pages/View.tsx:705-713` (paged render), `src/pages/View.tsx:747-800` (view-all render)

- [ ] **Step 1: Guard the welcome sync effect in `Editor.tsx`**

Find the `useEffect` at line 103 (`// Keep the welcome heading in sync with the course title`). Add an early return if the first lesson is not a content lesson:

```typescript
  // Keep the welcome heading in sync with the course title
  useEffect(() => {
    setLessons((prev) => {
      if (!prev.length) return prev;
      const first = prev[0];
      // Assessment lessons don't have blocks — skip sync
      if (first.kind !== "content") return prev;
      const firstBlock: any = first.blocks[0];
      // ... rest of effect unchanged
```

- [ ] **Step 2: Add `kind: "content"` to `addLesson` in `Editor.tsx`**

Find `addLesson` (line 126):

```typescript
  const addLesson = () => {
    const newLesson: ContentLesson = {
      kind: "content",
      id: uid(),
      title: `Lesson ${lessons.length + 1}`,
      blocks: [],
    };
    setLessons(prev => [...prev, newLesson]);
    setSelectedLessonId(newLesson.id);
  };
```

- [ ] **Step 3: Guard the quiz-counting loop in `View.tsx`**

Find the `useEffect` at line 260 that counts quiz questions. It has:
```typescript
    for (const lesson of course.lessons) {
      for (const block of lesson.blocks) {
```

Replace with:
```typescript
    for (const lesson of course.lessons) {
      if (lesson.kind !== "content") continue;
      for (const block of lesson.blocks) {
```

- [ ] **Step 4: Guard the paged render in `View.tsx`**

Find the block render at line 705:
```tsx
                  {currentLesson.blocks.map((b) => {
```

Replace with:
```tsx
                  {currentLesson.kind === "content" && currentLesson.blocks.map((b) => {
```

And close the conditional after the `</article>`:
```tsx
                  })}
```
becomes:
```tsx
                  })}
                  {currentLesson.kind === "assessment" && (
                    <div style={{ padding: "24px 0", color: "#64748b", fontSize: 14 }}>
                      Assessment lesson — open the full view to take this assessment.
                    </div>
                  )}
```

- [ ] **Step 5: Guard the view-all render and quiz counting in `View.tsx`**

Find the `quizIds` line at ~line 747:
```typescript
                  const quizIds = l.blocks.filter(...).map(...);
```

Replace with:
```typescript
                  const quizIds = l.kind === "content"
                    ? l.blocks.filter((b: any) => ["quiz", "truefalse", "shortanswer"].includes((b as any).type)).map((b: any) => (b as any).id)
                    : [];
```

Find the blocks render at ~line 791:
```tsx
                            {l.blocks.map((b) => {
```

Replace with:
```tsx
                            {l.kind === "content" && l.blocks.map((b) => {
                              const spec = getSpec((b as any).type);
                              const ViewComp = spec.View as any;
                              return (
                                <article key={b.id}>
                                  <ViewComp block={b as any} />
                                </article>
                              );
                            })}
                            {l.kind === "assessment" && (
                              <div style={{ padding: "16px 0", color: "#64748b", fontSize: 14, fontStyle: "italic" }}>
                                Assessment: {(l as any).questions?.length ?? 0} questions — navigate to this lesson to take the assessment.
                              </div>
                            )}
```

- [ ] **Step 6: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

Expected: passes or has unrelated errors. No `.blocks` access on `Lesson` without a type guard should remain.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Editor.tsx src/pages/View.tsx
git commit -m "fix(editor,view): guard .blocks access for discriminated Lesson union"
```

---

## Task 7: Defensive guards — MCP tools

**Files:**
- Modify: `mcp/src/tools/lessons.ts`
- Modify: `mcp/src/tools/blocks.ts`
- Modify: `mcp/src/tools/semantic.ts`
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Update `add_lesson` and `list_lessons` in `lessons.ts`**

In `add_lesson` (line 38), add `kind: "content"` to the new lesson:
```typescript
        const newLesson = { id: lessonId, title, kind: "content" as const, blocks: [] };
```

Find `list_lessons` — it maps lessons to `{ id, title, position }`. Add `kind`:
```typescript
        return ok(lessons.map((l: any, i: number) => ({ id: l.id, title: l.title, kind: l.kind ?? "content", position: i + 1 })));
```

- [ ] **Step 2: Add assessment guards to all block ops in `blocks.ts`**

Each of the 6 block tools uses a `mutateCourse` callback that operates on lessons. Add a flag-check pattern to each. For `add_block`:

```typescript
    async ({ course_id, lesson_id, block, position }) =>
      withAuth(async (client, userId) => {
        // Validate block first (unchanged)
        const withId = { ...block, id: uid() };
        const parsed = blockSchema.safeParse(withId);
        if (!parsed.success) {
          return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");
        }
        const newBlock = parsed.data;
        const blockId = newBlock.id;

        // Check lesson type before mutating
        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if (targetLesson?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const blocks = [...(l as any).blocks];
              const idx = position ? Math.min(position - 1, blocks.length) : blocks.length;
              blocks.splice(idx, 0, newBlock);
              return { ...l, blocks };
            }),
          };
        });

        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
        if (mutError) return err(mutError, "Failed to add block");
        return ok({ block_id: blockId });
      })
```

Apply the same `assessmentError` flag pattern to `update_block`, `move_block`, `delete_block`, `list_blocks`, and `rewrite_blocks`.

For `list_blocks` (read-only but must still guard — assessment lessons have no blocks):

```typescript
        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find((l) => l.id === lesson_id);
          if (targetLesson?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return course; // read-only: no mutation needed
        });
        if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use list_questions instead.");
        // ... rest of list_blocks unchanged
```

For `move_block` (which has source and target lessons), check both: (which has source and target lessons), check both:

```typescript
        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const srcLesson = course.lessons.find(l => l.id === lesson_id);
          const tgtLesson = course.lessons.find(l => l.id === targetId);
          if (srcLesson?.kind === "assessment" || tgtLesson?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          // ... rest of move logic
```

For `rewrite_blocks` (targets multiple lessons), check all target lesson IDs before mutating:

```typescript
        let assessmentError: string | null = null;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          for (const [lessonId] of updateMap) {
            const lesson = course.lessons.find(l => l.id === lessonId);
            if (lesson?.kind === "assessment") {
              assessmentError = lessonId;
              return course;
            }
          }
          // ... rest of rewrite logic
```

- [ ] **Step 3: Fix `injectIds` and `injectLessonIds` in `semantic.ts`**

`injectIds` currently does `blocks: (l.blocks ?? []).map(...)` on every lesson — this would clobber `.questions` on assessment lessons. Fix:

```typescript
function injectIds(course: any) {
  return {
    ...course,
    lessons: (course.lessons ?? []).map((l: any) => {
      if (l.kind === "assessment") {
        return { ...l, id: uid() };
      }
      return {
        ...l,
        id: uid(),
        blocks: (l.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
      };
    }),
  };
}

function injectLessonIds(lesson: any) {
  if (lesson.kind === "assessment") {
    return { ...lesson, id: uid() };
  }
  return {
    ...lesson,
    id: uid(),
    blocks: (lesson.blocks ?? []).map((b: any) => ({ ...b, id: uid() })),
  };
}
```

- [ ] **Step 4: Guard block-targeting semantic ops**

For `replace_lesson`, `generate_lesson`, `generate_quiz_for_lesson`, `rewrite_block`, and `rewrite_lesson`, add a guard at the start of each `mutateCourse` callback using the same `assessmentError` flag pattern. Each checks if the target lesson has `kind === "assessment"` and returns the course unchanged if so.

```typescript
// Example for generate_quiz_for_lesson:
        let assessmentError = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const targetLesson = course.lessons.find(l => l.id === lesson_id);
          if (targetLesson?.kind === "assessment") {
            assessmentError = true;
            return course;
          }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : { ...l, blocks: [...(l as any).blocks, ...parsedBlocks] }
            ),
          };
        });
        if (assessmentError) return err("assessment_lesson", "generate_quiz_for_lesson cannot be used on assessment lessons. Use add_question instead.");
```

For `generate_lesson` — add a check after `injectLessonIds` that rejects `kind: "assessment"` in the provided `lesson_json`:

```typescript
        const withIds = injectLessonIds(lesson_json);
        if (withIds.kind === "assessment") {
          return err("assessment_lesson", "Use add_assessment_lesson to create assessment lessons, not generate_lesson.");
        }
```

- [ ] **Step 5: Update `preview.ts` to skip assessment lessons**

In `renderCourseToHtml`, replace the current `lesson.blocks.map(renderBlock)` line:

```typescript
export function renderCourseToHtml(course: Course): string {
  const lessonHtml = course.lessons
    .map((lesson, i) => {
      const contentHtml = (lesson as any).kind === "assessment"
        ? `<div style="background:#f0fdf4;padding:1em;border-radius:4px;border:1px solid #ccfbf1">
            <strong>Assessment lesson</strong> — ${(lesson as any).questions?.length ?? 0} questions
           </div>`
        : (lesson as any).blocks.map(renderBlock).join("\n");
      return `
      <section style="margin-bottom:2em;padding:1em;border:1px solid #e0e0e0;border-radius:6px">
        <h1 style="font-size:1.6em;margin:0 0 1em;border-bottom:2px solid #333;padding-bottom:0.25em">
          Lesson ${i + 1}: ${esc(lesson.title)}
        </h1>
        ${contentHtml}
      </section>`;
    })
    .join("\n");

  const contentLessons = course.lessons.filter(l => (l as any).kind !== "assessment");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${esc(course.title)}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2em auto;padding:0 1em;line-height:1.6;color:#222}</style>
  </head><body>
    <header style="margin-bottom:2em"><h1 style="font-size:2em">${esc(course.title)}</h1>
    <p>${course.lessons.length} lessons · ${contentLessons.reduce((n, l) => n + (l as any).blocks.length, 0)} blocks</p></header>
    ${lessonHtml}
  </body></html>`;
}
```

In `analyzeCourse`, skip assessment lessons from block-level analysis:

```typescript
  for (const lesson of course.lessons) {
    if ((lesson as any).kind === "assessment") {
      // Assessment lessons count as having assessments, skip block analysis
      const qCount = (lesson as any).questions?.length ?? 0;
      assessment_count += qCount;
      continue;
    }

    let hasAssessment = false;
    let hasMedia = false;

    for (const block of (lesson as any).blocks) {
      // ... rest of existing block analysis unchanged
```

- [ ] **Step 6: Build both packages**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
cd /Users/theonavarro/TideLearn/mcp && npm run build 2>&1 | grep "error TS" | head -20
```

Expected: clean builds.

- [ ] **Step 7: Commit**

```bash
git add mcp/src/tools/lessons.ts mcp/src/tools/blocks.ts mcp/src/tools/semantic.ts mcp/src/tools/preview.ts
git commit -m "fix(mcp): defensive guards for assessment lessons across all block/semantic/preview tools"
```

---

## Task 8: Assessment logic library

**Files:**
- Create: `src/lib/assessment.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { AssessmentQuestion } from "@/types/course";

export type QuestionProgress = {
  box: 1 | 2 | 3 | 4;
  testCount: number;
  correctCount: number;
  highConfidenceMisses: number;
  lastMissConfidence?: "low" | "med" | "high";
};

export type SessionRecord = {
  score: number;
  date: number;
  mode: "study" | "exam";
};

export type AssessmentProgress = {
  questions: Record<string, QuestionProgress>;
  sessionHistory: SessionRecord[];
};

/** Box eligibility: box 1 always, box 2 every 2nd testCount, box 3 every 4th, box 4 every 8th. */
export function isEligible(progress: QuestionProgress): boolean {
  const { box, testCount } = progress;
  if (box === 1) return true;
  if (box === 2) return testCount % 2 === 0;
  if (box === 3) return testCount % 4 === 0;
  return testCount % 8 === 0;
}

/** weaknessScore = incorrectRatio * boxWeight + highConfidenceMisses * 2 */
export function weaknessScore(p: QuestionProgress): number {
  if (p.testCount === 0) return 0;
  const incorrectRatio = (p.testCount - p.correctCount) / p.testCount;
  const boxWeight = ([4, 3, 2, 1] as const)[p.box - 1];
  return incorrectRatio * boxWeight + p.highConfidenceMisses * 2;
}

/** Returns questions eligible for a study session based on Leitner boxes. */
export function generateStudySession(
  questions: AssessmentQuestion[],
  progressMap: Record<string, QuestionProgress>
): AssessmentQuestion[] {
  return questions.filter((q) => {
    const p = progressMap[q.id];
    if (!p) return true; // never seen → always eligible (box 1)
    return isEligible(p);
  });
}

/** Returns up to `size` questions for an exam, source-balanced if tags present. */
export function generateExamSession(
  questions: AssessmentQuestion[],
  size: number
): AssessmentQuestion[] {
  const tagged = questions.filter((q) => q.source);
  const uniqueSources = new Set(tagged.map((q) => q.source));
  if (tagged.length > 0 && uniqueSources.size > 1) {
    return generateSourceBalanced(questions, size);
  }
  return shuffle(questions).slice(0, Math.min(size, questions.length));
}

function generateSourceBalanced(questions: AssessmentQuestion[], size: number): AssessmentQuestion[] {
  const bySource = new Map<string, AssessmentQuestion[]>();
  for (const q of questions) {
    const key = q.source ?? "__untagged__";
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(q);
  }
  const sources = Array.from(bySource.keys());
  const perSource = Math.floor(size / sources.length);
  const remainder = size % sources.length;
  const result: AssessmentQuestion[] = [];
  for (let i = 0; i < sources.length; i++) {
    const pool = shuffle(bySource.get(sources[i])!);
    const take = perSource + (i < remainder ? 1 : 0);
    result.push(...pool.slice(0, take));
  }
  return shuffle(result).slice(0, size);
}

/** Returns top N weakest questions by weaknessScore. Excludes never-seen questions. */
export function generateWeakAreaSession(
  questions: AssessmentQuestion[],
  progressMap: Record<string, QuestionProgress>,
  size = 20
): AssessmentQuestion[] {
  const scored = questions
    .filter((q) => (progressMap[q.id]?.testCount ?? 0) > 0)
    .map((q) => ({ q, score: weaknessScore(progressMap[q.id]) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(size, scored.length)).map((s) => s.q);
}

/** Advance Leitner box after an answer. Returns updated progress. */
export function advanceBox(
  current: QuestionProgress,
  correct: boolean,
  confidence?: "low" | "med" | "high"
): QuestionProgress {
  const next: QuestionProgress = { ...current, testCount: current.testCount + 1 };
  if (correct) {
    next.correctCount++;
    next.box = (Math.min(current.box + 1, 4) as 1 | 2 | 3 | 4);
  } else {
    next.box = 1;
    if (confidence) next.lastMissConfidence = confidence;
    if (confidence === "high") next.highConfidenceMisses = (next.highConfidenceMisses ?? 0) + 1;
  }
  return next;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Initialise a question's progress if not present. */
export function defaultQuestionProgress(): QuestionProgress {
  return { box: 1, testCount: 0, correctCount: 0, highConfidenceMisses: 0 };
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment.ts
git commit -m "feat(lib): assessment logic — Leitner eligibility, weakness scoring, session generation"
```

---

## Task 9: Progress hook

**Files:**
- Create: `src/hooks/useAssessmentProgress.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useCallback } from "react";
import type { QuestionProgress, AssessmentProgress, SessionRecord } from "@/lib/assessment";

export type { QuestionProgress, AssessmentProgress, SessionRecord };

const MAX_HISTORY = 20;

function storageKey(courseId: string, lessonId: string): string {
  return `tl_assess_${courseId}_${lessonId}`;
}

function load(courseId: string, lessonId: string): AssessmentProgress {
  try {
    const raw = localStorage.getItem(storageKey(courseId, lessonId));
    if (!raw) return { questions: {}, sessionHistory: [] };
    return JSON.parse(raw) as AssessmentProgress;
  } catch {
    return { questions: {}, sessionHistory: [] };
  }
}

function save(courseId: string, lessonId: string, progress: AssessmentProgress): void {
  try {
    localStorage.setItem(storageKey(courseId, lessonId), JSON.stringify(progress));
  } catch {}
}

export function useAssessmentProgress(courseId: string, lessonId: string) {
  const [progress, setProgress] = useState<AssessmentProgress>(() => load(courseId, lessonId));

  const updateQuestion = useCallback(
    (questionId: string, updater: (p: QuestionProgress) => QuestionProgress) => {
      setProgress((prev) => {
        const current: QuestionProgress = prev.questions[questionId] ?? {
          box: 1,
          testCount: 0,
          correctCount: 0,
          highConfidenceMisses: 0,
        };
        const next: AssessmentProgress = {
          ...prev,
          questions: { ...prev.questions, [questionId]: updater(current) },
        };
        save(courseId, lessonId, next);
        return next;
      });
    },
    [courseId, lessonId]
  );

  const addSession = useCallback(
    (record: SessionRecord) => {
      setProgress((prev) => {
        const history = [...prev.sessionHistory, record];
        if (history.length > MAX_HISTORY) history.shift();
        const next: AssessmentProgress = { ...prev, sessionHistory: history };
        save(courseId, lessonId, next);
        return next;
      });
    },
    [courseId, lessonId]
  );

  return { progress, updateQuestion, addSession };
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAssessmentProgress.ts
git commit -m "feat(hooks): useAssessmentProgress — localStorage CRUD for Leitner progress"
```

---

## Task 10: Question authoring components

**Files:**
- Create: `src/components/assessment/QuestionForm.tsx`
- Create: `src/components/assessment/QuestionCard.tsx`
- Create: `src/components/assessment/JsonImport.tsx`
- Create: `src/components/assessment/AssessmentEditor.tsx`

These components use inline styles — **no Tailwind classes**.

- [ ] **Step 1: Create `QuestionForm.tsx`**

```tsx
import { useState } from "react";
import { uid } from "@/types/course";
import type { AssessmentQuestion } from "@/types/course";

const BLOOM_OPTIONS = [
  { value: "K", label: "Knowledge" },
  { value: "C", label: "Comprehension" },
  { value: "UN", label: "Understanding" },
  { value: "AP", label: "Application" },
  { value: "AN", label: "Analysis" },
  { value: "EV", label: "Evaluation" },
] as const;

type Props = {
  initial?: AssessmentQuestion;
  onSave: (q: AssessmentQuestion) => void;
  onCancel: () => void;
};

export function QuestionForm({ initial, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial?.options ?? ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0);
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [bloomLevel, setBloomLevel] = useState<AssessmentQuestion["bloomLevel"]>(initial?.bloomLevel);
  const [source, setSource] = useState(initial?.source ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!text.trim()) { setError("Question text is required."); return; }
    if (options.some((o) => !o.trim())) { setError("All 4 options must be filled in."); return; }
    setError(null);
    onSave({
      id: initial?.id ?? uid(),
      text: text.trim(),
      options: options.map((o) => o.trim()) as [string, string, string, string],
      correctIndex,
      feedback: feedback.trim() || undefined,
      bloomLevel: bloomLevel || undefined,
      source: source.trim() || undefined,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1.5px solid #e0fdf4",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#0d2926",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Question *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Enter your question..."
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Options *</label>
        {options.map((opt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              style={{ accentColor: "#0d9488", flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, color: "#64748b", width: 14, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options] as [string, string, string, string];
                next[i] = e.target.value;
                setOptions(next);
              }}
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>Select the radio button next to the correct answer.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Feedback (optional)</label>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} style={inputStyle} placeholder="Shown after answer is revealed" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Source tag (optional)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} placeholder="e.g. Week 3 Reading" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Bloom's level (optional)</label>
        <select
          value={bloomLevel ?? ""}
          onChange={(e) => setBloomLevel((e.target.value as AssessmentQuestion["bloomLevel"]) || undefined)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">— none —</option>
          {BLOOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          {initial ? "Save changes" : "Add question"}
        </button>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "1.5px solid #e0fdf4", borderRadius: 7, color: "#64748b", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `QuestionCard.tsx`**

```tsx
import type { AssessmentQuestion } from "@/types/course";

type Props = {
  question: AssessmentQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
};

export function QuestionCard({ question, index, onEdit, onDelete }: Props) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e0fdf4",
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 8,
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", minWidth: 24, paddingTop: 2 }}>
        {index + 1}.
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2926", margin: "0 0 4px", lineHeight: 1.4 }}>
          {question.text}
        </p>
        <p style={{ fontSize: 11, color: "#0d9488", margin: 0 }}>
          ✓ {question.options[question.correctIndex]}
        </p>
        {(question.bloomLevel || question.source) && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {question.bloomLevel && (
              <span style={{ fontSize: 10, background: "#f0fdf4", color: "#0d9488", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                {question.bloomLevel}
              </span>
            )}
            {question.source && (
              <span style={{ fontSize: 10, background: "#f0f9ff", color: "#0891b2", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                {question.source}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{ background: "none", border: "1px solid #e0fdf4", borderRadius: 5, color: "#0d9488", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{ background: "none", border: "1px solid #fecaca", borderRadius: 5, color: "#ef4444", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `JsonImport.tsx`**

```tsx
import { useState } from "react";
import { uid } from "@/types/course";
import type { AssessmentQuestion } from "@/types/course";

type Props = {
  onImport: (questions: AssessmentQuestion[]) => void;
};

function parseQuestions(raw: string): { questions: AssessmentQuestion[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { questions: [], errors: ["Invalid JSON — check your syntax."] };
  }
  if (!Array.isArray(parsed)) {
    return { questions: [], errors: ["Expected a JSON array at the top level."] };
  }
  const questions: AssessmentQuestion[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i] as Record<string, unknown>;
    const rowErrors: string[] = [];
    if (!q.text || typeof q.text !== "string") rowErrors.push("missing text");
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== "string")) rowErrors.push("options must be an array of exactly 4 strings");
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) rowErrors.push("correctIndex must be 0–3");
    if (rowErrors.length > 0) {
      errors.push(`Question ${i + 1}: ${rowErrors.join("; ")}`);
      continue;
    }
    questions.push({
      id: uid(),
      text: q.text as string,
      options: q.options as [string, string, string, string],
      correctIndex: q.correctIndex as number,
      feedback: typeof q.feedback === "string" ? q.feedback : undefined,
      bloomLevel: typeof q.bloomLevel === "string" ? q.bloomLevel as AssessmentQuestion["bloomLevel"] : undefined,
      source: typeof q.source === "string" ? q.source : undefined,
    });
  }
  return { questions, errors };
}

export function JsonImport({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<AssessmentQuestion[] | null>(null);

  function handleValidate() {
    const { questions, errors } = parseQuestions(raw);
    setErrors(errors);
    setPreview(errors.length === 0 ? questions : null);
  }

  function handleImport() {
    if (!preview) return;
    onImport(preview);
    setRaw("");
    setPreview(null);
    setErrors([]);
    setOpen(false);
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "1.5px solid #e0fdf4", borderRadius: 7, color: "#0d9488", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
      >
        {open ? "▲ Hide JSON import" : "▼ Import from JSON"}
      </button>

      {open && (
        <div style={{ marginTop: 10, background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8, marginTop: 0 }}>
            Paste a JSON array. Required fields per question: <code>text</code>, <code>options</code> (4 strings), <code>correctIndex</code> (0–3). Optional: <code>feedback</code>, <code>bloomLevel</code>, <code>source</code>.
          </p>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setErrors([]); setPreview(null); }}
            rows={8}
            style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e0fdf4", borderRadius: 6, fontSize: 12, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
            placeholder='[{"text":"Question?","options":["A","B","C","D"],"correctIndex":0}]'
          />
          {errors.length > 0 && (
            <ul style={{ margin: "8px 0", padding: "0 0 0 16px", color: "#ef4444", fontSize: 12 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {preview && (
            <p style={{ fontSize: 12, color: "#0d9488", marginBottom: 8 }}>
              ✓ {preview.length} question{preview.length !== 1 ? "s" : ""} validated — ready to import.
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleValidate}
              style={{ background: "none", border: "1.5px solid #0d9488", borderRadius: 7, color: "#0d9488", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
            >
              Validate
            </button>
            {preview && (
              <button
                onClick={handleImport}
                style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
              >
                Import {preview.length} question{preview.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `AssessmentEditor.tsx`**

```tsx
import { useState } from "react";
import type { AssessmentLesson, AssessmentQuestion } from "@/types/course";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { JsonImport } from "./JsonImport";

type Props = {
  lesson: AssessmentLesson;
  onChange: (updated: AssessmentLesson) => void;
};

export function AssessmentEditor({ lesson, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  function update(changes: Partial<Omit<AssessmentLesson, "kind" | "id">>) {
    onChange({ ...lesson, ...changes });
  }

  function handleAdd(q: AssessmentQuestion) {
    update({ questions: [...lesson.questions, q] });
    setAddingNew(false);
  }

  function handleUpdate(q: AssessmentQuestion) {
    update({ questions: lesson.questions.map((existing) => existing.id === q.id ? q : existing) });
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this question?")) return;
    update({ questions: lesson.questions.filter((q) => q.id !== id) });
  }

  function handleImport(imported: AssessmentQuestion[]) {
    update({ questions: [...lesson.questions, ...imported] });
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#0d9488" };
  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1.5px solid #e0fdf4",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#0d2926",
    background: "#fff",
  };

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Config */}
      <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ ...labelStyle, display: "block", marginBottom: 4 }}>Passing score (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={lesson.config.passingScore ?? 80}
            onChange={(e) => update({ config: { ...lesson.config, passingScore: Number(e.target.value) } })}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <div>
          <label style={{ ...labelStyle, display: "block", marginBottom: 4 }}>Exam size (questions)</label>
          <input
            type="number"
            min={1}
            max={lesson.questions.length || 100}
            value={lesson.config.examSize ?? 20}
            onChange={(e) => update({ config: { ...lesson.config, examSize: Number(e.target.value) } })}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
        </p>
      </div>

      {/* Question bank */}
      <div style={{ marginBottom: 12 }}>
        {lesson.questions.map((q, i) =>
          editingId === q.id ? (
            <QuestionForm
              key={q.id}
              initial={q}
              onSave={handleUpdate}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              onEdit={() => setEditingId(q.id)}
              onDelete={() => handleDelete(q.id)}
            />
          )
        )}
      </div>

      {/* Add new */}
      {addingNew ? (
        <QuestionForm onSave={handleAdd} onCancel={() => setAddingNew(false)} />
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setAddingNew(true)}
            style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 18px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >
            + Add question
          </button>
        </div>
      )}

      <JsonImport onImport={handleImport} />
    </div>
  );
}
```

- [ ] **Step 5: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/assessment/
git commit -m "feat(assessment): question bank editor components — form, card, JSON import, orchestrator"
```

---

## Task 11: AssessmentView page

**Files:**
- Create: `src/pages/AssessmentView.tsx`

This is the full adaptive test experience. It renders as a full-screen overlay within View.tsx.

- [ ] **Step 1: Create `AssessmentView.tsx`**

```tsx
import { useState, useMemo } from "react";
import type { AssessmentLesson } from "@/types/course";
import {
  generateStudySession,
  generateExamSession,
  generateWeakAreaSession,
  advanceBox,
  shuffle,
} from "@/lib/assessment";
import { useAssessmentProgress } from "@/hooks/useAssessmentProgress";

type Screen = "home" | "study" | "exam" | "results" | "drill" | "notebook";

type Props = {
  lesson: AssessmentLesson;
  courseId: string;
};

export function AssessmentView({ lesson, courseId }: Props) {
  const { progress, updateQuestion, addSession } = useAssessmentProgress(courseId, lesson.id);
  const [screen, setScreen] = useState<Screen>("home");
  const [queue, setQueue] = useState<typeof lesson.questions>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState<"low" | "med" | "high" | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [mode, setMode] = useState<"study" | "exam">("study");

  const seenCount = Object.values(progress.questions).filter((p) => p.testCount > 0).length;
  const canDrill = seenCount >= 10;
  const examSize = lesson.config.examSize ?? 20;
  const passingScore = lesson.config.passingScore ?? 80;
  const lastSession = progress.sessionHistory[progress.sessionHistory.length - 1];

  function startStudy() {
    const q = generateStudySession(lesson.questions, progress.questions);
    if (q.length === 0) {
      alert("No questions are due for review right now. Come back after answering some!");
      return;
    }
    setQueue(shuffle(q));
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("study");
    setScreen("study");
  }

  function startExam() {
    const q = generateExamSession(lesson.questions, examSize);
    if (q.length === 0) {
      alert("No questions in the bank yet.");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("exam");
    setScreen("exam");
  }

  function startDrill() {
    const q = generateWeakAreaSession(lesson.questions, progress.questions, 20);
    if (q.length === 0) {
      alert("No weak-area data yet. Answer some questions first!");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("study");
    setScreen("drill");
  }

  const currentQ = queue[qIndex];

  function handleReveal() {
    if (selected === null) return;
    if (mode === "study" && confidence === null) return;
    setRevealed(true);
    const correct = selected === currentQ.correctIndex;
    if (correct) setSessionCorrect((n) => n + 1);
    updateQuestion(currentQ.id, (p) => advanceBox(p, correct, confidence ?? undefined));
  }

  function handleNext() {
    if (qIndex + 1 >= queue.length) {
      // sessionCorrect was already incremented in handleReveal when the last answer was correct.
      // Do NOT add (selected === currentQ.correctIndex ? 1 : 0) here — that double-counts.
      const score = Math.round((sessionCorrect / queue.length) * 100);
      addSession({ score, date: Date.now(), mode });
      setScreen("results");
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setConfidence(null);
    }
  }

  // Both useMemos must be at top level — Rules of Hooks forbids calling them inside conditionals.
  // resultsScore and bloomBreakdown are only *used* in the results screen, but must be declared here.
  const resultsScore = useMemo(() => {
    if (screen !== "results") return 0;
    return Math.round((sessionCorrect / queue.length) * 100);
  }, [screen, sessionCorrect, queue.length]);

  const bloomBreakdown = useMemo(() => {
    if (screen !== "results") return null;
    const tagged = queue.filter((q) => q.bloomLevel);
    if (tagged.length === 0) return null;
    const map: Record<string, { total: number; correct: number }> = {};
    for (const q of tagged) {
      const key = q.bloomLevel!;
      if (!map[key]) map[key] = { total: 0, correct: 0 };
      map[key].total++;
      const p = progress.questions[q.id];
      if (p && p.correctCount > 0) map[key].correct++;
    }
    return map;
  }, [screen, queue, progress]);

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily: "Inter, sans-serif",
  };

  const btnPrimary: React.CSSProperties = {
    background: "linear-gradient(135deg,#0d9488,#0891b2)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    padding: "10px 22px",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  const btnSecondary: React.CSSProperties = {
    background: "none",
    border: "1.5px solid #e0fdf4",
    borderRadius: 8,
    color: "#0d9488",
    fontSize: 14,
    fontWeight: 600,
    padding: "9px 20px",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  // ── Home ──────────────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 6 }}>
          Assessment
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0d2926", marginBottom: 4 }}>{lesson.title}</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
          {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
          {lastSession && ` · Last score: ${lastSession.score}%`}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          <button onClick={startStudy} style={btnPrimary}>Study (Leitner)</button>
          <button onClick={startExam} style={btnPrimary}>Exam Simulation</button>
          <button
            onClick={startDrill}
            disabled={!canDrill}
            style={{ ...btnSecondary, opacity: canDrill ? 1 : 0.4, cursor: canDrill ? "pointer" : "not-allowed" }}
          >
            Weak-Area Drill {!canDrill && `(answer ${10 - seenCount} more to unlock)`}
          </button>
          <button onClick={() => setScreen("notebook")} style={btnSecondary}>Mistake Notebook</button>
        </div>

        {progress.sessionHistory.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>
              Recent scores
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              {progress.sessionHistory.slice(-10).map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: 20,
                    height: Math.max(4, Math.round(s.score * 0.4)),
                    background: s.score >= passingScore ? "#14b8a6" : "#f87171",
                    borderRadius: 3,
                  }} />
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{s.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Study / Exam / Drill question screen ──────────────────────────────────
  if (screen === "study" || screen === "exam" || screen === "drill") {
    if (!currentQ) return null;
    const isStudy = mode === "study";
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            ← Back
          </button>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {qIndex + 1} / {queue.length}
          </span>
        </div>

        <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#0d2926", lineHeight: 1.55, margin: 0 }}>
            {currentQ.text}
          </p>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
          {currentQ.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === currentQ.correctIndex;
            let bg = "#fff", border = "1.5px solid #e0fdf4", color = "#334155";
            if (revealed && isCorrect) { bg = "#f0fdfb"; border = "1.5px solid #14b8a6"; color = "#0d9488"; }
            else if (isSelected) { bg = "#f8fffe"; border = "1.5px solid #5eead4"; color = "#0d9488"; }
            return (
              <li key={i} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => { if (!revealed) setSelected(i); }}
                  style={{ width: "100%", textAlign: "left", padding: "11px 14px", border, borderRadius: 8, background: bg, color, fontSize: 14, fontWeight: isSelected || (revealed && isCorrect) ? 600 : 400, cursor: revealed ? "default" : "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${color}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>

        {isStudy && !revealed && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Confidence before revealing:</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["low", "med", "high"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfidence(c)}
                  style={{ padding: "5px 14px", border: confidence === c ? "2px solid #0d9488" : "1.5px solid #e0fdf4", borderRadius: 6, background: confidence === c ? "#f0fdfb" : "#fff", color: confidence === c ? "#0d9488" : "#64748b", fontSize: 12, fontWeight: confidence === c ? 700 : 400, cursor: "pointer", fontFamily: "Inter,sans-serif", textTransform: "capitalize" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {revealed && currentQ.feedback && (
          <div style={{ background: "#f0fdfb", border: "1px solid #ccfbf1", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#0d2926" }}>
            {currentQ.feedback}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!revealed ? (
            <button
              onClick={handleReveal}
              disabled={selected === null || (isStudy && confidence === null)}
              style={{ ...btnPrimary, opacity: (selected === null || (isStudy && confidence === null)) ? 0.4 : 1, cursor: (selected === null || (isStudy && confidence === null)) ? "not-allowed" : "pointer" }}
            >
              Check answer
            </button>
          ) : (
            <button onClick={handleNext} style={btnPrimary}>
              {qIndex + 1 >= queue.length ? "Finish" : "Next →"}
            </button>
          )}
          {revealed && (
            <span style={{ fontSize: 13, fontWeight: 600, color: selected === currentQ.correctIndex ? "#0d9488" : "#ef4444" }}>
              {selected === currentQ.correctIndex ? "Correct!" : "Incorrect"}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  // bloomBreakdown and resultsScore are declared at top level above (Rules of Hooks).
  if (screen === "results") {
    const passed = resultsScore >= passingScore;

    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: passed ? "#0d9488" : "#ef4444", lineHeight: 1 }}>
            {resultsScore}%
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: passed ? "#0d9488" : "#ef4444", marginTop: 6 }}>
            {passed ? "Passed" : "Not yet"}
          </div>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            {sessionCorrect} of {queue.length} correct · Passing: {passingScore}%
          </p>
        </div>

        {bloomBreakdown && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              Bloom's level breakdown
            </p>
            {Object.entries(bloomBreakdown).map(([level, { total, correct }]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: "#0d9488" }}>{level}</span>
                <div style={{ flex: 1, height: 8, background: "#e0fdf4", borderRadius: 4 }}>
                  <div style={{ width: `${Math.round((correct / total) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#0d9488,#0891b2)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, color: "#64748b", width: 50, textAlign: "right" }}>{correct}/{total}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setScreen("home")} style={btnPrimary}>Back to home</button>
          <button onClick={() => setScreen("notebook")} style={btnSecondary}>Mistake Notebook</button>
        </div>
      </div>
    );
  }

  // ── Mistake Notebook ───────────────────────────────────────────────────────
  if (screen === "notebook") {
    const missed = lesson.questions.filter((q) => {
      const p = progress.questions[q.id];
      return p && p.testCount > p.correctCount;
    });
    const byConfidence: Record<string, typeof missed> = { high: [], med: [], low: [], unknown: [] };
    for (const q of missed) {
      const key = progress.questions[q.id]?.lastMissConfidence ?? "unknown";
      byConfidence[key].push(q);
    }

    return (
      <div style={containerStyle}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif", marginBottom: 20, display: "block" }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0d2926", marginBottom: 4 }}>Mistake Notebook</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
          {missed.length} question{missed.length !== 1 ? "s" : ""} with at least one incorrect answer
        </p>

        {missed.length === 0 && (
          <p style={{ color: "#0d9488", fontSize: 14 }}>No mistakes yet — keep it up!</p>
        )}

        {(["high", "med", "low", "unknown"] as const).map((conf) => {
          const qs = byConfidence[conf];
          if (!qs.length) return null;
          const labels = { high: "High confidence misses", med: "Medium confidence misses", low: "Low confidence misses", unknown: "Other misses" };
          return (
            <div key={conf} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                {labels[conf]}
              </p>
              {qs.map((q) => (
                <div key={q.id} style={{ background: "#fff", border: "1.5px solid #fecaca", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2926", margin: "0 0 6px" }}>{q.text}</p>
                  <p style={{ fontSize: 12, color: "#0d9488", margin: 0 }}>✓ {q.options[q.correctIndex]}</p>
                  {q.feedback && <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", fontStyle: "italic" }}>{q.feedback}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AssessmentView.tsx
git commit -m "feat(assessment): AssessmentView — home, study/exam/drill modes, results, mistake notebook"
```

---

## Task 12: Editor integration

**Files:**
- Modify: `src/pages/Editor.tsx`

The Editor needs: (1) a way to create assessment lessons, (2) a branch in the canvas area to render `AssessmentEditor` for assessment lessons.

- [ ] **Step 1: Import new types and components**

At the top of `Editor.tsx`, add to existing imports:

```typescript
import type { AssessmentLesson } from "@/types/course";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
```

- [ ] **Step 2: Add lesson type picker in `addLesson`**

Replace the `addLesson` function:

```typescript
  const addLesson = (kind: "content" | "assessment" = "content") => {
    const id = uid();
    const newLesson: Lesson = kind === "assessment"
      ? { kind: "assessment", id, title: `Assessment ${lessons.filter(l => l.kind === "assessment").length + 1}`, questions: [], config: { passingScore: 80, examSize: 20 } }
      : { kind: "content", id, title: `Lesson ${lessons.length + 1}`, blocks: [] };
    setLessons(prev => [...prev, newLesson]);
    setSelectedLessonId(id);
  };
```

Find where the "Add lesson" button is rendered in the sidebar (search for `addLesson` in the JSX). Replace or augment the button with a two-option control:

```tsx
<div style={{ display: "flex", gap: 4 }}>
  <button
    onClick={() => addLesson("content")}
    style={{ /* match existing add lesson button style */ }}
  >
    + Lesson
  </button>
  <button
    onClick={() => addLesson("assessment")}
    title="Add an adaptive assessment lesson"
    style={{ /* match existing style but shorter */ }}
  >
    + Assessment
  </button>
</div>
```

Read the existing add lesson button's exact style before writing this — match it precisely.

- [ ] **Step 3: Branch the canvas area**

In the canvas/block editor area of the JSX (where blocks are rendered for the selected lesson), find the block list render. Wrap it with a kind check:

```tsx
{selectedLesson.kind === "assessment" ? (
  <AssessmentEditor
    lesson={selectedLesson}
    onChange={(updated) => {
      setLessons(prev => prev.map(l => l.id === updated.id ? updated : l));
    }}
  />
) : (
  /* existing block canvas JSX */
)}
```

- [ ] **Step 4: Update the keyboard shortcut effect**

The `/` shortcut opens the block picker using `selectedLesson?.blocks.length`. Guard it:

```typescript
    if (!isTyping) {
      e.preventDefault();
      if (selectedLesson?.kind === "content") {
        setPickerState({ rowIndex: selectedLesson.blocks.length });
        setPickerSearch("");
      }
    }
```

- [ ] **Step 5: Add SCORM export note**

Find the publish modal in `Editor.tsx`. After the export buttons, add a conditional note:

```tsx
{lessons.some(l => l.kind === "assessment") && (
  <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>
    Assessment lessons are not included in exported packages.
  </p>
)}
```

- [ ] **Step 6: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "feat(editor): assessment lesson creation, AssessmentEditor canvas branch, SCORM note"
```

---

## Task 13: View.tsx integration

**Files:**
- Modify: `src/pages/View.tsx`

- [ ] **Step 1: Import `AssessmentView`**

```typescript
import { AssessmentView } from "@/pages/AssessmentView";
```

Also get the courseId from the URL params (it's already in the URL as `?id=`):

```typescript
const courseId = new URLSearchParams(window.location.search).get("id") ?? "";
```

- [ ] **Step 2: Branch in paged mode**

Find the block render in paged mode (around line 705). Replace the temporary placeholder added in Task 6 Step 4 with the real `AssessmentView`:

```tsx
                  {currentLesson.kind === "content" && currentLesson.blocks.map((b) => {
                    const spec = getSpec((b as any).type);
                    const ViewComp = spec.View as any;
                    return (
                      <article key={b.id}>
                        <ViewComp block={b as any} />
                      </article>
                    );
                  })}
                  {currentLesson.kind === "assessment" && (
                    <AssessmentView lesson={currentLesson} courseId={courseId} />
                  )}
```

- [ ] **Step 3: Build check**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 4: Verify in browser**

```bash
cd /Users/theonavarro/TideLearn && npm run dev
```

1. Open the editor
2. Create a new course → add an Assessment lesson → add 3+ questions via the form
3. Open the published view → navigate to the assessment lesson → verify the home screen appears
4. Click Study → answer questions → verify Leitner boxes advance
5. Click Exam Simulation → complete it → verify results screen with score
6. Return to editor → import questions via JSON (paste a valid 3-question JSON array) → verify they appear in the bank
7. Open a course with only content lessons → verify no crashes

- [ ] **Step 5: Commit**

```bash
git add src/pages/View.tsx
git commit -m "feat(view): render AssessmentView for assessment lessons in paged mode"
```

---

## Task 14: MCP assessment tools

**Files:**
- Create: `mcp/src/tools/assessment.ts`
- Modify: `mcp/src/index.ts`

- [ ] **Step 1: Create `mcp/src/tools/assessment.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

export function registerAssessmentTools(server: McpServer) {
  // ── add_assessment_lesson ─────────────────────────────────────────────────
  server.tool(
    "add_assessment_lesson",
    "Add a new assessment lesson (adaptive practice test) to a course. Assessment lessons hold a question bank, not content blocks.",
    {
      course_id: z.string().uuid(),
      title: z.string().min(1),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, title, position }) =>
      withAuth(async (client, userId) => {
        const lessonId = uid();
        const newLesson = {
          kind: "assessment" as const,
          id: lessonId,
          title,
          questions: [],
          config: { passingScore: 80, examSize: 20 },
        };
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, newLesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to add assessment lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  // ── list_questions ────────────────────────────────────────────────────────
  server.tool(
    "list_questions",
    "List all questions in an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();
        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lesson = (data.content as any).lessons?.find((l: any) => l.id === lesson_id);
        if (!lesson) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (lesson.kind !== "assessment") return err("not_assessment", "Lesson is not an assessment lesson");
        return ok((lesson.questions ?? []).map((q: any, i: number) => ({
          position: i + 1,
          id: q.id,
          text: q.text,
          correctIndex: q.correctIndex,
          bloomLevel: q.bloomLevel,
          source: q.source,
        })));
      })
  );

  // ── add_question ──────────────────────────────────────────────────────────
  server.tool(
    "add_question",
    "Add a question to an assessment lesson's question bank",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question: questionSchema,
    },
    async ({ course_id, lesson_id, question }) =>
      withAuth(async (client, userId) => {
        const questionId = uid();
        const newQuestion = { ...question, id: questionId };
        let notAssessment = false;
        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id);
          if (!lesson) { lessonNotFound = true; return course; }
          if ((lesson as any).kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: [...((l as any).questions ?? []), newQuestion],
              }
            ),
          };
        });
        if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (notAssessment) return err("not_assessment", "Lesson is not an assessment lesson. Use add_block for content lessons.");
        if (mutError) return err(mutError, "Failed to add question");
        return ok({ question_id: questionId });
      })
  );

  // ── update_question ───────────────────────────────────────────────────────
  server.tool(
    "update_question",
    "Update a question in an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question_id: z.string().uuid(),
      fields: questionSchema.partial(),
    },
    async ({ course_id, lesson_id, question_id, fields }) =>
      withAuth(async (client, userId) => {
        let notFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
          if (!lesson || lesson.kind !== "assessment") { notFound = true; return course; }
          const qIdx = lesson.questions.findIndex((q: any) => q.id === question_id);
          if (qIdx === -1) { notFound = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: (l as any).questions.map((q: any, i: number) =>
                  i === qIdx ? { ...q, ...fields } : q
                ),
              }
            ),
          };
        });
        if (notFound) return err("not_found", `Question ${question_id} not found in lesson ${lesson_id}`);
        if (mutError) return err(mutError, "Failed to update question");
        return ok({ updated: true });
      })
  );

  // ── delete_question ───────────────────────────────────────────────────────
  server.tool(
    "delete_question",
    "Remove a question from an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id, question_id }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : {
              ...l,
              questions: ((l as any).questions ?? []).filter((q: any) => q.id !== question_id),
            }
          ),
        }));
        if (mutError) return err(mutError, "Failed to delete question");
        return ok({ deleted: true });
      })
  );

  // ── import_questions ──────────────────────────────────────────────────────
  server.tool(
    "import_questions",
    "Bulk-import questions into an assessment lesson. All questions are validated before any are committed — no partial imports.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      questions: z.array(questionSchema).min(1),
    },
    async ({ course_id, lesson_id, questions }) =>
      withAuth(async (client, userId) => {
        const withIds = questions.map((q) => ({ ...q, id: uid() }));
        let notAssessment = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
          if (!lesson || lesson.kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: [...((l as any).questions ?? []), ...withIds],
              }
            ),
          };
        });
        if (notAssessment) return err("not_assessment", "Target lesson is not an assessment lesson");
        if (mutError) return err(mutError, "Failed to import questions");
        return ok({ imported: withIds.length, question_ids: withIds.map((q) => q.id) });
      })
  );

  // ── update_assessment_config ──────────────────────────────────────────────
  server.tool(
    "update_assessment_config",
    "Update the config (passing score, exam size) for an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      passingScore: z.number().int().min(0).max(100).optional(),
      examSize: z.number().int().min(1).optional(),
    },
    async ({ course_id, lesson_id, passingScore, examSize }) =>
      withAuth(async (client, userId) => {
        if (passingScore === undefined && examSize === undefined) {
          return err("missing_fields", "At least one of passingScore or examSize must be provided");
        }
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id || (l as any).kind !== "assessment") return l;
            const config = { ...(l as any).config };
            if (passingScore !== undefined) config.passingScore = passingScore;
            if (examSize !== undefined) config.examSize = examSize;
            return { ...l, config };
          }),
        }));
        if (mutError) return err(mutError, "Failed to update assessment config");
        return ok({ updated: true });
      })
  );
}
```

- [ ] **Step 2: Register in `mcp/src/index.ts`**

Add to the imports:
```typescript
import { registerAssessmentTools } from "./tools/assessment.js";
```

After `registerMediaTools(server);`, add:
```typescript
registerAssessmentTools(server);
```

- [ ] **Step 3: Build MCP**

```bash
cd /Users/theonavarro/TideLearn/mcp && npm run build 2>&1 | grep "error TS" | head -20
```

Expected: clean.

- [ ] **Step 4: Final build check both packages**

```bash
cd /Users/theonavarro/TideLearn && npm run build
cd /Users/theonavarro/TideLearn/mcp && npm run build
```

Both should exit 0.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/assessment.ts mcp/src/index.ts
git commit -m "feat(mcp): assessment lesson tools — add/list/update/delete/import questions, update config"
```

---

## Done

Plan 4 complete. TideLearn now has a full `AssessmentLesson` lesson type with Leitner spaced-repetition study mode, exam simulation, weak-area drill, mistake notebook, session analytics, and a matching MCP tool suite. All existing content lesson functionality is guarded against accidentally operating on assessment lessons.
