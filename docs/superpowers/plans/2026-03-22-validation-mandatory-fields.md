# Validation & Mandatory Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce data quality by tightening Zod schemas, adding required field indicators, publish-time validation warnings, MCP review gaps, and MCP preview placeholders.

**Architecture:** Tighten canonical schemas (`blockSchema`) and create permissive variants for read paths (`View.tsx`). Write validation is the default; permissive read is opt-in. New `validateCourseBlocks()` utility for publish-time checks. MCP `update_block` gains post-merge validation.

**Tech Stack:** React, TypeScript, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-validation-mandatory-fields-design.md`

**Prerequisite:** Plans 1 and 2 must be implemented first — Plan 1 introduces FieldLabel with `required` prop (activated here), Plan 1 changes quiz factory to `correctIndex: -1`.

---

### Task 1: Tighten Zod schemas in frontend types

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Tighten all required string fields and arrays**

Apply these changes to `src/types/course.ts`:

```typescript
// headingBlockSchema
text: z.string()  →  text: z.string().min(1)

// textBlockSchema
text: z.string()  →  text: z.string().min(1)

// imageBlockSchema
src: z.string()   →  src: z.string().min(1)
alt: z.string()   →  alt: z.string().min(1)

// videoBlockSchema
url: z.string()   →  url: z.string().min(1)

// audioBlockSchema
src: z.string()   →  src: z.string().min(1)

// documentBlockSchema
src: z.string()   →  src: z.string().min(1)

// codeBlockSchema (in course.ts — note: no separate codeBlockSchema export, it's inline)
language: z.string()  →  language: z.string().min(1)
code: z.string()      →  code: z.string().min(1)

// quizBlockSchema
question: z.string()           →  question: z.string().min(1)
options: z.array(z.string())   →  options: z.array(z.string().min(1)).min(2)

// trueFalseBlockSchema
question: z.string()  →  question: z.string().min(1)

// shortAnswerBlockSchema
question: z.string()  →  question: z.string().min(1)
answer: z.string()    →  answer: z.string().min(1)

// quoteBlockSchema
text: z.string()  →  text: z.string().min(1)

// calloutBlockSchema
text: z.string()  →  text: z.string().min(1)

// listBlockSchema
items: z.array(z.string())  →  items: z.array(z.string().min(1)).min(1)

// accordionBlockSchema
items: z.array(z.object({ id: z.string(), title: z.string(), content: z.string() }))
→  items: z.array(z.object({ id: z.string(), title: z.string().min(1), content: z.string() })).min(1)

// tabsBlockSchema
items: z.array(z.object({ id: z.string(), label: z.string(), content: z.string() }))
→  items: z.array(z.object({ id: z.string(), label: z.string().min(1), content: z.string() })).min(1)
```

- [ ] **Step 2: Add permissive schema variants for read path**

After the strict `blockSchema` definition, add:

```typescript
// ── Permissive schemas for read path (View.tsx) ──────────────────────────────
// Same structure but accepts empty strings and empty arrays.
// Only used in View.tsx to load existing courses that may have empty fields.

const headingBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("heading"), text: z.string() });
const textBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("text"), text: z.string() });
const imageBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("image"), src: z.string(), alt: z.string() });
const quizBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("quiz"), question: z.string(),
  options: z.array(z.string()), correctIndex: z.number(),
  showFeedback: z.boolean().optional(), feedbackMessage: z.string().optional(),
});
const codeBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("code"), language: z.string(), code: z.string() });
const trueFalseBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("truefalse"), question: z.string(), correct: z.boolean(),
  showFeedback: z.boolean().optional(), feedbackCorrect: z.string().optional(), feedbackIncorrect: z.string().optional(),
});
const shortAnswerBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("shortanswer"), question: z.string(), answer: z.string(),
  acceptable: z.array(z.string()).optional(), caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(), showFeedback: z.boolean().optional(), feedbackMessage: z.string().optional(),
});
const listBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("list"), style: z.union([z.literal("bulleted"), z.literal("numbered")]), items: z.array(z.string()) });
const quoteBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("quote"), text: z.string(), cite: z.string().optional() });
const accordionBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("accordion"), items: z.array(z.object({ id: z.string(), title: z.string(), content: z.string() })) });
const tabsBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("tabs"), items: z.array(z.object({ id: z.string(), label: z.string(), content: z.string() })) });
const calloutBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("callout"), variant: z.union([z.literal("info"), z.literal("success"), z.literal("warning"), z.literal("danger")]), title: z.string().optional(), text: z.string() });
const videoBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("video"), url: z.string() });
const audioBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("audio"), src: z.string(), title: z.string().optional() });
const documentBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("document"), src: z.string(), fileType: z.union([z.literal("pdf"), z.literal("docx"), z.literal("xlsx"), z.literal("pptx")]), title: z.string().optional() });

export const blockSchemaPermissive = z.discriminatedUnion("type", [
  headingBlockSchemaPermissive, textBlockSchemaPermissive, imageBlockSchemaPermissive,
  quizBlockSchemaPermissive, codeBlockSchemaPermissive, trueFalseBlockSchemaPermissive,
  shortAnswerBlockSchemaPermissive, listBlockSchemaPermissive, quoteBlockSchemaPermissive,
  accordionBlockSchemaPermissive, tabsBlockSchemaPermissive, dividerBlockSchema, tocBlockSchema,
  calloutBlockSchemaPermissive, videoBlockSchemaPermissive, audioBlockSchemaPermissive,
  documentBlockSchemaPermissive,
]);

const contentLessonSchemaPermissive = z.object({
  kind: z.literal("content"), id: z.string(), title: z.string(),
  blocks: z.array(blockSchemaPermissive),
}).passthrough();

const lessonSchemaPermissive = z.discriminatedUnion("kind", [
  contentLessonSchemaPermissive, assessmentLessonSchema,
]);

export const courseSchemaPermissive = z.object({
  schemaVersion: z.literal(1), title: z.string(),
  lessons: z.array(lessonSchemaPermissive),
});
```

- [ ] **Step 3: Commit**

```bash
git add src/types/course.ts
git commit -m "feat: tighten Zod schemas with .min(1), add permissive variants for read path"
```

---

### Task 2: Tighten MCP schemas (must stay in sync)

**Files:**
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Apply identical schema changes as Task 1, Step 1**

Apply the exact same `.min(1)` changes to all block schemas in `mcp/src/lib/types.ts`. The changes are identical to Task 1 Step 1.

Note: MCP types do NOT need the permissive variants — those are frontend-only.

- [ ] **Step 2: Write failing test for strict validation**

Add to `mcp/tests/schema.test.ts`:

```typescript
import { blockSchema } from "../src/lib/types.js";

describe("strict block validation", () => {
  it("rejects heading with empty text", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "heading", text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with empty question", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "", options: ["A", "B"], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with fewer than 2 options", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A"], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with empty option strings", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A", ""], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts quiz with correctIndex -1", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A", "B"], correctIndex: -1 });
    expect(result.success).toBe(true);
  });

  it("rejects image with empty src", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "image", src: "", alt: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects list with no items", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "list", style: "bulleted", items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects accordion with empty title", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "accordion", items: [{ id: "i1", title: "", content: "x" }] });
    expect(result.success).toBe(false);
  });

  it("accepts accordion with empty content (content is optional-ish)", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "accordion", items: [{ id: "i1", title: "T", content: "" }] });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All tests pass (including new ones)

- [ ] **Step 4: Commit**

```bash
git add mcp/src/lib/types.ts mcp/tests/schema.test.ts
git commit -m "feat: tighten MCP Zod schemas, add strict validation tests"
```

---

### Task 3: View.tsx — use permissive schema

**Files:**
- Modify: `src/pages/View.tsx`

- [ ] **Step 1: Change import to use permissive schema**

Find the import:
```tsx
import { courseSchema } from "@/types/course";
```
or wherever `courseSchema` is imported, and change to:
```tsx
import { courseSchemaPermissive } from "@/types/course";
```

Then find every usage of `courseSchema.safeParse(` and change to `courseSchemaPermissive.safeParse(`.

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/View.tsx
git commit -m "feat: View.tsx uses permissive schema for backwards-compatible course loading"
```

---

### Task 4: Required field indicators on editor forms

**Files:**
- Modify: All 15 editor form components

- [ ] **Step 1: Add `required` prop to FieldLabel instances**

For each form, set `required` on the appropriate `<FieldLabel>` elements. Reference the spec's table:

**HeadingForm:** `<FieldLabel required>Text</FieldLabel>`
**TextForm:** `<FieldLabel required>Text</FieldLabel>`
**ImageForm:** `<FieldLabel required>Image URL</FieldLabel>`, `<FieldLabel required>Alt text</FieldLabel>`
**VideoForm:** `<FieldLabel required>Video URL...</FieldLabel>`
**AudioForm:** `<FieldLabel required>Audio URL</FieldLabel>` (title stays without required)
**DocumentForm:** `<FieldLabel required>Document URL</FieldLabel>`, `<FieldLabel required>File type</FieldLabel>` (title stays without required)
**CodeForm:** `<FieldLabel required>Language</FieldLabel>`, `<FieldLabel required>Code</FieldLabel>`
**QuizForm:** `<FieldLabel required>Question</FieldLabel>`, `<FieldLabel required>Option X</FieldLabel>` for each option
**TrueFalseForm:** `<FieldLabel required>Question</FieldLabel>`
**ShortAnswerForm:** `<FieldLabel required>Question</FieldLabel>`, `<FieldLabel required>Answer</FieldLabel>`
**ListForm:** `<FieldLabel required>Items</FieldLabel>`
**QuoteForm:** `<FieldLabel required>Text</FieldLabel>` (cite stays without required)
**CalloutForm:** `<FieldLabel required>Text</FieldLabel>`, `<FieldLabel required>Variant</FieldLabel>` (title stays without required)
**AccordionForm:** `<FieldLabel required>Title</FieldLabel>` on each item (content stays without required)
**TabsForm:** `<FieldLabel required>Label</FieldLabel>` on each item (content stays without required)

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/*.tsx
git commit -m "feat: required field indicators on all editor forms"
```

---

### Task 5: Publish-time validation utility

**Files:**
- Create: `src/lib/validate-blocks.ts`

- [ ] **Step 1: Create the validation utility**

```typescript
// src/lib/validate-blocks.ts
import { blockSchema } from "@/types/course";
import type { ContentLesson } from "@/types/course";

export type BlockWarning = {
  lessonTitle: string;
  blockIndex: number;
  blockType: string;
  issues: string[];
};

export function validateCourseBlocks(lessons: ContentLesson[]): BlockWarning[] {
  const warnings: BlockWarning[] = [];

  for (const lesson of lessons) {
    for (let i = 0; i < lesson.blocks.length; i++) {
      const block = lesson.blocks[i];
      const result = blockSchema.safeParse(block);
      if (!result.success) {
        const issues = result.error.issues.map((issue) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
        warnings.push({
          lessonTitle: lesson.title,
          blockIndex: i,
          blockType: block.type,
          issues,
        });
      }
      // Also check correctIndex -1 on quizzes (valid in schema but worth flagging)
      if (block.type === "quiz" && block.correctIndex === -1) {
        const existing = warnings.find(
          (w) => w.lessonTitle === lesson.title && w.blockIndex === i
        );
        const issue = "no correct answer selected";
        if (existing) {
          existing.issues.push(issue);
        } else {
          warnings.push({
            lessonTitle: lesson.title,
            blockIndex: i,
            blockType: block.type,
            issues: [issue],
          });
        }
      }
    }
  }

  return warnings;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validate-blocks.ts
git commit -m "feat: add validateCourseBlocks utility for publish-time warnings"
```

---

### Task 6: Publish modal validation warnings

**Files:**
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Import the validation utility**

Add import at top of Editor.tsx:
```tsx
import { validateCourseBlocks, type BlockWarning } from "@/lib/validate-blocks";
```

- [ ] **Step 2: Add validation when publish modal opens**

Find where the publish modal state is managed (look for something like `showPublish` or `publishOpen`). When the modal opens, compute warnings:

```tsx
const [publishWarnings, setPublishWarnings] = useState<BlockWarning[]>([]);

// When opening the publish modal, compute warnings
const openPublish = () => {
  const contentLessons = course.lessons.filter(l => l.kind === "content") as ContentLesson[];
  setPublishWarnings(validateCourseBlocks(contentLessons));
  setShowPublish(true); // or whatever the existing state setter is
};
```

- [ ] **Step 3: Render warnings in the PublishModal component**

Find the PublishModal component inside Editor.tsx and add at the top of its content:

```tsx
{publishWarnings.length > 0 && (
  <div style={{ background: "#fef9c3", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
    <p style={{ fontWeight: 600, fontSize: 13, color: "#92400e", marginBottom: 8 }}>
      ⚠ {publishWarnings.reduce((n, w) => n + w.issues.length, 0)} issue{publishWarnings.reduce((n, w) => n + w.issues.length, 0) !== 1 ? "s" : ""} found:
    </p>
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#78350f" }}>
      {publishWarnings.map((w, i) =>
        w.issues.map((issue, j) => (
          <li key={`${i}-${j}`}>
            Lesson "{w.lessonTitle}", block {w.blockIndex + 1} ({w.blockType}): {issue}
          </li>
        ))
      )}
    </ul>
  </div>
)}
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "feat: publish modal shows validation warnings for empty required fields"
```

---

### Task 7: MCP review_course — empty-field gap detection

**Files:**
- Modify: `mcp/src/tools/preview.ts`
- Modify: `mcp/tests/preview.test.ts`

- [ ] **Step 1: Write failing test**

Add to `mcp/tests/preview.test.ts`:

```typescript
describe("analyzeCourse — empty field detection", () => {
  it("flags blocks with empty required fields", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Intro",
        blocks: [
          { id: "b1", type: "heading", text: "" },
          { id: "b2", type: "image", src: "", alt: "test" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const emptyFieldGaps = result.gaps.filter(g => g.type === "empty_required_field");
    expect(emptyFieldGaps.length).toBeGreaterThanOrEqual(2);
  });

  it("does not flag valid blocks as empty", () => {
    const course: Course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "content",
        id: "l1",
        title: "Intro",
        blocks: [
          { id: "b1", type: "heading", text: "Hello" },
          { id: "b2", type: "image", src: "https://example.com/img.jpg", alt: "test" },
        ],
      }],
    };
    const result = analyzeCourse(course);
    const emptyFieldGaps = result.gaps.filter(g => g.type === "empty_required_field");
    expect(emptyFieldGaps).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Implement empty-field detection in analyzeCourse**

In `mcp/src/tools/preview.ts`, import `blockSchema`:
```typescript
import { type Course, type Block, blockSchema } from "../lib/types.js";
```

Inside `analyzeCourse()`, after the existing block loop (after `if (cl.blocks.length > 10)` line), add a second pass for empty-field detection:

```typescript
// Check required fields
for (let bi = 0; bi < cl.blocks.length; bi++) {
  const block = cl.blocks[bi];
  const result = blockSchema.safeParse(block);
  if (!result.success) {
    for (const issue of result.error.issues) {
      gaps.push({
        type: "empty_required_field",
        lesson_id: lesson.id,
        message: `Lesson "${lesson.title}", block ${bi + 1} (${(block as any).type}): ${issue.path.join(".")} — ${issue.message}`,
      });
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "feat: review_course detects empty required fields as gaps"
```

---

### Task 8: MCP preview_course — warning placeholders for broken blocks

**Files:**
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Write failing test**

Add to `mcp/tests/preview.test.ts`:

```typescript
it("renders warning placeholder for blocks with empty required fields", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Test",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [
        { id: "b1", type: "image", src: "", alt: "" },
      ],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("Missing required field");
  expect(html).not.toContain("<img");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Add required field check at top of renderBlock**

In `renderBlock()` function, add at the very top before the switch:

```typescript
function renderBlock(block: Block): string {
  // Check required fields — render warning placeholder for broken blocks
  const validation = blockSchema.safeParse(block);
  if (!validation.success) {
    const fields = validation.error.issues.map(i => i.path.join(".")).join(", ");
    return `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:1em;margin:1em 0">⚠ [${block.type} block] Missing required field: ${fields}</div>`;
  }

  switch (block.type) {
    // ... existing cases
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All pass

**Note:** Some existing tests may need updating since they use blocks with empty fields (e.g. the `sampleCourse` fixture). Check if the sample course blocks at the top of the test file have valid data. The existing `sampleCourse` uses non-empty fields so it should be fine.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "feat: preview_course renders warning placeholders for blocks with empty required fields"
```

---

### Task 9: MCP update_block — add post-merge validation

**Files:**
- Modify: `mcp/src/tools/blocks.ts`

- [ ] **Step 1: Add blockSchema validation after merge in update_block**

In `mcp/src/tools/blocks.ts`, in the `update_block` tool, change the block merge line. Currently (line 174-175):

```typescript
blocks: cl.blocks.map((b: any) =>
  b.id === block_id ? ({ ...b, ...fields, id: b.id, type: b.type } as Block) : b
```

Change the entire update_block handler to validate after merge:

After the line `return {`, find where the merged block is created. The merge happens inside the `mutateCourse` callback. We need to validate BEFORE the mutation. Restructure the handler:

```typescript
async ({ course_id, lesson_id, block_id, fields }) =>
  withAuth(async (client, userId) => {
    let assessmentError = false;
    let validationError: string | null = null;

    const mutError = await mutateCourse(client, userId, course_id, (course) => {
      const targetLesson = course.lessons.find((l) => l.id === lesson_id);
      if ((targetLesson as any)?.kind === "assessment") {
        assessmentError = true;
        return course;
      }

      // Find the block, merge fields, validate the result
      const cl = targetLesson as any;
      const existingBlock = cl?.blocks?.find((b: any) => b.id === block_id);
      if (existingBlock) {
        const merged = { ...existingBlock, ...fields, id: existingBlock.id, type: existingBlock.type };
        const parsed = blockSchema.safeParse(merged);
        if (!parsed.success) {
          validationError = `Validation failed:\n${formatZodErrors(parsed.error).map((e: string) => `- ${e}`).join("\n")}`;
          return course;
        }
      }

      return {
        ...course,
        lessons: course.lessons.map((l) => {
          if (l.id !== lesson_id) return l;
          const cl2 = l as any;
          return {
            ...l,
            blocks: cl2.blocks.map((b: any) =>
              b.id === block_id ? ({ ...b, ...fields, id: b.id, type: b.type } as Block) : b
            ),
          };
        }),
      };
    });
    if (assessmentError) return err("assessment_lesson", "Block operations cannot be used on assessment lessons. Use add_question / update_question instead.");
    if (validationError) return err("validation_error", validationError);
    if (mutError) return err(mutError, "Failed to update block");
    return ok({ message: "Block updated" });
  })
```

Make sure `formatZodErrors` is imported (it already is at the top of the file).

- [ ] **Step 2: Run tests**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/blocks.ts
git commit -m "feat: update_block validates merged result against strict schema"
```

---

### Task 10: MCP instructions — document validation changes

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add validation notes**

In the Critical Rules section, add a new rule:

```
9. **Required fields must be non-empty** — blocks with required text fields (question, text, src, alt, code, language, answer) must have non-empty strings. Quiz options need at least 2 non-empty entries. List items need at least 1 non-empty entry. Accordion/tabs need at least 1 item with non-empty title/label. Empty required fields are rejected by all write tools.
```

Update the `update_block` description in the Tools Reference:
```
- update_block(course_id, lesson_id, block_id, fields) — patch specific fields on one block; the merged result is validated against the block schema and rejected if invalid
```

- [ ] **Step 2: Commit**

```bash
git add mcp/src/resources/instructions.ts
git commit -m "docs: MCP instructions document strict validation and update_block validation"
```

---

### Task 11: Run full test suite and verify build

- [ ] **Step 1: Run MCP tests**

Run: `cd mcp && npm test -- --reporter=verbose`
Expected: All tests pass

- [ ] **Step 2: Build frontend**

Run: `npm run build`
Expected: No errors
