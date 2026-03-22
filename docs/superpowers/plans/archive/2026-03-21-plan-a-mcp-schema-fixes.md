# MCP Schema & Runtime Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix eight runtime bugs in the MCP server that cause tool calls to fail or produce incorrect results, including broken `save_course`, missing `document` block support, and data-destroying `restructure_course`.

**Architecture:** All changes are in `mcp/src/`. Types are centralised in `lib/types.ts`; mutations in `tools/semantic.ts` and `tools/blocks.ts`; rendering in `tools/preview.ts`. Each fix is independent — tests for each bug are written before the fix.

**Tech Stack:** TypeScript, Zod, Vitest. Run tests with `cd mcp && npm test`.

---

## File Map

| File | Change |
|------|--------|
| `mcp/src/lib/types.ts` | Add `DocumentBlock`; add feedback fields to `QuizBlock`, `TrueFalseBlock`, `ShortAnswerBlock`; update `Block` union and `blockSchema`; add `document` factory |
| `mcp/src/tools/semantic.ts` | Fix `injectIds` (add `kind:"content"`, question IDs, sub-item IDs); fix `injectLessonIds` (same); fix `restructure_course` to reject partial lesson lists |
| `mcp/src/tools/blocks.ts` | Fix `add_block` to inject accordion/tabs sub-item IDs before validation; fix `add_block` to report all validation errors not just the first |
| `mcp/src/tools/preview.ts` | Add `document` case to `renderBlock` switch |
| `mcp/tests/schema.test.ts` | New — test `blockSchema` accepts all 17 block types including `document` and feedback fields |
| `mcp/tests/inject.test.ts` | New — test `injectIds` and `injectLessonIds` inject kind, question IDs, sub-item IDs |
| `mcp/tests/preview.test.ts` | Extend existing — add test for document block rendering |

---

### Task 1: Add `DocumentBlock` to MCP types

**Files:**
- Modify: `mcp/src/lib/types.ts`
- Test: `mcp/tests/schema.test.ts` (create)

- [ ] **Step 1: Write failing test**

Create `mcp/tests/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { blockSchema } from "../src/lib/types.js";

describe("blockSchema — document block", () => {
  it("accepts a valid document block", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.pdf",
      fileType: "pdf",
      title: "Annual Report",
    });
    expect(result.success).toBe(true);
  });

  it("accepts document block without optional title", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.pdf",
      fileType: "docx",
    });
    expect(result.success).toBe(true);
  });

  it("rejects document block with unknown fileType", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.xyz",
      fileType: "xyz",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- --reporter=verbose tests/schema.test.ts
```
Expected: FAIL — `document` not a valid discriminator value.

- [ ] **Step 3: Add `DocumentBlock` to `mcp/src/lib/types.ts`**

After the existing `AudioBlock` type definition, add:

```ts
export type DocumentBlock = {
  id: string;
  type: "document";
  src: string;
  fileType: "pdf" | "docx" | "xlsx" | "pptx";
  title?: string;
};
```

Add to the `Block` union (after `AudioBlock`):
```ts
export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | QuizBlock
  | CodeBlock
  | TrueFalseBlock
  | ShortAnswerBlock
  | ListBlock
  | QuoteBlock
  | AccordionBlock
  | TabsBlock
  | DividerBlock
  | TocBlock
  | CalloutBlock
  | VideoBlock
  | AudioBlock
  | DocumentBlock;  // add this
```

Add Zod schema after `audioBlockSchema`:
```ts
export const documentBlockSchema = z.object({
  id: z.string(),
  type: z.literal("document"),
  src: z.string(),
  fileType: z.union([z.literal("pdf"), z.literal("docx"), z.literal("xlsx"), z.literal("pptx")]),
  title: z.string().optional(),
});
```

Add to `blockSchema` discriminated union (after `audioBlockSchema`):
```ts
export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  textBlockSchema,
  imageBlockSchema,
  quizBlockSchema,
  codeBlockSchema,
  trueFalseBlockSchema,
  shortAnswerBlockSchema,
  listBlockSchema,
  quoteBlockSchema,
  accordionBlockSchema,
  tabsBlockSchema,
  dividerBlockSchema,
  tocBlockSchema,
  calloutBlockSchema,
  videoBlockSchema,
  audioBlockSchema,
  documentBlockSchema,  // add this
]);
```

Add factory (after `shortanswer` in `factories`):
```ts
document: (): DocumentBlock => ({ id: uid(), type: "document", src: "", fileType: "pdf", title: "" }),
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd mcp && npm test -- --reporter=verbose tests/schema.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd mcp && npm test
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd mcp && git add src/lib/types.ts tests/schema.test.ts
git commit -m "feat(mcp): add DocumentBlock type, schema, and factory"
```

---

### Task 2: Add `showFeedback` to quiz/truefalse/shortanswer types

**Files:**
- Modify: `mcp/src/lib/types.ts`
- Modify: `mcp/tests/schema.test.ts`

**Note on current state:** `TrueFalseBlock` already has `feedbackCorrect?` and `feedbackIncorrect?` in the MCP types. The only missing field is `showFeedback` (for all three types). The fix code below replaces the full type definitions for clarity — the existing `feedbackCorrect`/`feedbackIncorrect` fields are preserved.

- [ ] **Step 1: Write failing tests** — append to `mcp/tests/schema.test.ts`:

```ts
describe("blockSchema — feedback fields", () => {
  it("accepts quiz block with showFeedback and feedbackMessage", () => {
    const result = blockSchema.safeParse({
      id: "q1",
      type: "quiz",
      question: "What is X?",
      options: ["A", "B", "C", "D"],
      correctIndex: 1,
      showFeedback: true,
      feedbackMessage: "Well done!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).feedbackMessage).toBe("Well done!");
    }
  });

  it("accepts truefalse block with showFeedback (only this field is currently missing)", () => {
    const result = blockSchema.safeParse({
      id: "tf1",
      type: "truefalse",
      question: "Is X true?",
      correct: true,
      showFeedback: true,
      feedbackCorrect: "Yes!",
      feedbackIncorrect: "No!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // showFeedback is stripped by current schema — this assertion proves it's missing
      expect((result.data as any).showFeedback).toBe(true);
    }
  });

  it("accepts shortanswer block with showFeedback and feedbackMessage", () => {
    const result = blockSchema.safeParse({
      id: "sa1",
      type: "shortanswer",
      question: "Define X.",
      answer: "definition",
      showFeedback: true,
      feedbackMessage: "Close enough.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).showFeedback).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/schema.test.ts
```
Expected: FAIL — `showFeedback` is stripped by current schemas (Zod strips unknown keys by default), so `result.data.showFeedback` is `undefined`, not `true`.

- [ ] **Step 3: Update type definitions and Zod schemas in `mcp/src/lib/types.ts`**

Update `QuizBlock` (add `showFeedback` and `feedbackMessage` — both missing):
```ts
export type QuizBlock = {
  id: string;
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
  showFeedback?: boolean;
  feedbackMessage?: string;
};
```

Update `quizBlockSchema`:
```ts
export const quizBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quiz"),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

Update `TrueFalseBlock` (add `showFeedback` only — `feedbackCorrect`/`feedbackIncorrect` already exist):
```ts
export type TrueFalseBlock = {
  id: string;
  type: "truefalse";
  question: string;
  correct: boolean;
  showFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
};
```

Update `trueFalseBlockSchema` (add `showFeedback` only — other feedback fields already present):
```ts
export const trueFalseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("truefalse"),
  question: z.string(),
  correct: z.boolean(),
  showFeedback: z.boolean().optional(),
  feedbackCorrect: z.string().optional(),
  feedbackIncorrect: z.string().optional(),
});
```

Update `ShortAnswerBlock` (add `showFeedback` and `feedbackMessage` — both missing):
```ts
export type ShortAnswerBlock = {
  id: string;
  type: "shortanswer";
  question: string;
  answer: string;
  acceptable?: string[];
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  showFeedback?: boolean;
  feedbackMessage?: string;
};
```

Update `shortAnswerBlockSchema`:
```ts
export const shortAnswerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("shortanswer"),
  question: z.string(),
  answer: z.string(),
  acceptable: z.array(z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd mcp && npm test -- tests/schema.test.ts
```
Expected: all schema tests pass.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/lib/types.ts mcp/tests/schema.test.ts
git commit -m "feat(mcp): add feedback fields to quiz, truefalse, shortanswer types"
```

---

### Task 3: Fix `injectIds` and `injectLessonIds` in `semantic.ts`

**Files:**
- Modify: `mcp/src/tools/semantic.ts`
- Test: `mcp/tests/inject.test.ts` (create)

The three bugs fixed here:
1. `save_course` lessons without `kind` fail schema validation — `injectIds` must add `kind: "content"`
2. Assessment question IDs not generated — `save_course` with questions always fails
3. Accordion/tabs sub-item IDs not generated — blocks missing required `id` on items

- [ ] **Step 1: Write failing tests**

Create `mcp/tests/inject.test.ts`:

```ts
import { describe, it, expect } from "vitest";

// We test the inject functions by importing semantic.ts internals.
// Since they're not exported, we test them indirectly via validateCourseJson.
import { validateCourseJson } from "../src/lib/validate.js";
import { uid } from "../src/lib/uid.js";

// Helper: run injectIds logic directly by importing the module.
// We'll call save_course logic indirectly by testing the output of validateCourseJson
// on the result of injectIds. Since injectIds is not exported, we replicate the
// input→output contract: "omit ids, get valid course back."

// The real test: pass a course with no ids/kind and expect validation to pass.
// We'll test this by importing injectIds after refactoring exports it.
// For now, test the contract via the full flow using a minimal in-memory version.

// Import the functions we need to test (they will be exported after refactor)
import { injectIds, injectLessonIds } from "../src/tools/semantic.js";

describe("injectIds", () => {
  it("adds kind:content to lessons without kind", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [] }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("content");
  });

  it("injects id into each lesson", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [] }],
    };
    const result = injectIds(course);
    expect(typeof result.lessons[0].id).toBe("string");
    expect(result.lessons[0].id.length).toBeGreaterThan(0);
  });

  it("injects ids into assessment lesson questions", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [
          { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
          { text: "Q2", options: ["A", "B", "C", "D"], correctIndex: 1 },
        ],
        config: { passingScore: 80, examSize: 20 },
      }],
    };
    const result = injectIds(course);
    expect(typeof result.lessons[0].questions[0].id).toBe("string");
    expect(typeof result.lessons[0].questions[1].id).toBe("string");
  });

  it("injects ids into accordion item sub-items", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "accordion",
          items: [
            { title: "Section 1", content: "Content 1" },
            { title: "Section 2", content: "Content 2" },
          ],
        }],
      }],
    };
    const result = injectIds(course);
    const block = result.lessons[0].blocks[0];
    expect(typeof block.items[0].id).toBe("string");
    expect(typeof block.items[1].id).toBe("string");
  });

  it("injects ids into tabs item sub-items", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "tabs",
          items: [
            { label: "Tab A", content: "Content A" },
            { label: "Tab B", content: "Content B" },
          ],
        }],
      }],
    };
    const result = injectIds(course);
    const block = result.lessons[0].blocks[0];
    expect(typeof block.items[0].id).toBe("string");
    expect(typeof block.items[1].id).toBe("string");
  });

  it("result passes validateCourseJson for content lesson with accordion", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        title: "L1",
        blocks: [{
          type: "accordion",
          items: [{ title: "S1", content: "C1" }],
        }],
      }],
    };
    const withIds = injectIds(course);
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });

  it("result passes validateCourseJson for assessment lesson with questions", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{
        kind: "assessment",
        title: "Exam",
        questions: [
          { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
        ],
        config: { passingScore: 80, examSize: 10 },
      }],
    };
    const withIds = injectIds(course);
    const result = validateCourseJson(withIds);
    expect(result.ok).toBe(true);
  });
});

describe("injectLessonIds", () => {
  it("adds kind:content when absent", () => {
    const lesson = { title: "L1", blocks: [] };
    const result = injectLessonIds(lesson);
    expect(result.kind).toBe("content");
  });

  it("injects question ids for assessment lessons", () => {
    const lesson = {
      kind: "assessment",
      title: "Exam",
      questions: [
        { text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
      ],
      config: {},
    };
    const result = injectLessonIds(lesson);
    expect(typeof result.questions[0].id).toBe("string");
  });

  it("injects sub-item ids for accordion blocks", () => {
    const lesson = {
      title: "L1",
      blocks: [{
        type: "accordion",
        items: [{ title: "S1", content: "C1" }],
      }],
    };
    const result = injectLessonIds(lesson);
    expect(typeof result.blocks[0].items[0].id).toBe("string");
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/inject.test.ts
```
Expected: FAIL — `injectIds` and `injectLessonIds` not exported; and even if they were, missing `kind`, question IDs, sub-item IDs.

- [ ] **Step 3: Refactor and fix `mcp/src/tools/semantic.ts`**

Export the functions and fix their logic. Replace `injectIds` and `injectLessonIds`:

```ts
export function injectSubItemIds(block: any): any {
  if (block.type === "accordion" || block.type === "tabs") {
    return {
      ...block,
      items: (block.items ?? []).map((item: any) => ({
        ...item,
        id: item.id ?? uid(),
      })),
    };
  }
  return block;
}

export function injectIds(course: any) {
  return {
    ...course,
    lessons: (course.lessons ?? []).map((l: any) => {
      if (l.kind === "assessment") {
        return {
          ...l,
          id: l.id ?? uid(),
          questions: (l.questions ?? []).map((q: any) => ({
            ...q,
            id: q.id ?? uid(),
          })),
        };
      }
      return {
        ...l,
        kind: "content",
        id: l.id ?? uid(),
        blocks: (l.blocks ?? []).map((b: any) =>
          injectSubItemIds({ ...b, id: b.id ?? uid() })
        ),
      };
    }),
  };
}

export function injectLessonIds(lesson: any) {
  if (lesson.kind === "assessment") {
    return {
      ...lesson,
      id: uid(),
      questions: (lesson.questions ?? []).map((q: any) => ({
        ...q,
        id: q.id ?? uid(),
      })),
    };
  }
  return {
    ...lesson,
    kind: "content",
    id: uid(),
    blocks: (lesson.blocks ?? []).map((b: any) =>
      injectSubItemIds({ ...b, id: uid() })
    ),
  };
}
```

- [ ] **Step 4: Run inject tests — confirm pass**

```bash
cd mcp && npm test -- tests/inject.test.ts
```
Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd mcp && npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/tools/semantic.ts mcp/tests/inject.test.ts
git commit -m "fix(mcp): injectIds now adds kind:content, question IDs, and sub-item IDs"
```

---

### Task 4: Fix `add_block` in `blocks.ts` — sub-item IDs and error reporting

**Files:**
- Modify: `mcp/src/tools/blocks.ts`
- Modify: `mcp/tests/schema.test.ts`

**Note:** `injectSubItemIds` was exported from `semantic.ts` in Task 3. `blocks.ts` imports it from there — no separate copy. The test below imports from `semantic.ts` directly.

- [ ] **Step 1: Write failing tests** — append to `mcp/tests/schema.test.ts`:

```ts
// injectSubItemIds is exported from semantic.ts (Task 3)
import { injectSubItemIds } from "../src/tools/semantic.js";

describe("injectSubItemIds", () => {
  it("injects ids into accordion items", () => {
    const block = {
      type: "accordion",
      items: [{ title: "S1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(typeof result.items[0].id).toBe("string");
  });

  it("injects ids into tabs items", () => {
    const block = {
      type: "tabs",
      items: [{ label: "T1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(typeof result.items[0].id).toBe("string");
  });

  it("leaves non-container blocks unchanged", () => {
    const block = { type: "text", text: "<p>hello</p>" };
    const result = injectSubItemIds(block);
    expect(result).toEqual(block);
  });

  it("preserves existing sub-item ids", () => {
    const block = {
      type: "accordion",
      items: [{ id: "existing-id", title: "S1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("existing-id");
  });
});
```

- [ ] **Step 2: Run test — confirm these tests already pass** (exported in Task 3)

```bash
cd mcp && npm test -- tests/schema.test.ts
```
Expected: `injectSubItemIds` tests PASS (exported from semantic.ts in Task 3). The feedback field tests also pass. All green.

- [ ] **Step 3: Update `mcp/src/tools/blocks.ts`**

Add import at the top of `blocks.ts`:
```ts
import { injectSubItemIds } from "./semantic.js";
```

`formatZodErrors` is already imported from `../lib/validate.js` — no change needed there.

Update the `add_block` tool description to remove the now-outdated note about accordion/tabs requiring caller-supplied IDs. Find the description string and remove or replace any sentence saying accordion/tabs items need a UUID id field — since `injectSubItemIds` now handles this automatically.

In `add_block`, replace the id-injection and error-reporting lines:

```ts
// Before (old):
const withId = { ...block, id: uid() };
const parsed = blockSchema.safeParse(withId);
if (!parsed.success) {
  return err("invalid_block_type", parsed.error.issues[0]?.message ?? "Invalid block");
}

// After (new):
const withId = injectSubItemIds({ ...block, id: uid() });
const parsed = blockSchema.safeParse(withId);
if (!parsed.success) {
  const msgs = formatZodErrors(parsed.error);
  return err("invalid_block_type", `Validation failed:\n${msgs.map(e => `- ${e}`).join("\n")}`);
}
```

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test -- tests/schema.test.ts
```
Expected: all tests pass.

- [ ] **Step 5: Full test suite**

```bash
cd mcp && npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/tools/blocks.ts mcp/tests/schema.test.ts
git commit -m "fix(mcp): add_block injects sub-item IDs and reports all validation errors"
```

---

### Task 5: Add `document` case to `renderBlock` in `preview.ts`

**Files:**
- Modify: `mcp/src/tools/preview.ts`
- Modify: `mcp/tests/preview.test.ts`

- [ ] **Step 1: Write failing test** — append to `mcp/tests/preview.test.ts`:

```ts
it("renders a document block", () => {
  const course: Course = {
    schemaVersion: 1,
    title: "Docs Course",
    lessons: [{
      kind: "content",
      id: "l1",
      title: "L1",
      blocks: [{
        id: "b1",
        type: "document",
        src: "https://example.com/file.pdf",
        fileType: "pdf",
        title: "Annual Report",
      }],
    }],
  };
  const html = renderCourseToHtml(course);
  expect(html).toContain("Annual Report");
  expect(html).not.toContain("[Unknown block type]");
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: FAIL — document block renders as `[Unknown block type]`.

- [ ] **Step 3: Add `document` case to `renderBlock` in `mcp/src/tools/preview.ts`**

Inside the `switch (block.type)` statement, before the `default` case:

```ts
case "document":
  return `<div style="background:#f8f8f8;padding:1em;margin:1em 0;border-radius:4px;display:flex;align-items:center;gap:0.75em">
    <span style="font-size:1.5em">📄</span>
    <div>
      ${block.title ? `<strong>${esc(block.title)}</strong><br/>` : ""}
      <a href="${esc(block.src)}" target="_blank" style="color:#6366f1;font-size:0.875em">${esc(block.src)}</a>
      <span style="font-size:0.75em;color:#888;margin-left:0.5em">(${esc(block.fileType.toUpperCase())})</span>
    </div>
  </div>`;
```

Note: `block` is typed as `Block` in `renderBlock`. Since `DocumentBlock` is now in the `Block` union (Task 1), TypeScript will accept this case.

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test -- tests/preview.test.ts
```
Expected: all pass.

- [ ] **Step 5: Full suite**

```bash
cd mcp && npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/tools/preview.ts mcp/tests/preview.test.ts
git commit -m "fix(mcp): render document blocks in preview_course"
```

---

### Task 6: Fix `restructure_course` to reject partial lesson lists

**Files:**
- Modify: `mcp/src/tools/semantic.ts`
- Test: `mcp/tests/restructure.test.ts` (create)

The bug: if `lesson_order` omits any lesson IDs, those lessons are silently deleted. Fix: validate all existing lesson IDs are present in `lesson_order` before applying.

- [ ] **Step 1: Write failing test**

Create `mcp/tests/restructure.test.ts`:

```ts
import { describe, it, expect } from "vitest";

// We test the guard logic in isolation by extracting it.
// The function checkRestructureOrder will be exported from semantic.ts.
import { checkRestructureOrder } from "../src/tools/semantic.js";

describe("checkRestructureOrder", () => {
  it("returns null when all lesson IDs are present", () => {
    const existing = ["l1", "l2", "l3"];
    const provided = ["l3", "l1", "l2"];
    expect(checkRestructureOrder(existing, provided)).toBeNull();
  });

  it("returns missing IDs when lesson_order is incomplete", () => {
    const existing = ["l1", "l2", "l3"];
    const provided = ["l1", "l2"];
    const result = checkRestructureOrder(existing, provided);
    expect(result).not.toBeNull();
    expect(result).toContain("l3");
  });

  it("returns null for empty course", () => {
    expect(checkRestructureOrder([], [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd mcp && npm test -- tests/restructure.test.ts
```
Expected: FAIL — `checkRestructureOrder` not exported.

- [ ] **Step 3: Add `checkRestructureOrder` and use it in `restructure_course`**

In `mcp/src/tools/semantic.ts`, add the exported helper before `registerSemanticTools`:

```ts
export function checkRestructureOrder(existingIds: string[], providedIds: string[]): string | null {
  const provided = new Set(providedIds);
  const missing = existingIds.filter(id => !provided.has(id));
  if (missing.length === 0) return null;
  return `lesson_order must include all ${existingIds.length} lesson(s). Missing: ${missing.join(", ")}`;
}
```

In `restructure_course`, move the validation check inside the `mutateCourse` callback — this reuses the DB fetch `mutateCourse` already performs and avoids an extra round-trip. Replace the existing `mutateCourse` call:

```ts
async ({ course_id, lesson_order }) =>
  withAuth(async (client, userId) => {
    let orderError: string | null = null;

    const mutError = await mutateCourse(client, userId, course_id, (course) => {
      const existingIds = course.lessons.map((l: any) => l.id);
      const providedIds = lesson_order.map(l => l.lesson_id);
      orderError = checkRestructureOrder(existingIds, providedIds);
      if (orderError) return course; // return unchanged; we check orderError below

      const lessonMap = new Map(course.lessons.map((l) => [l.id, l]));
      const reordered = lesson_order
        .map(({ lesson_id, title }) => {
          const lesson = lessonMap.get(lesson_id);
          if (!lesson) return null;
          return { ...lesson, title };
        })
        .filter(Boolean) as typeof course.lessons;
      return { ...course, lessons: reordered };
    });

    if (orderError) return err("incomplete_lesson_order", orderError);
    if (mutError) return err(mutError, "Failed to restructure course");
    return ok({ message: "Course restructured" });
  })
```

Also update the tool description to be accurate:
```ts
"Reorder and/or rename lessons. lesson_order must contain ALL lessons in the course — omitting any will return an error. Pass every lesson_id with its desired title in the new order.",
```

- [ ] **Step 4: Run tests**

```bash
cd mcp && npm test -- tests/restructure.test.ts
```
Expected: all pass.

- [ ] **Step 5: Full suite**

```bash
cd mcp && npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/tools/semantic.ts mcp/tests/restructure.test.ts
git commit -m "fix(mcp): restructure_course rejects partial lesson lists to prevent silent data loss"
```

---

### Final: Build check

- [ ] **Verify TypeScript compiles cleanly**

```bash
cd mcp && npm run build
```
Expected: no TypeScript errors.

- [ ] **Run full test suite one more time**

```bash
cd mcp && npm test
```
Expected: all tests pass.
