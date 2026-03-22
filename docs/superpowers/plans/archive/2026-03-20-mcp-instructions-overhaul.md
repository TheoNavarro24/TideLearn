# MCP Instructions & Tool Descriptions Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix LLM friction when using the TideLearn MCP — wrong tool names, a false description, and no guaranteed session-level context caused schema errors and tool-not-found failures during testing.

**Architecture:** String-only changes to tool descriptions, the instructions resource, and McpServer constructor options. No functional code changes — all changes are TypeScript string literals.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` (`McpServer`, `ServerOptions`)

---

## Background

A test session revealed an LLM made schema errors because:
1. No session-level instructions are surfaced on connection (before any tool call)
2. Two tool names in the instructions resource are wrong — they reference non-existent tools
3. `update_block` description falsely says "text fields are plain strings, not HTML"
4. `save_course` has no concrete example — LLMs guess field names
5. `generate_lesson` and `generate_quiz_for_lesson` don't show block shape
6. `tidelearn_login` response directs the LLM to fetch a resource rather than embedding critical rules inline

## Constraints

- No functional changes — descriptions and string constants only
- Do not change tool names, parameter schemas, or handler logic
- Do not touch `mcp/src/tools/courses.ts`, `mcp/src/tools/lessons.ts`, `mcp/src/tools/media.ts`, `mcp/src/tools/preview.ts`
- Each task must compile with zero TypeScript errors

## Files Modified

| File | Changes |
|------|---------|
| `mcp/src/index.ts` | Add `instructions` string to `McpServer` constructor second argument |
| `mcp/src/resources/instructions.ts` | Fix 2 wrong tool names; update header line |
| `mcp/src/tools/blocks.ts` | Fix `update_block` description (HTML not plain strings) |
| `mcp/src/tools/semantic.ts` | Add examples to `save_course`, `generate_lesson`, `generate_quiz_for_lesson` |
| `mcp/src/tools/auth.ts` | Inject critical rules inline in login success response message |

---

### Task 1: Add `ServerOptions.instructions` to McpServer constructor

**Files:**
- Modify: `mcp/src/index.ts`

**Problem:** `McpServer({ name: "tidelearn", version: "1.0.0" })` has no `instructions` field. The MCP SDK surfaces this string in the `initialize` response — it is the only guarantee the LLM sees instructions before calling any tool. Currently nothing is surfaced.

- [ ] **Step 1: Replace McpServer constructor in `mcp/src/index.ts`**

Replace:
```typescript
const server = new McpServer({
  name: "tidelearn",
  version: "1.0.0",
});
```

With:
```typescript
const server = new McpServer(
  { name: "tidelearn", version: "1.0.0" },
  {
    instructions: `TideLearn MCP — critical rules (read before calling any tool):
1. schemaVersion: 1 — every course_json passed to save_course MUST include schemaVersion: 1 at the top level.
2. HTML not markdown — text block "text" fields must be HTML (e.g. "<p>Hello</p>"), not markdown.
3. correctIndex — quiz blocks use correctIndex (number, 0-based), NOT correct_answer.
4. Omit id fields — never include id in blocks or lessons; ids are generated automatically.
5. Always call get_course before editing — never guess block_ids or lesson_ids.
6. Re-login on auth_required — call tidelearn_login again then retry.

Full block schema and tool reference: read the tidelearn://instructions resource.`,
  }
);
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0, zero errors

- [ ] **Step 3: Verify instructions field is present**

Run: `grep -n "instructions" /Users/theonavarro/TideLearn/mcp/src/index.ts`
Expected: shows the new field

- [ ] **Step 4: Commit**

```bash
git add mcp/src/index.ts
git commit -m "fix(mcp): add ServerOptions.instructions to McpServer — surfaces critical rules on every connection"
```

---

### Task 2: Fix wrong tool names in instructions resource

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

**Problem:** The Workflows section and Tools Reference section reference two tools that do not exist:
- `set_course_visibility(course_id, is_public)` — does not exist
- `update_course_title(course_id, title)` — does not exist

The real tool is `update_course(course_id, title?, is_public?)`.

- [ ] **Step 1: Fix the header line in the `INSTRUCTIONS` constant**

Old:
```
**You are reading this because tidelearn_login succeeded. Read this entire resource before calling any other tools.**
```

New:
```
**Read this entire resource before calling any other tools. It contains the full block schema, tool reference, and critical rules.**
```

- [ ] **Step 2: Fix Workflows section — Publish a course**

Old:
```
### Publish a course
1. set_course_visibility(course_id, is_public: true)
```

New:
```
### Publish a course
1. update_course(course_id, is_public: true)
```

- [ ] **Step 3: Fix Workflows section — Rename a course**

Old:
```
### Rename a course
1. update_course_title(course_id, title: "New Title")
```

New:
```
### Rename a course
1. update_course(course_id, title: "New Title")
```

- [ ] **Step 4: Fix Tools Reference section**

Old (two lines):
```
- update_course_title(course_id, title) — rename a course
- set_course_visibility(course_id, is_public) — publish (true) or unpublish (false)
```

New (one line):
```
- update_course(course_id, title?, is_public?) — rename and/or publish/unpublish; pass one or both optional fields
```

- [ ] **Step 5: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0

- [ ] **Step 6: Verify old strings are gone**

Run: `grep -n "set_course_visibility\|update_course_title" /Users/theonavarro/TideLearn/mcp/src/resources/instructions.ts`
Expected: zero matches

- [ ] **Step 7: Commit**

```bash
git add mcp/src/resources/instructions.ts
git commit -m "fix(mcp): replace non-existent tool names in instructions resource with update_course"
```

---

### Task 3: Fix `update_block` description bug

**Files:**
- Modify: `mcp/src/tools/blocks.ts`

**Problem:** The `update_block` description ends with `"Text fields are plain strings, not HTML."` — this is false. `text` block `text` fields must be HTML. This directly contradicts every other tool description and the instructions resource.

- [ ] **Step 1: Replace the `update_block` description string**

Old:
```typescript
"Update specific fields of a block (partial patch). Pass only the fields you want to change — type and id are preserved automatically. Text fields are plain strings, not HTML.",
```

New:
```typescript
"Update specific fields of a block (partial patch). Pass only the fields you want to change — type and id are preserved automatically. Text fields (e.g. text block \"text\" field) must be HTML (e.g. \"<p>content</p>\"), not markdown.",
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0

- [ ] **Step 3: Verify old string is gone**

Run: `grep -n "plain strings, not HTML" /Users/theonavarro/TideLearn/mcp/src/tools/blocks.ts`
Expected: zero matches

- [ ] **Step 4: Commit**

```bash
git add mcp/src/tools/blocks.ts
git commit -m "fix(mcp): correct update_block description — text fields are HTML not plain strings"
```

---

### Task 4: Add working example to `save_course` description

**Files:**
- Modify: `mcp/src/tools/semantic.ts`

**Problem:** `save_course` lists rules but provides no concrete example. An LLM must guess field names, often omitting `schemaVersion` or using `correct_answer` instead of `correctIndex`.

- [ ] **Step 1: Replace the `save_course` description template literal**

The current description starts at approximately line 31. Replace the entire template literal (from the opening backtick after the tool name to the closing backtick before the comma) with:

```typescript
`Bulk-save a full course (create new or replace existing). Omit all id fields — they are generated automatically. Pass course_id to replace an existing course.

REQUIRED fields and types:
- schemaVersion: 1 (number literal) at the top level — omitting causes validation error
- text blocks: "text" field must be HTML e.g. "<p>Hello</p>", not markdown
- quiz blocks: use "correctIndex" (number, 0-based) not "correct_answer"
- accordion/tabs items: each item needs an "id" field (UUID)

MINIMAL EXAMPLE — one text block + one quiz block:
{
  "schemaVersion": 1,
  "title": "My Course",
  "lessons": [
    {
      "title": "Lesson 1",
      "blocks": [
        { "type": "text", "text": "<p>Welcome to the lesson.</p>" },
        { "type": "quiz", "question": "What is 2+2?", "options": ["3","4","5","6"], "correctIndex": 1 }
      ]
    }
  ]
}

If unsure of schema, read the tidelearn://instructions resource for the full block type reference.`,
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/semantic.ts
git commit -m "fix(mcp): add minimal working example to save_course description"
```

---

### Task 5: Improve `generate_lesson` and `generate_quiz_for_lesson` descriptions

**Files:**
- Modify: `mcp/src/tools/semantic.ts`

**Problem:** Both descriptions say "Claude should generate X before calling this tool" but do not show what the data shape looks like. An LLM has to guess.

- [ ] **Step 1: Replace `generate_lesson` description**

Old:
```typescript
"Insert a fully-drafted lesson into an existing course. Claude should generate the lesson_json before calling this tool.",
```

New:
```typescript
`Insert a fully-drafted lesson into an existing course at the given position. Omit id fields — they are generated automatically.

lesson_json shape:
{
  "title": "Lesson Title",
  "blocks": [
    { "type": "text", "text": "<p>HTML content.</p>" },
    { "type": "quiz", "question": "...", "options": ["A","B","C"], "correctIndex": 0 }
  ]
}

Text fields must be HTML. See tidelearn://instructions for all block types.`,
```

- [ ] **Step 2: Replace `generate_quiz_for_lesson` description**

Old:
```typescript
"Append assessment blocks to a lesson. Claude should read the lesson first (via get_course), generate the blocks, then call this tool.",
```

New:
```typescript
`Append assessment blocks to a lesson. Read the lesson first via get_course, then draft the blocks and call this tool. Omit id fields — they are generated automatically.

blocks array shape:
[
  { "type": "quiz", "question": "What is X?", "options": ["A","B","C","D"], "correctIndex": 2 },
  { "type": "truefalse", "question": "True or false: Y?", "correct": true },
  { "type": "shortanswer", "question": "Define Z.", "answer": "expected answer" }
]

Only assessment block types are appropriate here: quiz, truefalse, shortanswer.`,
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0

- [ ] **Step 4: Commit**

```bash
git add mcp/src/tools/semantic.ts
git commit -m "fix(mcp): add block shape examples to generate_lesson and generate_quiz_for_lesson"
```

---

### Task 6: Inject critical rules inline in `tidelearn_login` response

**Files:**
- Modify: `mcp/src/tools/auth.ts`

**Problem:** The login response only says "open this URL and tell me when you're done." Even when login IS called, the LLM doesn't get the critical rules in context — it has to make a separate call to read the resource. Adding the rules inline to the response means they appear in context immediately after the tool resolves.

- [ ] **Step 1: Replace the `message` string in the `ok({...})` call inside `tidelearn_login`**

Old:
```typescript
message: `Open this URL in your browser to log in:\n\n${url}\n\nOnce you've signed in, close the tab and continue.`,
```

New:
```typescript
message: `Open this URL in your browser to log in:\n\n${url}\n\nOnce you've signed in, close the tab and tell me.\n\n--- Critical rules (apply immediately) ---\n1. schemaVersion: 1 — every course_json passed to save_course MUST include schemaVersion: 1 at the top level.\n2. HTML not markdown — text block "text" fields must be HTML (e.g. "<p>Hello</p>"), not markdown.\n3. correctIndex — quiz blocks use correctIndex (number, 0-based), NOT correct_answer.\n4. Omit id fields — never include id in blocks or lessons; ids are generated automatically.\n5. Always call get_course before editing — never guess block_ids or lesson_ids.\n\nFull block schema and tool reference: read tidelearn://instructions`,
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: exits with code 0

- [ ] **Step 3: Commit**

```bash
git add mcp/src/tools/auth.ts
git commit -m "fix(mcp): inject critical rules inline in tidelearn_login success response"
```

---

## Final Verification Checklist

- [ ] `cd /Users/theonavarro/TideLearn/mcp && npm run build` exits with code 0
- [ ] `grep -rn "set_course_visibility\|update_course_title" mcp/src/` — zero matches
- [ ] `grep -n "plain strings, not HTML" mcp/src/tools/blocks.ts` — zero matches
- [ ] `grep -n "instructions" mcp/src/index.ts` — shows the new ServerOptions.instructions field
- [ ] Integration test: next `save_course` call on a fresh session produces zero schema validation errors
