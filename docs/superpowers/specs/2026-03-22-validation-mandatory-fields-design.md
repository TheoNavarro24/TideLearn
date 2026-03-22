# Spec 3: Validation & Mandatory Fields

> Enforce data quality at every layer — from editor labels to Zod schemas to publish-time checks.

## Context

TideLearn currently has zero mandatory field signalling in the editor and minimal schema enforcement. Every field looks equally optional. Authors can publish courses with empty quiz questions, broken image URLs, and missing video sources. The Zod schemas accept `z.string()` (empty string is valid) for fields that should never be empty. This spec tightens validation across all layers while maintaining backwards compatibility for existing courses.

This is **Spec 3 of 3** in the Block Polish series:
- Spec 1: Block Form UX (complete)
- Spec 2: Inline Previews (complete)
- **Spec 3: Validation & Mandatory Fields** (this document)

**Dependency:** Spec 1 must be implemented first. It introduces the `<FieldLabel>` component with a `required` prop (currently unused). This spec activates that prop. It also fixes the QuizForm to support add/remove options and `-1` correctIndex, which this spec's validation needs to handle.

## Migration strategy

**Validate loosely on read, strictly on write.** This is the core architectural decision.

- `src/pages/View.tsx` — keeps the current permissive `courseSchema.safeParse()` so existing courses with empty fields still load and display
- `src/validate/course.ts` — keeps the current loose `.passthrough()` schema for deep link imports
- Editor save (autosave + manual save) — validates strictly, surfaces warnings but does NOT block save (to avoid data loss)
- MCP tools — validate strictly on write (`add_block`, `save_course`, `rewrite_block`, etc.), reject blocks with empty required fields
- Publish — shows validation warnings in the publish modal, author can proceed but is clearly warned

This means existing courses self-heal over time: they load fine, but when an author edits and re-saves, the editor surfaces any empty required fields for them to fill.

## Changes

### 1. Required field indicators on editor forms

**Current:** All labels use plain text, no distinction between required and optional fields.

**After:** The `<FieldLabel>` component (introduced in Spec 1) gets its `required` prop set to `true` on all mandatory fields. This renders a red `*` after the label text.

**Fields marked required per block type:**

| Block type | Required fields | Optional fields |
|---|---|---|
| heading | `text` | — |
| text | `text` | — |
| image | `src`, `alt` | — |
| video | `url` | — |
| audio | `src` | `title` |
| document | `src`, `fileType` | `title` |
| code | `language`, `code` | — |
| quiz | `question`, all `options[*]` | `showFeedback`, `feedbackMessage` |
| truefalse | `question` | `showFeedback`, `feedbackCorrect`, `feedbackIncorrect` |
| shortanswer | `question`, `answer` | `acceptable`, `caseSensitive`, `trimWhitespace`, `showFeedback`, `feedbackMessage` |
| list | at least 1 item, each item non-empty | `style` (has default) |
| quote | `text` | `cite` |
| callout | `text`, `variant` | `title` |
| accordion | at least 1 item, each `title` non-empty | `content` (can be empty) |
| tabs | at least 1 item, each `label` non-empty | `content` (can be empty) |
| divider | — (no fields) | — |
| toc | — (no fields) | — |

**Files changed:**
- All 15 editor form components (from Spec 1's FieldLabel adoption) — add `required={true}` to appropriate `<FieldLabel>` instances

**Cascade:** None — purely visual indicator.

### 2. Zod schema tightening

**Current:** Required string fields use `z.string()` which accepts empty strings. Quiz `options` uses `z.array(z.string())` which accepts empty arrays.

**After:** Tighten the schemas in **both** schema files (`src/types/course.ts` and `mcp/src/lib/types.ts`):

```
z.string()                → z.string().min(1)       (for required text fields)
z.array(z.string())       → z.array(z.string().min(1)).min(2)  (quiz options)
z.array(z.string())       → z.array(z.string().min(1)).min(1)  (list items)
z.array(z.object({...}))  → z.array(z.object({...})).min(1)    (accordion/tabs items)
```

**Specific field changes:**

| Schema | Field | Current | After |
|---|---|---|---|
| `headingBlockSchema` | `text` | `z.string()` | `z.string().min(1)` |
| `textBlockSchema` | `text` | `z.string()` | `z.string().min(1)` |
| `imageBlockSchema` | `src` | `z.string()` | `z.string().min(1)` |
| `imageBlockSchema` | `alt` | `z.string()` | `z.string().min(1)` |
| `videoBlockSchema` | `url` | `z.string()` | `z.string().min(1)` |
| `audioBlockSchema` | `src` | `z.string()` | `z.string().min(1)` |
| `documentBlockSchema` | `src` | `z.string()` | `z.string().min(1)` |
| `codeBlockSchema` | `language` | `z.string()` | `z.string().min(1)` |
| `codeBlockSchema` | `code` | `z.string()` | `z.string().min(1)` |
| `quizBlockSchema` | `question` | `z.string()` | `z.string().min(1)` |
| `quizBlockSchema` | `options` | `z.array(z.string())` | `z.array(z.string().min(1)).min(2)` |
| `trueFalseBlockSchema` | `question` | `z.string()` | `z.string().min(1)` |
| `shortAnswerBlockSchema` | `question` | `z.string()` | `z.string().min(1)` |
| `shortAnswerBlockSchema` | `answer` | `z.string()` | `z.string().min(1)` |
| `quoteBlockSchema` | `text` | `z.string()` | `z.string().min(1)` |
| `calloutBlockSchema` | `text` | `z.string()` | `z.string().min(1)` |
| `listBlockSchema` | `items` | `z.array(z.string())` | `z.array(z.string().min(1)).min(1)` |
| `accordionBlockSchema` | `items` | `z.array(z.object({...}))` | `.min(1)`, each item `title: z.string().min(1)` |
| `tabsBlockSchema` | `items` | `z.array(z.object({...}))` | `.min(1)`, each item `label: z.string().min(1)` |

**Files changed:**
- `src/types/course.ts` — all schemas above
- `mcp/src/lib/types.ts` — all schemas above (must stay in sync)

**Cascade — this is the biggest domino in the entire series:**

| System | Impact | Action |
|---|---|---|
| **View.tsx** `courseSchema.safeParse()` | Strict schemas would reject existing courses with empty fields | **Keep using current permissive schema.** Create a separate `courseSchemaStrict` export or keep `courseSchema` permissive and create `blockSchemaStrict` for write paths only. |
| **Deep link validation** (`src/validate/course.ts`) | Uses loose `.passthrough()` schema | **No change.** This is intentionally permissive for accepting external course imports. |
| **MCP `add_block`** | Validates via `blockSchema.safeParse()` | Automatically picks up stricter validation. Empty required fields rejected. |
| **MCP `rewrite_block` / `rewrite_blocks`** | Validates via `blockSchema.safeParse()` | Same — automatically stricter. |
| **MCP `update_block`** | Does NO validation (shallow merge) | **Add validation.** After merging fields, run `blockSchema.safeParse()` on the resulting block. Return validation error if invalid. This closes the gap where a partial patch could create an invalid block. |
| **MCP `save_course`** | Validates via `validateCourseJson()` | Automatically picks up stricter schemas. |
| **MCP `generate_lesson`** | Validates blocks via `blockSchema` | Automatically stricter. |
| **MCP tool descriptions** (`instructions.ts`) | Documents required fields | Update to note that empty strings are rejected for required fields. |
| **Factory defaults** | Some factories produce empty strings (e.g. `image: src: ""`, `document: src: ""`) | **Update factories** to produce placeholder values or leave empty and accept that newly created blocks won't pass strict validation until the author fills them. Decision: leave empty — the editor autosaves before strict validation applies, and the empty state is visible to the author. |
| **Editor autosave** | Currently saves without validation | **Add validation check before save.** If validation fails, still save (never block autosave / risk data loss) but set a `hasWarnings` flag that surfaces in the publish modal. |

**Schema architecture decision:** Rather than creating separate strict/permissive schema exports, **tighten the canonical schemas** (`blockSchema`, `courseSchema`) and change `View.tsx` to use a separate permissive schema for read. This keeps write validation as the default and makes permissive read an explicit opt-in.

**View.tsx permissive read schema:** Create `blockSchemaPermissive` alongside the strict `blockSchema` — same structure but all `z.string().min(1)` replaced with `z.string()`. The `courseSchemaPermissive` uses this for its block validation. Only `View.tsx` and `src/validate/course.ts` use the permissive versions.

### 3. Publish-time validation

**Current:** The publish modal shows the publish URL, export options, and import tools. No validation.

**After:** When the publish modal opens, run a validation pass over all blocks in all lessons. If any required fields are empty, show a warnings section at the top of the modal:

```
⚠ 3 issues found:
- Lesson "Module 1", block 2 (Image): missing image URL
- Lesson "Module 1", block 5 (Quiz): empty question text
- Lesson "Module 2", block 1 (Heading): empty heading text
```

The author can still publish — these are warnings, not blockers. The warning section uses the `warning` callout style (amber background, matching the app's design language).

**Implementation:** A `validateCourseBlocks(lessons: Lesson[])` utility function that iterates all content lessons, validates each block against the strict schema, and returns an array of `{ lessonTitle, blockIndex, blockType, issues: string[] }`.

**Files changed:**
- `src/lib/validate-blocks.ts` — **new file**: `validateCourseBlocks()` utility
- `src/pages/Editor.tsx` — call validation when publish modal opens, pass warnings to PublishModal
- PublishModal component (inside Editor.tsx) — render warnings section

**Cascade:** None — this is purely an editor-side addition.

### 4. `review_course` empty-field gap detection

**Current:** `analyzeCourse()` in `mcp/src/tools/preview.ts` detects three gap types: `no_assessment`, `no_media`, `too_long`.

**After:** Add a fourth gap type: `empty_required_field`. For each block in each content lesson, check required fields against the strict schema. Report each violation as a gap entry.

```typescript
{ type: "empty_required_field", lesson_id: "...", message: 'Lesson "Module 1", block 3 (Image): missing image URL (src)' }
```

**Files changed:**
- `mcp/src/tools/preview.ts` — extend `analyzeCourse()` to check required fields

**Cascade:** None — `review_course` is a read-only analysis tool.

### 5. `preview_course` broken block rendering

**Current:** `renderBlock()` renders blocks with empty fields as broken HTML (empty `<h2>`, broken `<img>`, etc.).

**After:** For blocks with empty required fields, render a warning placeholder instead:

```html
<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:1em;margin:1em 0">
  ⚠ [Image block] Missing required field: src
</div>
```

This applies to the MCP server preview only — the learner-facing view and SCORM export are not affected (they should render whatever data exists).

**Files changed:**
- `mcp/src/tools/preview.ts` — add required field check at the top of `renderBlock()`, return warning HTML if any required field is empty

**Cascade:** None — MCP preview only.

### 6. MCP `update_block` validation

**Current:** `update_block` does a shallow merge with no validation. A partial patch can create an invalid block (e.g. setting `question: ""` on a quiz block).

**After:** After merging fields, run `blockSchema.safeParse()` on the complete resulting block. If validation fails, return the Zod errors. This aligns `update_block` with `rewrite_block` and `add_block` which already validate.

**Files changed:**
- `mcp/src/tools/blocks.ts` — add `blockSchema.safeParse()` after merge in `update_block`

**Cascade:** MCP tool descriptions (`instructions.ts`) — note that `update_block` now validates the resulting block.

## Files changed summary

| File | Change type |
|---|---|
| `src/components/blocks/editor/*.tsx` (15 forms) | Add `required={true}` to FieldLabel instances |
| `src/types/course.ts` | Tighten Zod schemas (`.min(1)` on required fields) + add permissive variants |
| `mcp/src/lib/types.ts` | Tighten Zod schemas (must stay in sync with frontend) |
| `src/pages/View.tsx` | Use permissive schema for course loading |
| `src/lib/validate-blocks.ts` | **New file** — block validation utility |
| `src/pages/Editor.tsx` | Publish modal validation warnings |
| `mcp/src/tools/preview.ts` | `analyzeCourse()` empty-field gaps + `renderBlock()` warning placeholders |
| `mcp/src/tools/blocks.ts` | `update_block` post-merge validation |
| `mcp/src/resources/instructions.ts` | Document required fields, update_block validation |

## What this does NOT change

- **Block data model** — no new fields, no type changes
- **View.tsx rendering** — still renders whatever data exists (no warnings to learners)
- **SCORM/static export** — still renders whatever data exists (broken blocks are the author's responsibility, surfaced by publish warnings)
- **Deep link import validation** — stays permissive
- **Factory defaults** — empty `src`/`url` fields on media blocks stay empty (author must fill them)

## Risks

1. **Schema sync between frontend and MCP** — the two `types.ts` files must stay identical. Any drift causes MCP tools to accept/reject differently than the editor. Mitigation: the files are already manually synced today; this spec doesn't change that pattern. A future improvement could share the schema from a single source.

2. **Autosave with strict validation** — strict validation must NEVER block autosave. If validation fails, save the data anyway and set a warnings flag. Losing user work is worse than saving invalid data.

3. **MCP `update_block` becoming strict** — existing MCP workflows that patch blocks with empty fields will start failing. This is intentional — the MCP tool descriptions will document the new requirements. The MCP instructions resource already tells callers to "always call get_course before editing," so they should know the current field values.

4. **Performance of publish-time validation** — validating every block in every lesson could be slow for very large courses. Mitigation: Zod validation is fast (microseconds per schema), and the iteration is O(n) over blocks. A course with 100 lessons × 10 blocks = 1000 validations, which completes in under 10ms.
