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
2. **kind: "content" on lessons** — every content lesson in save_course and generate_lesson MUST include \`kind: "content"\`. Omitting it causes a validation error. Assessment lessons use \`kind: "assessment"\`.
3. **Text fields accept HTML or markdown** — text block \`text\` fields, and accordion/tabs item \`content\` fields, accept either HTML (e.g. \`<p>Hello</p>\`) or markdown (e.g. \`**bold**\`). The renderer handles both automatically. Exception: callout \`text\` field should use HTML.
4. **quiz blocks use correctIndex (number, 0-based)** — NOT \`correct_answer\`. E.g. \`correctIndex: 2\` means the third option is correct.
5. **Omit id fields** — never include \`id\` in blocks, lessons, or questions passed to save_course, generate_lesson, add_block, or add_question — ids are generated automatically. For rewrite_block and rewrite_blocks, omit \`id\` from updated_block — it is injected from the block_id parameter.
6. **Always call get_course before editing** — never guess block ids or lesson ids; fetch the course to get current ids.
7. **Re-login if you get auth_required** — call tidelearn_login again then retry.
8. **This MCP runs locally** — tidelearn_login and upload_media require local execution (Claude Desktop or Claude Code). They will not work if this MCP is deployed remotely.

---

## Data Model

  Course
  ├── id (UUID)
  ├── title (string)
  ├── is_public (boolean)
  └── lessons: Lesson[]  — two kinds:

  ContentLesson (kind: "content")
  ├── id (UUID)
  ├── kind: "content"
  ├── title (string)
  └── blocks: Block[]
        ├── id (UUID)
        ├── type (string)
        └── ...type-specific fields

  AssessmentLesson (kind: "assessment")
  ├── id (UUID)
  ├── kind: "assessment"
  ├── title (string)
  ├── config: { passingScore?: number, examSize?: number }
  └── questions: AssessmentQuestion[]
        ├── id (UUID)
        ├── text (string)
        ├── options: [string, string, string, string]  — exactly 4
        ├── correctIndex: number (0–3)
        ├── feedback?: string  — shown to learner after answering
        ├── bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV"  — see Bloom's section
        └── source?: string  — topic tag for balanced exam generation

A course contains an ordered list of lessons. Content lessons contain blocks (the building blocks of a page). Assessment lessons contain a question bank used for adaptive study, exam simulation, and weak-area drills.

---

## Bloom's Taxonomy Level Codes

Assessment question \`bloomLevel\` codes map to Bloom's taxonomy:

| Code | Level | Description |
|------|-------|-------------|
| K    | Knowledge/Remember | Recall facts and definitions |
| C    | Comprehension/Understand | Explain concepts in own words |
| UN   | Understanding | Interpret and classify information (synonymous with C — either is valid) |
| AP   | Application/Apply | Use knowledge in new situations |
| AN   | Analysis/Analyse | Break down and examine relationships |
| EV   | Evaluation/Evaluate | Justify decisions and assess quality |

Note: \`C\` and \`UN\` both map to the Bloom's "Understanding" tier — use either; they are treated identically by the analytics.

Tag questions with \`bloomLevel\` to unlock the Bloom's breakdown chart on the results screen. If most questions are \`K\` or \`C\`, recommend adding \`AP\` and \`AN\` questions for deeper learning.

---

## Assessment \`source\` Field

The \`source\` field on questions is a topic tag (e.g. \`"Module 1"\`, \`"Health & Safety"\`, \`"Legal"\`). When multiple sources are present and a learner starts an exam simulation, questions are automatically balanced proportionally across sources. This is important for certification exams covering multiple topic areas. Always tag questions with \`source\` if the course content spans distinct modules or units.

---

## Recommended Workflows

### Build a content course from scratch
1. tidelearn_login → read tidelearn://instructions
2. save_course with full course_json including schemaVersion: 1 (preferred for large content — one call)
   OR
2. create_course → add_lesson → add_block (per block, good for small iterative builds)

### Add an assessment lesson to a course
1. get_course to confirm the course exists and get its structure
2. add_assessment_lesson(course_id, title, position?) — returns lesson_id
3. import_questions(course_id, lesson_id, questions[]) — bulk-add the question bank
   OR add_question one at a time
4. update_assessment_config(course_id, lesson_id, passingScore?, examSize?) — set pass threshold and exam size

### Edit an existing course
1. tidelearn_login → read tidelearn://instructions
2. get_course to read current ids and structure
3. update_block / add_block / delete_block as needed (for small edits)
   OR rewrite_lesson / rewrite_blocks (for bulk rewrites)

### Add inline knowledge checks to a content lesson
1. get_course to read the lesson content
2. generate_quiz_for_lesson(course_id, lesson_id, blocks) — appends quiz/truefalse/shortanswer blocks

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
- tidelearn_login() — opens a browser login page; give the URL to the user to click; no credentials in chat; local execution only
- tidelearn_logout() — clear session

### Courses
- list_courses() — list all courses (returns id, title, is_public, updated_at, lesson_count)
- get_course(course_id) — full course including all lessons and blocks/questions
- create_course(title) — new empty course, returns course_id and view_url
- delete_course(course_id) — permanent delete
- save_course(course_json, course_id?) — bulk-save a full course JSON (create or replace); requires schemaVersion: 1 and kind: "content" on each content lesson; returns course_id and view_url
- update_course(course_id, title?, is_public?) — rename and/or publish/unpublish; pass one or both optional fields; returns view_url when is_public is set to true
- preview_course(course_id) — render course to HTML for review (shows assessment questions inline)
- review_course(course_id) — get an analysis of course quality and structure

### Content Lessons
- add_lesson(course_id, title, position?) — new empty content lesson, returns lesson_id
- delete_lesson(course_id, lesson_id) — deletes lesson and all its blocks
- update_lesson(course_id, lesson_id, title?, position?) — rename or reorder a lesson
- get_lesson(course_id, lesson_id) — get a single lesson by id (blocks for content lessons, questions for assessment lessons); more efficient than get_course when editing one lesson
- generate_lesson(course_id, lesson_json, position?) — insert a fully-drafted lesson; lesson_json MUST include kind: "content"
- rewrite_lesson(course_id, lesson_id, blocks) — replace all blocks in a lesson
- generate_quiz_for_lesson(course_id, lesson_id, blocks) — append inline assessment blocks (quiz/truefalse/shortanswer) to a content lesson
- restructure_course(course_id, lesson_order) — reorder and/or rename lessons; lesson_order MUST include ALL lessons or the call will error

### Assessment Lessons
- add_assessment_lesson(course_id, title, position?) — new assessment lesson (question bank), returns lesson_id
- list_questions(course_id, lesson_id) — list all questions in an assessment lesson
- add_question(course_id, lesson_id, question) — add one question to the bank
- update_question(course_id, lesson_id, question_id, fields) — patch fields on a question
- delete_question(course_id, lesson_id, question_id) — remove a question
- import_questions(course_id, lesson_id, questions[]) — bulk-add questions; all-or-nothing validation
- replace_questions(course_id, lesson_id, questions[]) — atomically replace the entire question bank; all questions validated before any are committed
- update_assessment_config(course_id, lesson_id, passingScore?, examSize?) — set pass threshold and exam draw size

### Blocks (content lessons only — not usable on assessment lessons)
- add_block(course_id, lesson_id, block, position?) — add one block
- update_block(course_id, lesson_id, block_id, fields) — patch specific fields on one block
- move_block(course_id, lesson_id, block_id, new_position, target_lesson_id?) — reorder or move between lessons
- delete_block(course_id, lesson_id, block_id) — remove one block
- rewrite_block(course_id, lesson_id, block_id, updated_block) — replace one block entirely
- rewrite_blocks(course_id, updates[]) — replace multiple blocks in one call; each update has { lesson_id, block_id, updated_block }

### Media
- upload_media(file_path, course_id) — upload a local file from the user's Mac, returns a hosted URL for use in image/video/audio/document blocks; requires local execution

---

## Block Types Reference

**Omit the id field** in all blocks — it is always generated automatically.

### Text & Structure
\`\`\`
heading     { type: "heading",  text: "..." }
text        { type: "text",     text: "HTML or markdown content" }
list        { type: "list",     style: "bulleted" | "numbered",  items: ["item1", "item2"] }
quote       { type: "quote",    text: "...",  cite?: "Author" }
code        { type: "code",     language: "python",  code: "..." }
divider     { type: "divider" }
toc         { type: "toc" }
\`\`\`

### Callout (alert box)
\`\`\`
callout     { type: "callout",  variant: "info" | "success" | "warning" | "danger",  title?: "...",  text: "<p>Use HTML here</p>" }
\`\`\`
Note: callout \`text\` should be HTML, not markdown.

### Media
\`\`\`
image       { type: "image",  src: "https://...",  alt: "..." }
video       { type: "video",  url: "https://youtube.com/..." }   // YouTube, Vimeo, or direct mp4
audio       { type: "audio",  src: "https://...",  title?: "..." }
document    { type: "document",  src: "https://...",  fileType: "pdf" | "docx" | "xlsx" | "pptx",  title?: "..." }
\`\`\`

### Interactive (accordion and tabs — ids are auto-generated for items)
\`\`\`
accordion   { type: "accordion",  items: [{ title: "...", content: "HTML or markdown" }] }
tabs        { type: "tabs",       items: [{ label: "...", content: "HTML or markdown" }] }
\`\`\`
Note: item \`id\` fields are injected automatically — do not provide them.

### Inline Knowledge Checks (for content lessons only)
\`\`\`
quiz        { type: "quiz",        question: "...",  options: ["A","B","C","D"],  correctIndex: 2,  showFeedback?: true,  feedbackMessage?: "..." }
              ↑ correctIndex is a NUMBER (0-based index into options, or -1 for "not yet set"). Options need at least 2 entries.
truefalse   { type: "truefalse",   question: "...",  correct: true | false,  showFeedback?: true,  feedbackCorrect?: "...",  feedbackIncorrect?: "..." }
shortanswer { type: "shortanswer", question: "...",  answer: "...",  acceptable?: ["alt answer"],  caseSensitive?: false,  trimWhitespace?: true,  showFeedback?: true,  feedbackMessage?: "..." }
\`\`\`
These block types are for inline checks inside content lessons. For a standalone adaptive assessment, use add_assessment_lesson and the assessment tools above.

Valid block types (17 total): heading, text, image, video, audio, document, quiz, truefalse, shortanswer, list, callout, accordion, tabs, quote, code, divider, toc

---

## save_course — Full Example

Includes both a content lesson and an assessment lesson:

\`\`\`json
{
  "schemaVersion": 1,
  "title": "Fire Safety Essentials",
  "lessons": [
    {
      "kind": "content",
      "title": "Introduction",
      "blocks": [
        { "type": "heading", "text": "Welcome to Fire Safety" },
        { "type": "text", "text": "## What you will learn\\n\\nThis course covers evacuation procedures." },
        { "type": "quiz", "question": "What is the first thing to do when a fire alarm sounds?", "options": ["Ignore it", "Evacuate immediately", "Call your manager", "Finish your task"], "correctIndex": 1 }
      ]
    },
    {
      "kind": "assessment",
      "title": "Final Assessment",
      "questions": [
        {
          "text": "What does PASS stand for in fire extinguisher use?",
          "options": ["Pull, Aim, Squeeze, Sweep", "Press, Activate, Spray, Stop", "Point, Aim, Shoot, Spray", "Pull, Attack, Spray, Sweep"],
          "correctIndex": 0,
          "feedback": "PASS: Pull the pin, Aim at the base, Squeeze the handle, Sweep side to side.",
          "bloomLevel": "K",
          "source": "Module 2"
        }
      ],
      "config": { "passingScore": 80, "examSize": 20 }
    }
  ]
}
\`\`\`

---

## generate_lesson — Shape

lesson_json MUST include \`kind: "content"\`:

\`\`\`json
{
  "kind": "content",
  "title": "Lesson Title",
  "blocks": [
    { "type": "text", "text": "## Introduction\\n\\nMarkdown works here." },
    { "type": "quiz", "question": "What is X?", "options": ["A","B","C","D"], "correctIndex": 0 }
  ]
}
\`\`\`
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
