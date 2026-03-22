# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical and Important issues found in the post-assessment-feature code review audit, plus two minor quality improvements.

**Architecture:** Five targeted surgical fixes across three files (`AssessmentView.tsx`, `mcp/src/tools/assessment.ts`, `View.tsx`) and one cosmetic fix in `courses.ts`. No new abstractions, no new files. Each task is self-contained and independently testable.

**Tech Stack:** React 18, TypeScript, Vite; MCP server (Node/TypeScript); Zod for schema validation

---

## File Map

| File | What changes |
|------|-------------|
| `src/pages/AssessmentView.tsx` | Task 1 (bloomBreakdown bug) + Task 5 (replace alert()) |
| `mcp/src/tools/assessment.ts` | Task 2 (delete_question guard) |
| `src/pages/View.tsx` | Task 3 (hide title/mark-complete for assessment lessons) |
| `src/lib/courses.ts` | Task 4 (indentation cosmetic fix) |

---

## Task 1: Fix bloomBreakdown — per-session correctness (Critical)

**The bug:** `bloomBreakdown` in `AssessmentView.tsx:127` uses `p.correctCount > 0` (all-time cumulative) to decide if a question was answered correctly in the current session. A question answered wrong in session 2 still counts as correct on session 2's results screen if it was ever answered right before.

**The fix:** Track which question IDs were answered correctly this session via a `sessionCorrectIds` state Set. Reset it on session start; populate it in `handleReveal`; use it in `bloomBreakdown`.

**Files:**
- Modify: `src/pages/AssessmentView.tsx`

- [ ] **Step 1: Add `sessionCorrectIds` state**

In `AssessmentView`, add after the existing `sessionCorrect` state declaration (line 27):

```typescript
const [sessionCorrectIds, setSessionCorrectIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Reset `sessionCorrectIds` in all three session starters**

In `startStudy`, `startExam`, and `startDrill`, add `setSessionCorrectIds(new Set());` alongside the existing `setSessionCorrect(0)` reset call. Each function already has a block of `set*` calls — add the new line next to `setSessionCorrect(0)` in all three.

- [ ] **Step 3: Populate the set in `handleReveal`**

Replace the existing:
```typescript
if (correct) setSessionCorrect((n) => n + 1);
```
with:
```typescript
if (correct) {
  setSessionCorrect((n) => n + 1);
  setSessionCorrectIds((prev) => new Set([...prev, currentQ.id]));
}
```

- [ ] **Step 4: Fix `bloomBreakdown` to use session set**

In the `bloomBreakdown` useMemo, replace:
```typescript
const p = progress.questions[q.id];
if (p && p.correctCount > 0) map[key].correct++;
```
with:
```typescript
if (sessionCorrectIds.has(q.id)) map[key].correct++;
```

Also update the dependency array from `[screen, queue, progress]` to `[screen, queue, sessionCorrectIds]`.

- [ ] **Step 5: Verify the build passes**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors, successful build.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AssessmentView.tsx
git commit -m "fix(assessment): bloomBreakdown uses per-session correctness, not cumulative"
```

---

## Task 2: Fix `delete_question` missing lesson guard (Important)

**The bug:** `delete_question` in `mcp/src/tools/assessment.ts:159-173` uses an inline arrow function for `mutateCourse` that unconditionally maps over lessons, silently succeeding even if the `lesson_id` doesn't exist or the lesson isn't an assessment. Every other mutating tool (`add_question`, `update_question`, `import_questions`) has explicit flags for these cases.

**The fix:** Convert the inline `mutateCourse` callback to use the flag-variable pattern. Add `notFound` flag; set it when lesson is missing or not an assessment; return the error after mutation.

**Files:**
- Modify: `mcp/src/tools/assessment.ts:159-173`

- [ ] **Step 1: Rewrite `delete_question` with guard flags**

Replace the entire `delete_question` tool handler (from `async ({ course_id, lesson_id, question_id }) =>` through `return ok({ deleted: true });`) with:

```typescript
async ({ course_id, lesson_id, question_id }) =>
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
            questions: (l as any).questions.filter((q: any) => q.id !== question_id),
          }
        ),
      };
    });
    if (notFound) return err("not_found", `Question ${question_id} not found in lesson ${lesson_id}`);
    if (mutError) return err(mutError, "Failed to delete question");
    return ok({ deleted: true });
  })
```

- [ ] **Step 2: Verify the MCP build passes**

```bash
cd /Users/theonavarro/TideLearn/mcp && npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/assessment.ts
git commit -m "fix(mcp): delete_question guards against missing/non-assessment lesson"
```

---

## Task 3: Hide title and mark-complete for assessment lessons in View.tsx (Important)

**The issue:** `View.tsx` always renders the outer `<h1>` lesson title and the mark-complete toggle. `AssessmentView` has its own title and progress tracking; showing the outer title creates a duplicate, and mark-complete doesn't make semantic sense for assessment lessons (Leitner progress is the measure).

**The fix:** Conditionally suppress both elements when `currentLesson.kind === "assessment"`.

**Files:**
- Modify: `src/pages/View.tsx`

- [ ] **Step 1: Conditionally render the lesson title `<h1>`**

Wrap the `<h1>` block (around lines 694-704) in a condition. The current code is:

```typescript
{/* Lesson title */}
<h1 style={{
  fontFamily: "Lora, serif",
  ...
}}>
  {currentLesson.title}
</h1>
```

Change to:

```typescript
{/* Lesson title — hidden for assessment lessons (AssessmentView renders its own) */}
{currentLesson.kind !== "assessment" && (
  <h1 style={{
    fontFamily: "Lora, serif",
    fontSize: 28,
    fontWeight: 700,
    color: "#0d2926",
    lineHeight: 1.3,
    marginBottom: 32,
    letterSpacing: "-0.01em",
  }}>
    {currentLesson.title}
  </h1>
)}
```

- [ ] **Step 2: Conditionally render the mark-complete toggle**

Wrap the mark-complete `<div>` (around lines 721-742) in a condition:

```typescript
{/* Mark complete toggle — not shown for assessment lessons */}
{currentLesson.kind !== "assessment" && (
  <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
    ...existing button JSX...
  </div>
)}
```

- [ ] **Step 3: Verify the build passes**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/View.tsx
git commit -m "fix(view): hide title and mark-complete for assessment lessons"
```

---

## Task 4: Fix `migrateFromLegacy` indentation in courses.ts (Minor)

**The issue:** `src/lib/courses.ts:136-138` has a malformed arrow function body — the map callback and its closing `) as Lesson[]` are misindented relative to the surrounding code. Runtime is unaffected but it will confuse future editors.

**Files:**
- Modify: `src/lib/courses.ts`

- [ ] **Step 1: Fix the indentation**

Locate the `migrateFromLegacy` function (around line 134). The malformed section looks like:

```typescript
      lessons: (parsed.lessons as any[]).map((l: any) =>
      l.kind ? l : { ...l, kind: "content" }
    ) as Lesson[],
```

Fix to match the style of the `migrateLessons` function above it:

```typescript
      lessons: (parsed.lessons as any[]).map((l: any) =>
        l.kind ? l : { ...l, kind: "content" }
      ) as Lesson[],
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/courses.ts
git commit -m "fix(courses): fix indentation in migrateFromLegacy map callback"
```

---

## Task 5: Replace `alert()` with inline error state in AssessmentView (Minor)

**The issue:** Three `alert()` calls in `startStudy`, `startExam`, and `startDrill` block the main thread and can't be styled. An inline error message is more appropriate.

**Files:**
- Modify: `src/pages/AssessmentView.tsx`

- [ ] **Step 1: Add `errorMsg` state**

Add after the existing state declarations:

```typescript
const [errorMsg, setErrorMsg] = useState<string | null>(null);
```

- [ ] **Step 2: Replace the three `alert()` calls**

In `startStudy`, replace:
```typescript
alert("No questions are due for review right now. Come back after answering some!");
return;
```
with:
```typescript
setErrorMsg("No questions are due right now. Come back after answering some!");
return;
```

In `startExam`, replace:
```typescript
alert("No questions in the bank yet.");
return;
```
with:
```typescript
setErrorMsg("No questions in the bank yet.");
return;
```

In `startDrill`, replace:
```typescript
alert("No weak-area data yet. Answer some questions first!");
return;
```
with:
```typescript
setErrorMsg("No weak-area data yet. Answer some questions first!");
return;
```

Also clear the error when a session successfully starts — add `setErrorMsg(null);` just before each `setScreen(...)` call at the end of `startStudy`, `startExam`, and `startDrill`.

- [ ] **Step 3: Render the inline error message in the Home screen**

In the home screen JSX (`if (screen === "home")` block), add after the button group `<div>`:

```tsx
{errorMsg && (
  <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>
    {errorMsg}
  </p>
)}
```

- [ ] **Step 4: Verify the build passes**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AssessmentView.tsx
git commit -m "fix(assessment): replace alert() with inline error state on home screen"
```

---

## Out of Scope (noted, not fixed)

The following issues from the audit are acknowledged but excluded from this plan:

- **`(l as any).kind` casts in MCP tools** — type-safety improvement, no runtime impact. Fine for now.
- **`useAssessmentProgress` doesn't handle prop changes** — hypothetical edge case, not reachable in current UI.
- **Bloom taxonomy `C` vs `UN` code inconsistency** — data model question that requires a product decision before touching the question bank schema.
- **Missing `list_lessons` MCP tool** — `get_course` already surfaces `kind` per lesson; block tool error messages already say "Use add_question / update_question instead" which is correct. Low priority.
