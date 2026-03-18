# MCP Consolidation Design

**Date:** 2026-03-18
**Status:** Approved
**Scope:** TideLearn MCP server (`mcp/src/`)

---

## Context

The TideLearn MCP server was first tested in a real course-build session (financial literacy course, 5 modules). The session surfaced several friction points:

- The LLM hit a cryptic Zod validation error (`"Invalid literal value, expected 1"`) caused by a missing `schemaVersion: 1` field and had to guess at the fix
- Text block content was stored as markdown, but the renderer expected HTML — invisible at write time, broken at view time
- The Editor app would overwrite MCP writes within ~1 second (localStorage-first load order bug — **already fixed in `Editor.tsx`**)
- 6 separate `rewrite_block` calls were needed to update image URLs — each a separate Supabase round trip
- HTML infographic files uploaded without `Content-Type: text/html` — served as `text/plain`, rendered as raw source in the frontend (**already fixed in `Image.tsx`**)
- 29 tools is too many; several are duplicates or near-duplicates

This spec addresses all remaining issues via four changes.

---

## Goals

1. Reduce tool count by removing duplicates and merging related tools
2. Make validation errors actionable — plain English, not raw Zod output
3. Prevent the LLM from writing invalid data by validating before writes
4. Reduce round trips for bulk edits
5. Ensure uploaded files are served with the correct MIME type
6. Make critical rules visible to the LLM at the point of use

---

## Changes

### 1. Tool Consolidation (29 → 24)

**Remove — confirmed duplicates:**

| Tool removed | Replaced by |
|---|---|
| `generate_course` | `save_course` (same, plus optional `course_id`) |
| `replace_lesson` | `rewrite_lesson` (identical behaviour) |
| `list_lessons` | `get_course` (returns full course including all lessons) |
| `list_blocks` | `get_course` (returns full course including all blocks) |

**Merge — same entity, split across tools:**

| Tools merged | New tool | New signature |
|---|---|---|
| `update_course_title` + `set_course_visibility` | `update_course` | `{ course_id, title?, is_public? }` — at least one field required |
| `update_lesson_title` + `reorder_lesson` | `update_lesson` | `{ course_id, lesson_id, title?, position? }` — at least one field required |

**Add — batch write:**

| New tool | Signature | Purpose |
|---|---|---|
| `rewrite_blocks` | `{ course_id, updates: [{ lesson_id, block_id, updated_block }] }` | Replace multiple blocks in one Supabase round trip |

Tools kept without change: `tidelearn_login`, `tidelearn_logout`, `list_courses`, `get_course`, `create_course`, `delete_course`, `add_lesson`, `delete_lesson`, `add_block`, `update_block`, `move_block`, `delete_block`, `save_course`, `generate_lesson`, `generate_quiz_for_lesson`, `rewrite_block`, `rewrite_lesson`, `restructure_course`, `preview_course`, `review_course`, `upload_media`.

#### Implementation notes for merged tools

**`update_course`** — `title` and `is_public` live in different places: `title` is both a top-level DB column and inside the `content` JSON blob (requiring `mutateCourse`); `is_public` is a top-level DB column only. When either or both fields are supplied, use a **single `supabase.from("courses").update(...)` call** that sets all changed columns together: `{ title, is_public, content, updated_at }`. This avoids two round trips and keeps the update atomic. When `title` is supplied, also update `content.title` inside the JSON blob (reuse the `mutateCourse` read-modify-write to get the updated `content`, then write all columns in one call).

**`update_lesson`** — delegates to the same `mutateCourse` read-modify-write used by the existing `update_lesson_title` and `reorder_lesson`. The `position` field uses the same **1-based splice semantics** as the existing `reorder_lesson` (position 1 = first, spliced in place). If `lesson_id` is not found in the course, **return an error** — do not silently no-op. This gives the LLM actionable feedback rather than a confusing success with no effect.

**`rewrite_blocks`** — fetches the course once, applies all `updates` in memory, writes back once. Each `updated_block` **must omit the `id` field** — the implementation injects `id: block_id` from the `block_id` parameter, same as `rewrite_block`. This must be documented in the tool description: *"Omit the `id` field from `updated_block` — it is set automatically from `block_id`."*

---

### 2. Error Handling

**Richer Zod error messages.** All Zod `safeParse` failures get reformatted before returning to the LLM. Instead of raw Zod output, the tool returns a plain-English list:

```
Validation failed:
- Missing required field: schemaVersion (must be 1)
- lessons[0].blocks[2]: unknown block type "bullet" — valid types are: heading, text, image, video, audio, quiz, truefalse, shortanswer, list, callout, accordion, tabs, quote, code, divider, toc
```

**Pre-flight validation — scope is specific:**

- `save_course` already calls `courseSchema.safeParse`. Change: replace raw Zod error output with the plain-English formatter using `validateCourseJson()`. The helper returns `{ ok: true, course }` or `{ ok: false, errors: string[] }`.
- `rewrite_block` already calls `blockSchema.safeParse`. Change: replace raw Zod error output with the same plain-English formatter. **Does not use `validateCourseJson()`** — it validates a single block, not a full course.
- `rewrite_blocks` (new tool) calls `blockSchema.safeParse` on each `updated_block` before attempting any write. Same plain-English formatter. If any block fails validation, return all errors and abort — no partial writes.

**`validateCourseJson(json)` helper** lives in `mcp/src/lib/validate.ts`. Used only by `save_course`. Signature: `(json: unknown) => { ok: true; course: Course } | { ok: false; errors: string[] }`.

A shared **`formatZodErrors(result: ZodError) => string[]`** utility is extracted alongside it and used by both `validateCourseJson` and the block validation in `rewrite_block` / `rewrite_blocks`.

---

### 3. Instructions

**`tidelearn://instructions` resource** — rewrite for scannability. Structure:
1. Critical rules (moved to top) — things that cause silent failures if missed
2. Recommended workflow — what to call, in what order
3. Block type reference — all valid block types with required fields
4. Tool reference — one line per tool

**Inline hints in error-prone tool descriptions:**

`save_course` description must include:
> "course_json must include `schemaVersion: 1` at the top level. Text block `text` field must be HTML (e.g. `<p>text</p>`), not markdown."

`rewrite_block` description must include:
> "Omit the `id` field from `updated_block` — it is set automatically. Text fields must be HTML, not markdown."

`rewrite_blocks` description must include:
> "Omit the `id` field from each `updated_block` — it is injected from `block_id`. Text fields must be HTML, not markdown."

---

### 4. Workflow Fixes

**`rewrite_blocks` Zod schema:**

```typescript
{
  course_id: z.string().uuid(),
  updates: z.array(z.object({
    lesson_id: z.string().uuid(),
    block_id: z.string().uuid(),
    updated_block: z.record(z.unknown()),
    // Note: updated_block must NOT include an id field — injected from block_id
  })).min(1),
}
```

**`upload_media` content-type fix.** The existing `ALLOWED_TYPES` allow-list in `media.ts` is **replaced** by a `getMimeType` helper. The `MIME_MAP` becomes the single source of truth for both allowed types and their MIME types. Files with extensions not in the map are rejected with a clear error (e.g. `"Unsupported file type: .xyz"`).

```typescript
// mcp/src/lib/mime.ts
const MIME_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
};

export function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? null;
}
```

In `upload_media`, replace the `ALLOWED_TYPES` check with: if `getMimeType(file_path)` returns `null`, return an error listing supported extensions. Otherwise use the returned MIME type as the `contentType` for the Supabase upload.

---

## Files to Change

| File | Change |
|---|---|
| `mcp/src/index.ts` | Unregister 4 removed tools; register `update_course`, `update_lesson`, `rewrite_blocks` |
| `mcp/src/tools/courses.ts` | Remove `update_course_title`, `set_course_visibility`; add `update_course` |
| `mcp/src/tools/lessons.ts` | Remove `update_lesson_title`, `reorder_lesson`, `list_lessons`; add `update_lesson` |
| `mcp/src/tools/blocks.ts` | Remove `list_blocks`; add `rewrite_blocks` |
| `mcp/src/tools/semantic.ts` | Remove `generate_course`, `replace_lesson`; update `save_course` description + error messages; update `rewrite_block` description + error messages |
| `mcp/src/lib/validate.ts` | New file — `validateCourseJson()` and `formatZodErrors()` helpers |
| `mcp/src/lib/mime.ts` | New file — `getMimeType(filepath)` helper + `MIME_MAP` |
| `mcp/src/tools/media.ts` | Replace `ALLOWED_TYPES` allow-list with `getMimeType`; pass MIME type to Supabase upload |
| `mcp/src/resources/instructions.ts` | Rewrite resource content — critical rules first, workflow, block reference, tool reference |

---

## What This Does Not Change

- Auth flow (`tidelearn_login` / `tidelearn_logout`)
- Course schema — no changes to `types/course.ts` or `mcp/src/lib/types.ts`
- The `mutateCourse` read-modify-write pattern — it already works correctly
- Any frontend code (fixes to `Editor.tsx` and `Image.tsx` were already applied)
