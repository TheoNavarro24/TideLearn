import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const INSTRUCTIONS = `
# TideLearn MCP — Instructions for Claude

**Read this entire resource before calling any other tools. It contains the full block schema, tool reference, and critical rules.**

## What is TideLearn?
TideLearn is a learning management system (LMS) for creating and publishing online courses.
You interact with it entirely through these MCP tools — no direct database access needed.

---

## ⚠️ Critical Rules — read before writing any course data

1. **schemaVersion: 1** — every course_json passed to save_course MUST include \`schemaVersion: 1\` at the top level. Omitting it causes a validation error.
2. **Text fields must be HTML** — text block \`text\` fields must be HTML (e.g. \`<p>Hello</p>\`), not markdown. Markdown renders as raw text.
3. **quiz blocks use correctIndex (number, 0-based)** — NOT \`correct_answer\`. E.g. \`correctIndex: 2\` means the third option is correct.
4. **Omit id fields** — never include \`id\` in blocks or lessons passed to save_course, add_block, or add_lesson — ids are generated automatically. For rewrite_block and rewrite_blocks, omit \`id\` from updated_block — it is injected from the block_id parameter.
5. **Always call get_course before editing** — never guess block ids or lesson ids; fetch the course to get current ids.
6. **Re-login if you get auth_required** — call tidelearn_login again then retry.

---

## Data Model

  Course
  ├── id (UUID)
  ├── title (string)
  ├── is_public (boolean)
  └── lessons: Lesson[]
        ├── id (UUID)
        ├── title (string)
        └── blocks: Block[]
              ├── id (UUID)
              ├── type (string)
              └── ...type-specific fields

A course contains an ordered list of lessons. Each lesson contains an ordered list of blocks.
Blocks are the smallest unit of content — they represent a single element on the page.

---

## Recommended Workflows

### Build a course from scratch
1. tidelearn_login → read tidelearn://instructions
2. save_course with full course_json including schemaVersion: 1 (preferred for large content — one call)
   OR
2. create_course → add_lesson → add_block (per block, good for small iterative builds)

### Edit an existing course
1. tidelearn_login → read tidelearn://instructions
2. get_course to read current ids and structure
3. update_block / add_block / delete_block as needed (for small edits)
   OR rewrite_lesson / rewrite_blocks (for bulk rewrites)

### Add a quiz to an existing lesson
1. get_course to read the lesson content
2. generate_quiz_for_lesson with assessment blocks

### Rewrite a lesson
1. get_course to read current content
2. rewrite_lesson with new blocks array

### Publish a course
1. update_course(course_id, is_public: true)

### Rename a course
1. update_course(course_id, title: "New Title")

---

## Tools Reference

### Authentication
- tidelearn_login() — opens a browser login page; give the URL to the user to click; no credentials in chat
- tidelearn_logout() — clear session

### Courses
- list_courses() — list all courses (returns id, title, is_public, updated_at)
- get_course(course_id) — full course including all lessons and blocks
- create_course(title) — new empty course, returns course_id
- delete_course(course_id) — permanent delete
- save_course(course_json, course_id?) — bulk-save a full course JSON (create or replace); requires schemaVersion: 1
- update_course(course_id, title?, is_public?) — rename and/or publish/unpublish; pass one or both optional fields
- preview_course(course_id) — render course to HTML for review
- review_course(course_id) — get an analysis of course quality and structure

### Lessons
- add_lesson(course_id, title, position?) — new empty lesson, returns lesson_id
- delete_lesson(course_id, lesson_id) — deletes lesson and all its blocks
- update_lesson(course_id, lesson_id, title?, position?) — rename or reorder a lesson
- generate_lesson(course_id, lesson_json, position?) — insert a fully-drafted lesson
- rewrite_lesson(course_id, lesson_id, blocks) — replace all blocks in a lesson
- generate_quiz_for_lesson(course_id, lesson_id, blocks) — append assessment blocks to a lesson
- restructure_course(course_id, lesson_order) — reorder and/or rename lessons in bulk

### Blocks
- add_block(course_id, lesson_id, block, position?) — add one block
- update_block(course_id, lesson_id, block_id, fields) — patch specific fields on one block
- move_block(course_id, lesson_id, block_id, new_position, target_lesson_id?) — reorder or move between lessons
- delete_block(course_id, lesson_id, block_id) — remove one block
- rewrite_block(course_id, lesson_id, block_id, updated_block) — replace one block entirely
- rewrite_blocks(course_id, updates[]) — replace multiple blocks in one call; each update has { lesson_id, block_id, updated_block }

### Media
- upload_media(file_path, course_id) — upload a local file from the user's Mac, returns a hosted URL for use in image/video/audio blocks

---

## Block Types Reference

**Omit the id field** in all blocks — it is always generated automatically.

### Text & Structure
\`\`\`
heading     { type: "heading",  text: "..." }
text        { type: "text",     text: "<p>HTML content here</p>" }
list        { type: "list",     style: "bulleted" | "numbered",  items: ["item1", "item2"] }
quote       { type: "quote",    text: "...",  cite?: "Author" }
code        { type: "code",     language: "python",  code: "..." }
divider     { type: "divider" }
toc         { type: "toc" }
\`\`\`

### Callout (alert box)
\`\`\`
callout     { type: "callout",  variant: "info" | "success" | "warning" | "danger",  title?: "...",  text: "<p>HTML allowed</p>" }
\`\`\`

### Media
\`\`\`
image       { type: "image",  src: "https://...",  alt: "..." }
video       { type: "video",  url: "https://youtube.com/..." }   // YouTube, Vimeo, or direct mp4
audio       { type: "audio",  src: "https://...",  title?: "..." }
\`\`\`

### Interactive (accordion and tabs require UUID ids on their items)
\`\`\`
accordion   { type: "accordion",  items: [{ id: "<uuid>", title: "...", content: "<p>HTML</p>" }] }
tabs        { type: "tabs",       items: [{ id: "<uuid>", label: "...", content: "<p>HTML</p>" }] }
\`\`\`

### Assessment
\`\`\`
quiz        { type: "quiz",        question: "...",  options: ["A","B","C","D"],  correctIndex: 2 }
              ↑ correctIndex is a NUMBER (0-based index into options), never a string
truefalse   { type: "truefalse",   question: "...",  correct: true | false,  feedbackCorrect?: "...",  feedbackIncorrect?: "..." }
shortanswer { type: "shortanswer", question: "...",  answer: "...",  acceptable?: ["alt answer"],  caseSensitive?: false,  trimWhitespace?: true }
\`\`\`

Valid block types (16 total): heading, text, image, video, audio, quiz, truefalse, shortanswer, list, callout, accordion, tabs, quote, code, divider, toc
`.trim();

export function registerInstructionsResource(server: McpServer) {
  server.resource(
    "tidelearn-instructions",
    "tidelearn://instructions",
    { mimeType: "text/plain" },
    async () => ({
      contents: [
        {
          uri: "tidelearn://instructions",
          mimeType: "text/plain",
          text: INSTRUCTIONS,
        },
      ],
    })
  );
}
