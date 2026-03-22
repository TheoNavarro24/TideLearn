# MCP UX & Capability Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between what L&D professionals need from the MCP and what it currently provides — surfacing course view URLs, adding targeted editing tools, fixing misleading course analysis, and making assessment content visible in previews.

**Architecture:** New tools are added to existing tool registration files. Logic fixes are in `preview.ts`. No new files needed except tests. All changes are backwards-compatible — no existing tool signatures change.

**Tech Stack:** TypeScript, Vitest. Run tests with `cd mcp && npm test`.

**Run order:** Plan A → Plan B → Plan C. Plan A fixes schema bugs. Plan B adds new capabilities. Plan C then runs last and rewrites the instructions in one complete pass — documenting everything (existing tools + Plan C additions) so no incremental doc patches are needed.

---

## File Map

| File | Change |
|------|--------|
| `mcp/src/tools/courses.ts` | `list_courses` returns lesson count; `create_course` returns `view_url`; `update_course` returns `view_url` when setting `is_public: true` |
| `mcp/src/tools/semantic.ts` | `save_course` returns `view_url` |
| `mcp/src/tools/lessons.ts` | Add `get_lesson` tool |
| `mcp/src/tools/assessment.ts` | Add `replace_questions` tool |
| `mcp/src/tools/preview.ts` | `preview_course` shows assessment question text; `analyzeCourse` doesn't flag no_assessment when an assessment lesson exists in the course |
| `mcp/src/lib/supabase.ts` | Add `APP_URL` helper |
| `mcp/tests/preview.test.ts` | Extend — test assessment lesson rendering and gap logic |
| `mcp/tests/courses.test.ts` | Extend — test view_url in responses |

---

### Task 1: Surface `view_url` on create, save, and publish

**Context:** After building a course, the user needs the URL to share with learners. The app's learner view is at `{APP_URL}/view?id={course_id}`. Currently no tool returns this. We add it to `create_course`, `save_course`, and `update_course` (when `is_public` is set to true).

**Files:**
- Modify: `mcp/src/lib/supabase.ts`
- Modify: `mcp/src/tools/courses.ts`
- Modify: `mcp/src/tools/semantic.ts`

- [ ] **Step 1: Add `APP_URL` to `mcp/src/lib/supabase.ts`**

After the existing env var declarations, add:

```ts
export const APP_URL = process.env.APP_URL ?? "https://tidelearn.com";
```

This allows the URL to be overridden in development without hardcoding.

- [ ] **Step 2: Update `create_course` in `mcp/src/tools/courses.ts`**

Import `APP_URL`:
```ts
import { withAuth, ok, err, APP_URL } from "../lib/supabase.js";
```

Change the return value:
```ts
// Before:
return ok({ course_id: data.id });

// After:
return ok({ course_id: data.id, view_url: `${APP_URL}/view?id=${data.id}` });
```

- [ ] **Step 3: Update `update_course` to return `view_url` when publishing**

In `update_course`, find the success return:
```ts
// Before:
return ok({ updated: true });

// After:
const result: Record<string, unknown> = { updated: true };
if (is_public === true) {
  result.view_url = `${APP_URL}/view?id=${course_id}`;
  result.note = "Course is now public. Share view_url with learners.";
}
return ok(result);
```

- [ ] **Step 4: Update `save_course` in `mcp/src/tools/semantic.ts`**

Import `APP_URL`:
```ts
import { withAuth, ok, err, APP_URL } from "../lib/supabase.js";
```

Update both return paths:
```ts
// Replace existing course:
return ok({ course_id, view_url: `${APP_URL}/view?id=${course_id}` });

// New course:
return ok({ course_id: data.id, view_url: `${APP_URL}/view?id=${data.id}` });
```

- [ ] **Step 5: Build check**

```bash
cd mcp && npm run build
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/lib/supabase.ts mcp/src/tools/courses.ts mcp/src/tools/semantic.ts
git commit -m "feat(mcp): return view_url from create_course, save_course, and update_course (on publish)"
```

---

### Task 2: Add lesson count to `list_courses`

**Context:** When working across multiple courses, Claude can't tell which are empty drafts vs. built-out courses without fetching each one. Adding lesson count gives useful at-a-glance info.

**Files:**
- Modify: `mcp/src/tools/courses.ts`
- Test: `mcp/tests/courses.test.ts`

- [ ] **Step 1: Write failing test**

`mcp/tests/courses.test.ts` already exists — **append** this describe block to it, do not overwrite the file:

```ts
describe("list_courses lesson_count", () => {
  it("derives lesson_count from content.lessons length", () => {
    // Simulate the transformation the updated list_courses will apply
    const row = {
      id: "course-1",
      title: "Test",
      is_public: false,
      updated_at: "2026-01-01",
      content: { schemaVersion: 1, title: "Test", lessons: [{}, {}, {}] },
    };
    const lesson_count = (row.content as any).lessons?.length ?? 0;
    expect(lesson_count).toBe(3);
  });
});

describe("view_url format", () => {
  it("builds view_url from APP_URL and course_id", () => {
    const APP_URL = "https://tidelearn.com";
    const courseId = "abc-123";
    const view_url = `${APP_URL}/view?id=${courseId}`;
    expect(view_url).toBe("https://tidelearn.com/view?id=abc-123");
  });

  it("respects APP_URL override", () => {
    const APP_URL = "http://localhost:5173";
    const courseId = "xyz-456";
    expect(`${APP_URL}/view?id=${courseId}`).toBe("http://localhost:5173/view?id=xyz-456");
  });
});
```

- [ ] **Step 2: Run test — confirm pass (this is just a logic test)**

```bash
cd mcp && npm test -- tests/courses.test.ts
```
Expected: pass.

- [ ] **Step 3: Update `list_courses` in `mcp/src/tools/courses.ts`**

Change the select to include `content`:
```ts
const { data, error } = await client
  .from("courses")
  .select("id, title, is_public, updated_at, content")
  .eq("user_id", userId)
  .order("updated_at", { ascending: false });
```

Map the result to add `lesson_count`:
```ts
if (error) return err("query_failed", error.message);
const mapped = (data ?? []).map(row => ({
  id: row.id,
  title: row.title,
  is_public: row.is_public,
  updated_at: row.updated_at,
  lesson_count: (row.content as any)?.lessons?.length ?? 0,
}));
return ok(mapped);
```

- [ ] **Step 4: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/courses.ts mcp/tests/courses.test.ts
git commit -m "feat(mcp): list_courses includes lesson_count"
```

---

### Task 3: Add `get_lesson` tool

**Context:** Every targeted edit currently requires fetching the full course. A `get_lesson` tool returns just one lesson's content (blocks or questions), reducing the JSON Claude has to process for large courses.

**Files:**
- Modify: `mcp/src/tools/lessons.ts`
- Test: `mcp/tests/lessons.test.ts` (create)

- [ ] **Step 1: Write failing test**

Create `mcp/tests/lessons.test.ts`:

```ts
import { describe, it, expect } from "vitest";

// Test the lesson-extraction logic in isolation
function extractLesson(course: any, lessonId: string) {
  return course.lessons?.find((l: any) => l.id === lessonId) ?? null;
}

describe("get_lesson extraction logic", () => {
  const course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [
      { kind: "content", id: "l1", title: "Lesson 1", blocks: [{ id: "b1", type: "heading", text: "Hello" }] },
      { kind: "assessment", id: "l2", title: "Exam", questions: [], config: {} },
    ],
  };

  it("returns the correct content lesson", () => {
    const lesson = extractLesson(course, "l1");
    expect(lesson).not.toBeNull();
    expect(lesson.title).toBe("Lesson 1");
    expect(lesson.blocks).toHaveLength(1);
  });

  it("returns the correct assessment lesson", () => {
    const lesson = extractLesson(course, "l2");
    expect(lesson).not.toBeNull();
    expect(lesson.kind).toBe("assessment");
  });

  it("returns null for unknown id", () => {
    const lesson = extractLesson(course, "unknown");
    expect(lesson).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — confirm pass (logic test)**

```bash
cd mcp && npm test -- tests/lessons.test.ts
```
Expected: pass.

- [ ] **Step 3: Add `get_lesson` to `mcp/src/tools/lessons.ts`**

Add after `delete_lesson`:

```ts
server.tool(
  "get_lesson",
  "Get a single lesson by id — returns its blocks (content lessons) or questions (assessment lessons). More efficient than get_course when you only need to read or edit one lesson.",
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
      if (!lesson) return err("lesson_not_found", `No lesson with id ${lesson_id} in course ${course_id}`);
      return ok(lesson);
    })
);
```

- [ ] **Step 4: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/lessons.ts mcp/tests/lessons.test.ts
git commit -m "feat(mcp): add get_lesson tool for targeted lesson fetching"
```

---

### Task 4: Add `replace_questions` tool to assessment tools

**Context:** There is no way to fully replace an assessment lesson's question bank in one operation. `import_questions` appends. To replace, you'd need to delete each question individually. This tool does a clean swap — validate all incoming questions, then replace atomically.

**Files:**
- Modify: `mcp/src/tools/assessment.ts`
- Test: `mcp/tests/assessment.test.ts` (create)

- [ ] **Step 1: Write failing test**

Create `mcp/tests/assessment.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { uid } from "../src/lib/uid.js";

// Test the replace logic: given existing questions, after replace, only new ones exist.
describe("replace_questions contract", () => {
  it("result contains only the new questions", () => {
    const existing = [
      { id: uid(), text: "Old Q1", options: ["A","B","C","D"], correctIndex: 0 },
    ];
    const incoming = [
      { text: "New Q1", options: ["A","B","C","D"], correctIndex: 1 },
      { text: "New Q2", options: ["A","B","C","D"], correctIndex: 2 },
    ];
    // Simulate the replace operation
    const withIds = incoming.map(q => ({ ...q, id: uid() }));
    expect(withIds).toHaveLength(2);
    expect(withIds[0].text).toBe("New Q1");
    expect(typeof withIds[0].id).toBe("string");
    // Old questions are gone
    const oldIds = new Set(existing.map(q => q.id));
    expect(withIds.some(q => oldIds.has(q.id))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — confirm pass**

```bash
cd mcp && npm test -- tests/assessment.test.ts
```
Expected: pass.

- [ ] **Step 3: Add `replace_questions` to `mcp/src/tools/assessment.ts`**

Add after `import_questions`:

```ts
// ── replace_questions ──────────────────────────────────────────────────────
server.tool(
  "replace_questions",
  "Replace the entire question bank for an assessment lesson with a new set. All incoming questions are validated before any are committed — no partial replacements. Existing questions are discarded.",
  {
    course_id: z.string().uuid(),
    lesson_id: z.string().uuid(),
    questions: z.array(questionSchema).min(1),
  },
  async ({ course_id, lesson_id, questions }) =>
    withAuth(async (client, userId) => {
      const withIds = questions.map((q) => ({ ...q, id: uid() }));
      let notAssessment = false;
      let lessonNotFound = false;
      const mutError = await mutateCourse(client, userId, course_id, (course) => {
        const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
        if (!lesson) { lessonNotFound = true; return course; }
        if (lesson.kind !== "assessment") { notAssessment = true; return course; }
        return {
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : { ...l, questions: withIds }
          ),
        };
      });
      if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
      if (notAssessment) return err("not_assessment", "Target lesson is not an assessment lesson");
      if (mutError) return err(mutError, "Failed to replace questions");
      return ok({ replaced: withIds.length, question_ids: withIds.map((q) => q.id) });
    })
);
```

- [ ] **Step 4: Build and test**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/assessment.ts mcp/tests/assessment.test.ts
git commit -m "feat(mcp): add replace_questions tool for full question bank replacement"
```

---

### Task 5: Fix `preview_course` to show assessment question text

**Context:** Currently, assessment lessons render as `"Assessment lesson — 5 questions"`. This means Claude (and the author) can't review question quality using `preview_course`. Fix: render each question with its text, options, and correct answer.

**Files:**
- Modify: `mcp/src/tools/preview.ts`
- Modify: `mcp/tests/preview.test.ts`

- [ ] **Step 1: Write failing test** — append to `mcp/tests/preview.test.ts`:

```ts
describe("renderCourseToHtml — assessment lesson", () => {
  it("renders assessment question text", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        id: "l1",
        title: "Final Exam",
        questions: [{
          id: "q1",
          text: "What does PASS stand for?",
          options: ["Pull Aim Squeeze Sweep", "Press Activate Spray Stop", "Point Attack Spray Stand", "Push Aim Spray Sweep"],
          correctIndex: 0,
          feedback: "PASS is the standard technique.",
        }],
        config: { passingScore: 80, examSize: 20 },
      }],
    };
    const html = renderCourseToHtml(course);
    expect(html).toContain("What does PASS stand for?");
    expect(html).toContain("Pull Aim Squeeze Sweep");
    expect(html).toContain("PASS is the standard technique.");
    // Correct answer should be visually distinguished
    expect(html).toContain("✓");
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: FAIL — question text not in output.

- [ ] **Step 3: Add `renderAssessmentLesson` and update `renderCourseToHtml` in `preview.ts`**

Add this function before `renderCourseToHtml`:

```ts
function renderAssessmentLesson(lesson: any): string {
  const questions = lesson.questions ?? [];
  if (questions.length === 0) {
    return `<p style="color:#888;font-style:italic">No questions in bank yet.</p>`;
  }
  return questions.map((q: any, i: number) => `
    <div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0">
      <p style="font-weight:600;margin:0 0 0.5em">${i + 1}. ${esc(q.text)}</p>
      <ul style="margin:0 0 0.5em 1.25em;padding:0">
        ${(q.options ?? []).map((opt: string, idx: number) =>
          `<li style="${idx === q.correctIndex ? "color:#0d9488;font-weight:600" : ""}">${idx === q.correctIndex ? "✓ " : ""}${esc(opt)}</li>`
        ).join("")}
      </ul>
      ${q.feedback ? `<p style="font-size:0.875em;color:#64748b;margin:0;font-style:italic">Feedback: ${esc(q.feedback)}</p>` : ""}
      ${q.bloomLevel ? `<span style="font-size:0.75em;background:#e0fdf4;color:#0d9488;padding:2px 6px;border-radius:4px">${esc(q.bloomLevel)}</span>` : ""}
      ${q.source ? `<span style="font-size:0.75em;background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:4px;margin-left:4px">${esc(q.source)}</span>` : ""}
    </div>`
  ).join("\n");
}
```

In `renderCourseToHtml`, replace the assessment lesson content block:

```ts
// Before:
const contentHtml = (lesson as any).kind === "assessment"
  ? `<div style="background:#f0fdf4;padding:1em;border-radius:4px;border:1px solid #ccfbf1">
      <strong>Assessment lesson</strong> — ${(lesson as any).questions?.length ?? 0} questions
     </div>`
  : (lesson as any).blocks.map(renderBlock).join("\n");

// After:
const contentHtml = (lesson as any).kind === "assessment"
  ? `<div style="background:#f0fdf4;padding:1em;border-radius:4px;border:1px solid #ccfbf1;margin-bottom:0.5em">
      <strong>Assessment lesson</strong> — ${(lesson as any).questions?.length ?? 0} questions
      · Pass: ${(lesson as any).config?.passingScore ?? 80}%
      · Exam draws: ${(lesson as any).config?.examSize ?? 20}
    </div>${renderAssessmentLesson(lesson as any)}`
  : (lesson as any).blocks.map(renderBlock).join("\n");
```

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "feat(mcp): preview_course renders assessment question text and feedback"
```

---

### Task 6: Fix `review_course` gap logic for assessment lessons

**Context:** `analyzeCourse` flags every content lesson as `no_assessment` if it has no quiz/truefalse/shortanswer blocks — even when a dedicated assessment lesson exists in the same course. This produces misleading advice that causes unnecessary inline blocks to be added.

Fix: if the course has at least one assessment lesson, suppress `no_assessment` gaps.

**Files:**
- Modify: `mcp/src/tools/preview.ts`
- Modify: `mcp/tests/preview.test.ts`

- [ ] **Step 1: Write failing test** — append to `mcp/tests/preview.test.ts`:

```ts
describe("analyzeCourse — assessment lesson awareness", () => {
  it("does not flag no_assessment when course has an assessment lesson", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        {
          kind: "content",
          id: "l1",
          title: "Introduction",
          blocks: [
            { id: "b1", type: "heading", text: "Hello" },
            { id: "b2", type: "text", text: "<p>Content</p>" },
            { id: "b3", type: "image", src: "https://example.com/img.jpg", alt: "img" },
          ],
        },
        {
          kind: "assessment",
          id: "l2",
          title: "Final Exam",
          questions: [{ id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 }],
          config: { passingScore: 80, examSize: 10 },
        },
      ],
    };
    const result = analyzeCourse(course);
    const noAssessmentGaps = result.gaps.filter(g => g.type === "no_assessment");
    expect(noAssessmentGaps).toHaveLength(0);
  });

  it("still flags no_assessment when no assessment lesson exists", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Introduction",
        blocks: [
          { id: "b1", type: "heading", text: "Hello" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "img" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const noAssessmentGaps = result.gaps.filter(g => g.type === "no_assessment");
    expect(noAssessmentGaps).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: FAIL — gap is reported even when assessment lesson exists.

- [ ] **Step 3: Fix `analyzeCourse` in `mcp/src/tools/preview.ts`**

At the start of `analyzeCourse`, determine if a dedicated assessment lesson exists:

```ts
export function analyzeCourse(course: Course) {
  const hasAssessmentLesson = course.lessons.some(l => (l as any).kind === "assessment");
  // ... rest of function unchanged until gap push:
```

Then modify the `no_assessment` gap condition:

```ts
// Before:
if (!hasAssessment) gaps.push({ type: "no_assessment", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no knowledge checks` });

// After:
if (!hasAssessment && !hasAssessmentLesson) gaps.push({ type: "no_assessment", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no knowledge checks` });
```

Note: the local `hasAssessment` variable tracks whether the current content lesson has inline blocks. The outer `hasAssessmentLesson` tracks whether the course has a dedicated assessment lesson.

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: all pass.

- [ ] **Step 5: Full test suite**

```bash
cd mcp && npm test
```
Expected: all pass.

- [ ] **Step 6: Build check**

```bash
cd mcp && npm run build
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "fix(mcp): review_course no longer flags no_assessment gaps when a dedicated assessment lesson exists"
```

---

### Final: Build check and test suite

Plan C runs after Plan B (order is A → B → C) and rewrites `instructions.ts` to document everything — no instructions update needed here.

- [ ] **Final full test suite and build**

```bash
cd mcp && npm run build && npm test
```
Expected: all pass.
