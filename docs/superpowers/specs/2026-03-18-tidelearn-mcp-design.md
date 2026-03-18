# TideLearn MCP — Design Spec
**Date:** 2026-03-18
**Status:** Approved for implementation

---

## Overview

A local MCP (Model Context Protocol) server that gives Claude Desktop hands-on access to TideLearn courses. Theo acts as Head Instructional Designer; Claude is the junior employee that executes structural and content work. Skills handle the instructional design thinking — the MCP handles the doing.

---

## Architecture

### Location
A `mcp/` subfolder inside the TideLearn repository. This keeps it alongside the app and allows sharing the course type definitions.

```
TideLearn/
  mcp/
    src/
      index.ts          ← MCP server entry point, tool registration
      tools/
        courses.ts      ← Course CRUD tools
        lessons.ts      ← Lesson CRUD tools
        blocks.ts       ← Block CRUD tools
        semantic.ts     ← High-level authoring tools
        preview.ts      ← HTML renderer for preview/review
      lib/
        supabase.ts     ← Supabase client (user session + service role for storage)
        auth.ts         ← OAuth login flow, Keychain token storage, callback server
        types.ts        ← Course types, Zod schemas (mirrored from src/types/course.ts)
        uid.ts          ← ID generation (same uid() as the app)
    package.json
    tsconfig.json
    .env.example        ← Documents required env vars, never committed
```

### Transport
`stdio` — the standard transport for Claude Desktop MCP servers. Claude Desktop launches the MCP as a local process; no ports or networking required.

### Runtime
Node.js (v18+). Consistent with the project's tooling. The Deno runtime is only used for Supabase Edge Functions.

### Authentication

The MCP uses a **browser-based OAuth login flow** so that each user logs in with their own account (Google, Apple, or email). This supports multiple testers and avoids storing any master credentials locally.

**First-time setup flow:**
1. User starts a conversation with Claude Desktop
2. The MCP detects no stored session and returns a login URL to Claude
3. Claude shows the URL to the user: *"Please open this link to log in to TideLearn"*
4. User clicks the link, browser opens, they log in via Google/Apple/email as normal
5. Supabase redirects to `http://localhost:54399/callback` — a temporary local server the MCP spins up to catch the token (port 54399 chosen to avoid conflict with Supabase local dev on 54321)
6. MCP receives the session token and stores it in the **macOS Keychain** (same place Safari stores passwords)
7. Subsequent runs read the token from Keychain silently — no login needed again until the session expires

**Token storage:** macOS Keychain under the key `tidelearn-mcp-session`. The Supabase client handles token refresh automatically.

**For Supabase Storage uploads (`upload_media`):** the service role key is still required, as storage bucket operations need admin access. This is stored in `mcp/.env` and never committed. It is separate from user auth and only used for the storage bucket — not for reading or writing course data.

Required environment variables:
```
SUPABASE_URL=https://rljldeobjtgoqttuxhsf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — for storage uploads only>
```

### Claude Desktop Config
One-time setup: add an entry to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "tidelearn": {
      "command": "node",
      "args": ["/Users/theonavarro/TideLearn/mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

---

## Data Model

Courses are stored in Supabase in the `courses` table with these columns:

```
courses
  id         UUID (PK)
  user_id    UUID (FK → auth.users)
  title      TEXT
  content    JSONB
  is_public  BOOLEAN
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

The `content` JSONB column stores the full `Course` object:

```
Course
  schemaVersion: 1
  title: string
  lessons: Lesson[]
    id: string
    title: string
    blocks: Block[]
      id: string
      type: BlockType
      ...type-specific fields
```

`user_id` is a top-level table column — it is NOT inside the JSONB content. Once logged in via OAuth, the MCP knows the current user's `user_id` directly from the session token.

### Block Types (17)
| Category | Types |
|---|---|
| Text | heading, text, code, list, quote, divider, toc, callout |
| Media | image, video, audio |
| Interactive | accordion, tabs |
| Knowledge | quiz, truefalse, shortanswer |

### Rich Text Fields
The following fields store **TipTap HTML strings**, not plain text:
- `TextBlock.text`
- `CalloutBlock.text`
- `QuoteBlock.text`
- `AccordionBlock.items[].content`
- `TabsBlock.items[].content`

When Claude writes content for these fields, it must produce valid HTML (e.g. `<p>text</p>`, `<strong>bold</strong>`).

### ID Generation
All block IDs and nested item IDs (accordion, tabs sub-items) are generated **server-side by the MCP** using the same `uid()` function the app uses. Claude never needs to supply IDs.

---

## Tool Inventory (27 tools)

### Course CRUD (6)
| Tool | Inputs | Returns |
|---|---|---|
| `list_courses` | — | Array of `{id, title, is_public, updated_at}` |
| `get_course` | `course_id` | Full course JSON |
| `create_course` | `title` | `{course_id}` |
| `update_course_title` | `course_id, title` | Confirmation |
| `delete_course` | `course_id` | Confirmation |
| `set_course_visibility` | `course_id, is_public` | Confirmation |

### Lesson CRUD (5)

| Tool | Inputs | Returns |
|---|---|---|
| `list_lessons` | `course_id` | Array of `{id, title, position}` |
| `add_lesson` | `course_id`, `title`, `position?` (1-based) | `{lesson_id}` |
| `update_lesson_title` | `course_id`, `lesson_id`, `title` | Confirmation |
| `reorder_lesson` | `course_id`, `lesson_id`, `new_position` (1-based) | Confirmation |
| `delete_lesson` | `course_id`, `lesson_id` | Confirmation |

**`reorder_lesson` notes:** Splice semantics — the lesson is removed from its current position and inserted at `new_position`; all other lessons shift accordingly.

### Block CRUD (5)

| Tool | Inputs | Returns |
|---|---|---|
| `list_blocks` | `course_id`, `lesson_id` | Array of `{id, type, position}` |
| `add_block` | `course_id`, `lesson_id`, `block` (no `id` required), `position?` (1-based) | `{block_id}` |
| `update_block` | `course_id`, `lesson_id`, `block_id`, `fields` (partial patch) | Confirmation |
| `move_block` | `course_id`, `lesson_id`, `block_id`, `new_position`, `target_lesson_id?` | Confirmation |
| `delete_block` | `course_id`, `lesson_id`, `block_id` | Confirmation |

**`update_block` notes:** `fields` is a partial object — only include the keys to change. Rich text fields (`text`, `content`) must be valid HTML strings (e.g. `<p>text</p>`).

**`move_block` notes:** `new_position` is 1-based and refers to the target lesson's block list. If `target_lesson_id` is omitted, the block stays in the same lesson. Cross-lesson moves update both the source and target lesson arrays.

### Semantic / High-level (10)

All generate/rewrite tools follow the same pattern: **Claude produces the content in the conversation first, then calls the tool to save it.** The tools are pure persistence — there are no internal AI calls.

**Auth check:** Every tool checks for a valid session before executing. If no session exists (first use, or after expiry), the tool returns a login URL instead of executing its action. The user clicks the link, logs in, and then re-runs their request. No separate `login` tool is needed — auth is handled transparently on demand.

---

**`save_course`**
- Input: `course_json` (full Course object, no IDs), `course_id?`
- Returns: `{course_id}`
- If `course_id` omitted → creates a new course. If provided and exists → replaces wholesale. If provided but not found → `course_not_found` error. IDs always regenerated by MCP.

**`replace_lesson`**
- Input: `course_id`, `lesson_id`, `blocks[]` (no IDs required)
- Returns: confirmation
- Deletes all existing blocks in the lesson and inserts the new ones. MCP generates all IDs.

**`generate_course`**
- Input: `course_json` (full Course object, no IDs)
- Returns: `{course_id}`
- Claude drafts the complete course structure in the conversation, then passes it here to be saved.

**`generate_lesson`**
- Input: `course_id`, `lesson_json` (full Lesson, no IDs), `position?`
- Returns: `{lesson_id}`
- Claude drafts the lesson in the conversation, then passes it here to be inserted.

**`generate_quiz_for_lesson`**
- Input: `course_id`, `lesson_id`, `blocks[]` (assessment blocks, no IDs)
- Returns: `{block_ids[]}`
- Claude reads the lesson via `get_course`, generates assessment blocks in the conversation, then passes them here to be appended.

**`rewrite_block`**
- Input: `course_id`, `lesson_id`, `block_id`, `updated_block` (full block, no ID)
- Returns: confirmation
- Claude fetches the current block via `get_course`, rewrites it in the conversation, then passes the updated version here.

**`rewrite_lesson`**
- Input: `course_id`, `lesson_id`, `blocks[]` (full replacement, no IDs)
- Returns: confirmation
- Claude fetches the lesson via `get_course`, rewrites all blocks in the conversation, then passes the new array. Internally delegates to the `replace_lesson` logic.

**`restructure_course`**
- Input: `course_id`, `lesson_order[]` — array of `{lesson_id, title}` in the desired new order
- Returns: confirmation
- Claude inspects the course structure and provides the new ordering. Tool applies title renames and reorders only — no lessons are added or removed.

**`preview_course`**
- Input: `course_id`
- Returns: self-contained HTML string (returned as text in the tool response)
- Implemented in `preview.ts`. Claude reads the HTML to assess content flow, block variety, and layout.

**`review_course`**
- Input: `course_id`
- Returns:
  ```json
  {
    "lesson_count": 5,
    "block_count": 42,
    "block_type_breakdown": { "text": 12, "heading": 10, "quiz": 4, "..." : "..." },
    "assessment_count": 4,
    "estimated_read_minutes": 8,
    "gaps": [
      { "type": "no_assessment", "lesson_id": "...", "message": "Lesson has no knowledge checks" },
      { "type": "no_media",      "lesson_id": "...", "message": "Lesson has no media blocks" },
      { "type": "too_long",      "lesson_id": "...", "message": "Lesson has 14 blocks (max 10)" }
    ]
  }
  ```
- Gap rules: `no_assessment` = lesson has no knowledge-category blocks; `no_media` = lesson has no media-category blocks; `too_long` = lesson has >10 blocks. Read time estimated at 200 wpm.

### Media (1)
| Tool | Inputs | Returns |
|---|---|---|
| `upload_media` | `file_path` (absolute local path), `course_id` | Public Supabase Storage URL |

`course_id` is used to organise files in storage. `user_id` is taken directly from the OAuth session — no lookup needed. Files are stored at `{user_id}/{course_id}/{filename}`.

Accepted types: `jpg`, `png`, `webp`, `gif`, `mp3`, `wav`, `mp4`, `webm`. Max size: 50 MB. Type and size are validated before upload; violations return a `validation_error`.

After uploading, the returned URL can be passed directly to `add_block` or `update_block` for image/audio/video blocks.

---

## Supabase Storage

A new `course-media` bucket will be created in the project's Supabase instance. Files are stored at `{user_id}/{course_id}/{filename}` and served via public URL. This is the first file upload infrastructure in TideLearn — currently the web app only accepts external URLs.

---

## Preview Tool

`preview_course` renders a course to a self-contained HTML string using inline CSS. It mirrors the visual layout of the TideLearn viewer closely enough that Claude can assess:
- Content coverage and flow
- Block variety and pacing
- Assessment placement
- Estimated reading time

The HTML is returned as text in the tool response — Claude reads it directly without opening a browser.

---

## Error Handling

All tools return structured errors:
```json
{ "code": "course_not_found", "message": "No course with id xyz" }
```

`code` is a machine-readable string; `message` is a human-readable explanation.

Common codes: `course_not_found`, `lesson_not_found`, `block_not_found`, `invalid_block_type`, `validation_error`, `storage_error`, `unsupported_file_type`, `file_too_large`.

---

## Out of Scope (Future)

- PDF block type (upload works, but TideLearn has no block to display PDFs)
- Attachment / download block type
- Image generation (Claude is a reasoning model, not an image model — use DALL-E/Midjourney externally, then `upload_media`)
- Multi-user / collaborative editing
- SCORM export via MCP (already exists in the web app)
