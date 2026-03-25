# Phase 2B Tier 1 — AssessmentQuestion Discriminated Union

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `AssessmentQuestion` from a single MCQ shape to a proper discriminated union with `kind` field, without breaking existing courses or tests.

**Architecture:** Add `kind` to the TypeScript types and Zod schemas in both `src/types/course.ts` and `mcp/src/lib/types.ts`. Add a `migrateQuestions` shim to `src/lib/courses.ts` that runs alongside the existing `migrateLessons`. Narrow all `q.source` and `q.bloomLevel` usages to `kind === "mcq"`. The MCP `questionSchema` and all tools using it are updated to accept the full discriminated union. Existing MCQ questions in stored courses auto-upgrade via the permissive schema default + migration shim.

**Tech Stack:** TypeScript, Zod, Vitest (MCP tests only — frontend has no test setup)

---

## File Map

| File | Change |
|------|--------|
| `src/types/course.ts:204-212` | Replace flat `AssessmentQuestion` with `MCQQuestion \| ...` union (5 variants) |
| `src/types/course.ts:474-485` | Update `assessmentLessonSchema` questions array to discriminated union |
| `src/types/course.ts:603-605` | Update permissive `lessonSchemaPermissive` to use new permissive assessment lesson schema |
| `src/lib/courses.ts:34` | Add `migrateQuestions` function after `migrateLessons` |
| `src/lib/assessment.ts:56,67` | Narrow `q.source` access to `kind === "mcq"` |
| `src/pages/AssessmentView.tsx:130` | Narrow `q.bloomLevel` access to `kind === "mcq"` |
| `mcp/src/lib/types.ts:203-211` | Same union update as frontend types |
| `mcp/src/lib/types.ts:481-499` | Update MCP `assessmentLessonSchema` questions array |
| `mcp/src/tools/assessment.ts:7-14` | Replace flat `questionSchema` with discriminated union schema |
| `mcp/src/tools/assessment.ts:80-111` | Update `add_question` for union |
| `mcp/src/tools/assessment.ts:114-148` | Update `update_question` for union |
| `mcp/src/tools/assessment.ts:183-220` | Update `import_questions` for union |
| `mcp/src/tools/__tests__/question-schema.test.ts` | New — tests for all 5 question kind schemas |

---

### Task 1: Update TypeScript types in `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts:204-212`

Replace the existing flat `AssessmentQuestion` type (lines 204–212) with a discriminated union. The new types must be added **before** the `AssessmentConfig` type at line 214.

- [ ] **Step 1: Replace the AssessmentQuestion type block**

In `src/types/course.ts`, replace lines 204–212:

```typescript
// BEFORE:
export type AssessmentQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

// AFTER:
export type MCQQuestion = {
  kind: "mcq";
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

export type MultipleResponseQuestion = {
  kind: "multipleresponse";
  id: string;
  text: string;
  options: string[];
  correctIndices: number[];
  feedback?: string;
};

export type FillInBlankQuestion = {
  kind: "fillinblank";
  id: string;
  text: string;
  blanks: Array<{ id: string; acceptable: string[]; caseSensitive?: boolean }>;
  feedback?: string;
};

export type MatchingQuestion = {
  kind: "matching";
  id: string;
  text: string;
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pairs: Array<{ leftId: string; rightId: string }>;
  feedback?: string;
};

export type SortingQuestion = {
  kind: "sorting";
  id: string;
  text: string;
  buckets: Array<{ id: string; label: string }>;
  items: Array<{ id: string; text: string; bucketId: string }>;
  feedback?: string;
};

export type AssessmentQuestion =
  | MCQQuestion
  | MultipleResponseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | SortingQuestion;
```

- [ ] **Step 2: Run the frontend build to confirm no type errors**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Build fails with TypeScript errors on `assessmentLessonSchema` and anywhere `AssessmentQuestion` fields are accessed without narrowing. That's correct — we'll fix those next.

---

### Task 2: Update Zod schemas in `src/types/course.ts`

**Files:**
- Modify: `src/types/course.ts:474-485` (strict `assessmentLessonSchema`)
- Modify: `src/types/course.ts:603-605` (permissive variant)

- [ ] **Step 1: Replace the strict `assessmentLessonSchema` (lines 474–485)**

```typescript
// BEFORE:
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

// AFTER:
const mcqQuestionSchema = z.object({
  kind: z.literal("mcq"),
  id: z.string(),
  text: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

const multipleResponseQuestionSchema = z.object({
  kind: z.literal("multipleresponse"),
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()),
  correctIndices: z.array(z.number()),
  feedback: z.string().optional(),
});

const fillInBlankQuestionSchema = z.object({
  kind: z.literal("fillinblank"),
  id: z.string(),
  text: z.string(),
  blanks: z.array(z.object({
    id: z.string(),
    acceptable: z.array(z.string()),
    caseSensitive: z.boolean().optional(),
  })),
  feedback: z.string().optional(),
});

const matchingQuestionSchema = z.object({
  kind: z.literal("matching"),
  id: z.string(),
  text: z.string(),
  left: z.array(z.object({ id: z.string(), label: z.string() })),
  right: z.array(z.object({ id: z.string(), label: z.string() })),
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
  feedback: z.string().optional(),
});

const sortingQuestionSchema = z.object({
  kind: z.literal("sorting"),
  id: z.string(),
  text: z.string(),
  buckets: z.array(z.object({ id: z.string(), label: z.string() })),
  items: z.array(z.object({ id: z.string(), text: z.string(), bucketId: z.string() })),
  feedback: z.string().optional(),
});

// Permissive question schema: defaults kind to "mcq" for legacy questions
const assessmentQuestionSchemaPermissive = z.union([
  mcqQuestionSchema,
  multipleResponseQuestionSchema,
  fillInBlankQuestionSchema,
  matchingQuestionSchema,
  sortingQuestionSchema,
  // Legacy MCQ without kind field — default it
  z.object({
    id: z.string(),
    text: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number(),
  }).passthrough().transform((q: any) => ({ kind: "mcq" as const, ...q })),
]);

const assessmentLessonSchema = z.object({
  kind: z.literal("assessment"),
  id: z.string(),
  title: z.string(),
  questions: z.array(assessmentQuestionSchemaPermissive),
  config: z.object({}).passthrough(),
}).passthrough();
```

- [ ] **Step 2: Update the permissive lesson schema (line 603–605)**

The permissive lesson schema at lines 603–605 already references `assessmentLessonSchema`, which now handles legacy questions via its permissive question union. No change needed here — verify the line still reads:

```typescript
const lessonSchemaPermissive = z.discriminatedUnion("kind", [
  contentLessonSchemaPermissive, assessmentLessonSchema,
]);
```

If it does, no edit required. If it was changed, restore to this.

---

### Task 3: Add `migrateQuestions` to `src/lib/courses.ts`

**Files:**
- Modify: `src/lib/courses.ts:34` (insert after `migrateLessons`)

- [ ] **Step 1: Add `migrateQuestions` after the `migrateLessons` function (after line 34)**

```typescript
/** Adds kind: "mcq" to any assessment question missing it. Safe to call multiple times. */
function migrateQuestions(course: Course): Course {
  return {
    ...course,
    lessons: course.lessons.map((l: any) => {
      if (l.kind !== "assessment") return l;
      return {
        ...l,
        questions: (l.questions ?? []).map((q: any) =>
          q.kind ? q : { ...q, kind: "mcq" }
        ),
      };
    }) as Course["lessons"],
  };
}
```

- [ ] **Step 2: Update `loadCourse` to call `migrateQuestions` alongside `migrateLessons`**

In `loadCourse` (line 52–60), update the return:

```typescript
// BEFORE:
return migrateLessons(JSON.parse(raw) as Course);

// AFTER:
return migrateQuestions(migrateLessons(JSON.parse(raw) as Course));
```

---

### Task 4: Fix `q.source` and `q.bloomLevel` narrowing in `src/lib/assessment.ts`

**Files:**
- Modify: `src/lib/assessment.ts:56-57` (`generateExamSession`)
- Modify: `src/lib/assessment.ts:64-68` (`generateSourceBalanced`)

- [ ] **Step 1: Update `generateExamSession` to narrow to MCQ before accessing `source`**

```typescript
// BEFORE (line 56-57):
const tagged = questions.filter((q) => q.source);
const uniqueSources = new Set(tagged.map((q) => q.source));

// AFTER:
const tagged = questions.filter((q) => q.kind === "mcq" && q.source);
const uniqueSources = new Set(tagged.map((q) => (q as any).source as string));
```

- [ ] **Step 2: Update `generateSourceBalanced` to narrow to MCQ**

```typescript
// BEFORE (line 67):
const key = q.source ?? "__untagged__";

// AFTER:
const key = (q.kind === "mcq" ? q.source : undefined) ?? "__untagged__";
```

- [ ] **Step 3: Run the frontend build**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Errors in `AssessmentView.tsx` on `bloomLevel` — fix next.

---

### Task 5: Fix `bloomBreakdown` in `src/pages/AssessmentView.tsx`

**Files:**
- Modify: `src/pages/AssessmentView.tsx:128-140`

- [ ] **Step 1: Narrow bloom breakdown to MCQ questions only**

```typescript
// BEFORE (lines 128-140):
const bloomBreakdown = useMemo(() => {
  if (screen !== "results") return null;
  const tagged = queue.filter((q) => q.bloomLevel);
  if (tagged.length === 0) return null;
  const map: Record<string, { total: number; correct: number }> = {};
  for (const q of tagged) {
    const key = q.bloomLevel!;
    if (!map[key]) map[key] = { total: 0, correct: 0 };
    map[key].total++;
    if (sessionCorrectIds.has(q.id)) map[key].correct++;
  }
  return map;
}, [screen, queue, sessionCorrectIds]);

// AFTER:
const bloomBreakdown = useMemo(() => {
  if (screen !== "results") return null;
  const tagged = queue.filter((q): q is import("@/types/course").MCQQuestion =>
    q.kind === "mcq" && !!q.bloomLevel
  );
  if (tagged.length === 0) return null;
  const map: Record<string, { total: number; correct: number }> = {};
  for (const q of tagged) {
    const key = q.bloomLevel!;
    if (!map[key]) map[key] = { total: 0, correct: 0 };
    map[key].total++;
    if (sessionCorrectIds.has(q.id)) map[key].correct++;
  }
  return map;
}, [screen, queue, sessionCorrectIds]);
```

Also add `MCQQuestion` to the import at the top of the file:

```typescript
import type { AssessmentLesson, MCQQuestion } from "@/types/course";
```

- [ ] **Step 2: Run the frontend build**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build. If further type errors appear from `AssessmentView.tsx` MCQ-hardcoded render logic (e.g. `currentQ.correctIndex`, `currentQ.options`), add type assertions for now — those will be fixed in Tiers 2–4 when full kind-aware rendering is added. The minimal fix is:

In the study/exam/drill screen render (around line 92), change:
```typescript
const currentQ = queue[qIndex];
// Add after:
const currentQAsMcq = currentQ?.kind === "mcq" ? currentQ : null;
```

And replace all `currentQ.correctIndex` / `currentQ.options` / `currentQ.feedback` with `currentQAsMcq?.correctIndex` etc., with appropriate fallbacks. This preserves the MCQ render path for now — new question types render "Unsupported question type" until their tier adds proper renderers.

---

### Task 6: Update MCP types in `mcp/src/lib/types.ts`

**Files:**
- Modify: `mcp/src/lib/types.ts:203-211` (AssessmentQuestion type)
- Modify: `mcp/src/lib/types.ts:481-499` (assessmentLessonSchema)

- [ ] **Step 1: Replace the flat `AssessmentQuestion` type (lines 203–211)**

Replace with the same discriminated union types as the frontend (Task 1, Step 1). The MCP types mirror the frontend types exactly — copy the same type definitions.

- [ ] **Step 2: Update `assessmentLessonSchema` (lines 481–499)**

Add the same individual question schemas and permissive question union as in Task 2. The MCP schema must match the frontend schema exactly. Copy the schemas from Task 2, Step 1.

---

### Task 7: Update MCP `assessment.ts` question tools

**Files:**
- Modify: `mcp/src/tools/assessment.ts:7-14` (questionSchema)
- Modify: `mcp/src/tools/assessment.ts:80-111` (add_question)
- Modify: `mcp/src/tools/assessment.ts:114-148` (update_question)
- Modify: `mcp/src/tools/assessment.ts:183-220` (import_questions)

- [ ] **Step 1: Replace the flat `questionSchema` (lines 7–14) with a discriminated union**

```typescript
// Replace lines 7-14 with:
const mcqQuestionInputSchema = z.object({
  kind: z.literal("mcq"),
  text: z.string().min(1),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

const multipleResponseQuestionInputSchema = z.object({
  kind: z.literal("multipleresponse"),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndices: z.array(z.number().int().min(0)).min(2),
  feedback: z.string().optional(),
});

const fillInBlankQuestionInputSchema = z.object({
  kind: z.literal("fillinblank"),
  text: z.string().min(1),
  blanks: z.array(z.object({
    acceptable: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean().optional(),
  })).min(1),
  feedback: z.string().optional(),
});

const matchingQuestionInputSchema = z.object({
  kind: z.literal("matching"),
  text: z.string().min(1),
  left: z.array(z.object({ label: z.string().min(1) })).min(2),
  right: z.array(z.object({ label: z.string().min(1) })).min(2),
  pairs: z.array(z.object({ leftIndex: z.number().int().min(0), rightIndex: z.number().int().min(0) })).min(2),
  feedback: z.string().optional(),
});

const sortingQuestionInputSchema = z.object({
  kind: z.literal("sorting"),
  text: z.string().min(1),
  buckets: z.array(z.object({ label: z.string().min(1) })).min(2),
  items: z.array(z.object({ text: z.string().min(1), bucketIndex: z.number().int().min(0) })).min(2),
  feedback: z.string().optional(),
});

const questionInputSchema = z.discriminatedUnion("kind", [
  mcqQuestionInputSchema,
  multipleResponseQuestionInputSchema,
  fillInBlankQuestionInputSchema,
  matchingQuestionInputSchema,
  sortingQuestionInputSchema,
]);
```

Note: MCP input schemas use indexes (e.g. `bucketIndex`, `leftIndex`) rather than IDs — the tool injects IDs server-side. This avoids requiring Claude to generate UUIDs.

- [ ] **Step 2: Update `add_question` to use `questionInputSchema` and inject sub-item IDs**

Replace the `question: questionSchema` parameter with `question: questionInputSchema`.

Inside the handler, add ID injection before saving. Add a helper function `injectQuestionSubItemIds` above `registerAssessmentTools`:

```typescript
function injectQuestionSubItemIds(q: any): any {
  const withId = { ...q, id: uid() };
  switch (q.kind) {
    case "fillinblank":
      return {
        ...withId,
        blanks: (q.blanks ?? []).map((b: any, i: number) => ({
          ...b,
          id: uid(),
        })),
      };
    case "matching": {
      const leftWithIds = (q.left ?? []).map((item: any) => ({ ...item, id: uid() }));
      const rightWithIds = (q.right ?? []).map((item: any) => ({ ...item, id: uid() }));
      // Convert index-based pairs to id-based pairs
      const pairs = (q.pairs ?? []).map((p: any) => ({
        leftId: leftWithIds[p.leftIndex]?.id ?? uid(),
        rightId: rightWithIds[p.rightIndex]?.id ?? uid(),
      }));
      return { ...withId, left: leftWithIds, right: rightWithIds, pairs };
    }
    case "sorting": {
      const bucketsWithIds = (q.buckets ?? []).map((b: any) => ({ ...b, id: uid() }));
      const itemsWithIds = (q.items ?? []).map((item: any) => ({
        ...item,
        id: uid(),
        bucketId: bucketsWithIds[item.bucketIndex]?.id ?? uid(),
      }));
      return { ...withId, buckets: bucketsWithIds, items: itemsWithIds };
    }
    default:
      return withId;
  }
}
```

Update `add_question` handler:
```typescript
// BEFORE:
const questionId = uid();
const newQuestion = { ...question, id: questionId };

// AFTER:
const newQuestion = injectQuestionSubItemIds(question);
const questionId = newQuestion.id;
```

- [ ] **Step 3: Update `update_question` to use `questionInputSchema.partial()`**

Replace `fields: questionSchema.partial()` with `fields: questionInputSchema.partial()`.

The merge logic `{ ...q, ...fields }` continues to work since fields are partial updates.

- [ ] **Step 4: Update `import_questions` to use `z.array(questionInputSchema)`**

Replace `z.array(questionSchema)` with `z.array(questionInputSchema)`.

Update the bulk import to call `injectQuestionSubItemIds` on each question:
```typescript
// BEFORE:
const withIds = questions.map((q) => ({ ...q, id: uid() }));

// AFTER:
const withIds = questions.map((q) => injectQuestionSubItemIds(q));
```

- [ ] **Step 5: Update `list_questions` to show `kind` field**

In `list_questions`, update the map to include `kind`:
```typescript
return ok((lesson.questions ?? []).map((q: any, i: number) => ({
  position: i + 1,
  id: q.id,
  kind: q.kind ?? "mcq",
  text: q.text,
  ...(q.kind === "mcq" || !q.kind ? { correctIndex: q.correctIndex } : {}),
  bloomLevel: q.bloomLevel,
  source: q.source,
})));
```

- [ ] **Step 6: Update `add_question` tool description**

Update the tool description string to mention all 5 question types:

```
"Add a question to an assessment lesson's question bank. Supports 5 question kinds: mcq (4-option multiple choice), multipleresponse (select all that apply, ≥2 correct), fillinblank (fill in the gaps), matching (pair left to right), sorting (drag items into buckets). Set kind to select the type."
```

---

### Task 8: Write MCP tests

**Files:**
- Create: `mcp/src/tools/__tests__/question-schema.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// mcp/src/tools/__tests__/question-schema.test.ts
import { describe, it, expect } from "vitest";
// Import schemas once exported from assessment.ts — or test them via the types file

// Since the question input schemas are local to assessment.ts, we test via injectQuestionSubItemIds
// exported from assessment.ts. Add export to injectQuestionSubItemIds first.
import { injectQuestionSubItemIds } from "../assessment.js";

describe("injectQuestionSubItemIds", () => {
  it("mcq: injects top-level id only", () => {
    const q = { kind: "mcq", text: "Q", options: ["A","B","C","D"], correctIndex: 0 };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.kind).toBe("mcq");
  });

  it("fillinblank: injects id on each blank", () => {
    const q = {
      kind: "fillinblank", text: "The {{1}} is red.",
      blanks: [{ acceptable: ["sky"] }],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.blanks[0].id).toBeTruthy();
  });

  it("matching: injects ids on left+right, converts index pairs to id pairs", () => {
    const q = {
      kind: "matching", text: "Match them",
      left: [{ label: "A" }, { label: "B" }],
      right: [{ label: "1" }, { label: "2" }],
      pairs: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 1, rightIndex: 0 }],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.left[0].id).toBeTruthy();
    expect(result.right[0].id).toBeTruthy();
    expect(result.pairs[0].leftId).toBe(result.left[0].id);
    expect(result.pairs[0].rightId).toBe(result.right[1].id);
  });

  it("sorting: injects ids on buckets+items, converts bucketIndex to bucketId", () => {
    const q = {
      kind: "sorting", text: "Sort them",
      buckets: [{ label: "Even" }, { label: "Odd" }],
      items: [
        { text: "2", bucketIndex: 0 },
        { text: "3", bucketIndex: 1 },
      ],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.buckets[0].id).toBeTruthy();
    expect(result.items[0].bucketId).toBe(result.buckets[0].id);
    expect(result.items[1].bucketId).toBe(result.buckets[1].id);
  });

  it("multipleresponse: injects id only (options are plain strings)", () => {
    const q = {
      kind: "multipleresponse", text: "Select all",
      options: ["A", "B", "C"], correctIndices: [0, 2],
    };
    const result = injectQuestionSubItemIds(q);
    expect(result.id).toBeTruthy();
    expect(result.correctIndices).toEqual([0, 2]);
  });
});
```

Note: Before running, export `injectQuestionSubItemIds` from `assessment.ts`:
```typescript
export function injectQuestionSubItemIds(q: any): any {
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test -- question-schema`

Expected: FAIL — `injectQuestionSubItemIds` not exported yet.

- [ ] **Step 3: Export `injectQuestionSubItemIds` in `mcp/src/tools/assessment.ts`**

Change `function injectQuestionSubItemIds` to `export function injectQuestionSubItemIds`.

- [ ] **Step 4: Run tests again**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test -- question-schema`

Expected: All 5 tests PASS.

- [ ] **Step 5: Run full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`

Expected: All tests pass (238 existing + 5 new).

---

### Task 9: Frontend build verification

- [ ] **Step 1: Run frontend build**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build with no TypeScript errors.

- [ ] **Step 2: Run MCP build**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`

Expected: Clean build.

---

### Task 10: Commit

- [ ] **Commit**

```bash
cd /Users/theonavarro/TideLearn
git add src/types/course.ts src/lib/courses.ts src/lib/assessment.ts src/pages/AssessmentView.tsx \
  mcp/src/lib/types.ts mcp/src/tools/assessment.ts \
  mcp/src/tools/__tests__/question-schema.test.ts
git commit -m "feat(2b-tier1): AssessmentQuestion discriminated union migration

Add MCQQuestion | MultipleResponseQuestion | FillInBlankQuestion |
MatchingQuestion | SortingQuestion union. Legacy MCQ questions auto-migrate
via migrateQuestions shim in courses.ts. Narrow bloomLevel and source
access to kind==='mcq'. MCP add_question/update_question/import_questions
accept full union with index-to-id injection for sub-items."
```
