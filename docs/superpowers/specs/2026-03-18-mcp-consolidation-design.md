# MCP Consolidation Design

**Date:** 2026-03-18
**Status:** Approved
**Scope:** TideLearn MCP server (`mcp/src/`)

---

## Context

The TideLearn MCP server was first tested in a real course-build session (financial literacy course, 5 modules). The session surface several friction points:

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

---

### 2. Error Handling

**Richer Zod error messages.** All Zod `safeParse` failures get reformatted before returning to the LLM. Instead of the raw Zod output, the tool returns a plain-English list of what's wrong:

```
Validation failed:
- Missing required field: schemaVersion (must be 1)
- lessons[0].blocks[2]: unknown block type "bullet" — valid types are: heading, text, image, video, audio, quiz, truefalse, shortanswer, list, callout, accordion, tabs, quote, code, divider, toc
```

**Pre-flight validation.** `save_course`, `rewrite_block`, and `rewrite_blocks` validate inputs before attempting any Supabase write. If validation fails, the tool returns the error immediately with no write attempted. This prevents partial writes and silent failures.

Implementation: extract a shared `validateCourseJson(json)` helper in `mcp/src/lib/` that runs the Zod schema and returns either `{ ok: true, course }` or `{ ok: false, errors: string[] }`.

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

`rewrite_block` and `rewrite_blocks` descriptions must include:
> "The `updated_block` must be valid HTML in text fields — not markdown."

---

### 4. Workflow Fixes

**`rewrite_blocks` (new tool).** Accepts an array of block updates and applies them in a single read-modify-write cycle against Supabase. Signature:

```typescript
{
  course_id: z.string().uuid(),
  updates: z.array(z.object({
    lesson_id: z.string().uuid(),
    block_id: z.string().uuid(),
    updated_block: z.record(z.unknown()),
  })).min(1),
}
```

The implementation uses the existing `mutateCourse` pattern: fetch course once, apply all updates in memory, write back once.

**`upload_media` content-type fix.** When uploading, detect the file extension and set the correct MIME type:

```typescript
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
```

Falls back to `application/octet-stream` for unknown extensions. This ensures Supabase storage serves files with the correct `Content-Type` header.

---

## Files to Change

| File | Change |
|---|---|
| `mcp/src/index.ts` | Remove 4 tools, register `update_course`, `update_lesson`, `rewrite_blocks` |
| `mcp/src/tools/courses.ts` | Remove `update_course_title`, `set_course_visibility`; add `update_course` |
| `mcp/src/tools/lessons.ts` | Remove `update_lesson_title`, `reorder_lesson`; add `update_lesson` |
| `mcp/src/tools/blocks.ts` | Add `rewrite_blocks`; update `rewrite_block` description with HTML reminder |
| `mcp/src/tools/semantic.ts` | Remove `generate_course`, `replace_lesson`; update `save_course` description and add pre-flight validation; update `list_lessons`, `list_blocks` removal |
| `mcp/src/lib/validate.ts` | New file — `validateCourseJson()` helper |
| `mcp/src/lib/mime.ts` | New file — `getMimeType(filepath)` helper |
| `mcp/src/tools/media.ts` | Update `upload_media` to use `getMimeType` |
| `mcp/src/resources/instructions.ts` | Rewrite resource content |

---

## What This Does Not Change

- Auth flow (`tidelearn_login` / `tidelearn_logout`)
- Course schema — no changes to `types/course.ts` or `mcp/src/lib/types.ts`
- The `mutateCourse` read-modify-write pattern — it already works correctly
- Any frontend code (fixes to `Editor.tsx` and `Image.tsx` were already applied)
