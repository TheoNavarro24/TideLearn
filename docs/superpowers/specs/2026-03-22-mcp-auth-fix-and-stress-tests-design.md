# MCP Auth Fix & Stress Test Suite — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Two deliverables — (1) replace embedded login page with real app auth redirect, (2) comprehensive stress test suite covering all 33 MCP tools

---

## Part 1: MCP Auth Fix

### Problem

`mcp/src/tools/auth.ts` contains a self-contained embedded HTML login page (`LOGIN_PAGE`). It:
- Has old branding not matching the current app
- Only supports email/password — no Google OAuth
- Must be manually updated whenever the app's auth UI changes
- Is invisible to the app's auth route, so any session management improvements don't apply

### Solution

Remove `LOGIN_PAGE` entirely. `tidelearn_login` redirects to the real app's `/auth` page via a `mcp_callback` query param. The app handles login (any method), then redirects back to the MCP's local server with the session tokens.

### Flow

```
1. MCP starts local HTTP server on random port (e.g. 38472)
2. Generates: ${APP_URL}/auth?mcp_callback=http://localhost:38472/callback
3. Returns URL to Claude → Claude gives it to user
4. User opens URL in browser
5. App's /auth page detects ?mcp_callback param:
   a. Saves it to sessionStorage["mcp_callback"] (survives OAuth page navigation)
   b. If user is already authenticated, reads session immediately and redirects to callback
6. User signs in (email/password OR Google)
   - Email/password: session available immediately after signInWithPassword resolves
   - Google OAuth: signInWithOAuth redirects browser to Google, then back to app via
     Supabase's onAuthStateChange SIGNED_IN event — the app reads sessionStorage to
     recover the mcp_callback URL
7. On SIGNED_IN auth state change (or immediate resolution for email/password):
   - App calls supabase.auth.getSession()
   - Clears sessionStorage["mcp_callback"]
   - Redirects to: {mcp_callback}?access_token={token}&refresh_token={token}&expires_at={ts}
8. MCP local server receives tokens, saves to ~/.tidelearn-session.json
9. Server closes, tool returns success message
```

**Key detail — Google OAuth survives page navigation via `sessionStorage`:** Component state is destroyed when the browser navigates to Google and back. `sessionStorage` persists across navigations within the same tab, so the `mcp_callback` URL is recoverable after the OAuth round-trip. `onAuthStateChange` fires the `SIGNED_IN` event on return, which is where the redirect to the MCP callback happens.

**Key detail — already-authenticated user:** The existing `Auth.tsx` has a `useEffect` that redirects already-logged-in users away from `/auth` to `"/"`. The new logic must run before this redirect: check `sessionStorage["mcp_callback"]`, and if present, redirect to the callback with the current session tokens instead of to `"/"`.

### Token passing

Tokens are passed as query params on the redirect to `localhost`. This is acceptable because:
- The connection is loopback (localhost only, not over network)
- The server closes immediately after receiving them
- No third party can intercept localhost traffic

### Local server behaviour

The existing 10-minute auto-close timeout in `auth.ts` is preserved. If the user never completes login, the server closes after 10 minutes and the tool returns a timeout error.

### Files changed

| File | Change |
|------|--------|
| `mcp/src/tools/auth.ts` | Remove `LOGIN_PAGE` constant and HTML serving. Local server only serves `/callback` route. Preserve 10-minute timeout. Return message points user to open the generated URL. |
| `src/routes/auth` (Auth.tsx) | (1) On mount: if `?mcp_callback` present, save to `sessionStorage`. (2) In `handleEmailAuth` success branch: check `sessionStorage["mcp_callback"]` before redirecting — if present, redirect to callback with tokens instead of to `"/"`. (3) In `onAuthStateChange` SIGNED_IN handler: if `sessionStorage["mcp_callback"]` exists, redirect there with tokens (covers Google OAuth). (4) In already-authenticated redirect effect: check sessionStorage first — if mcp_callback present, redirect to callback instead of to `"/"`. |

### APP_URL handling

`APP_URL` is already exported from `mcp/src/lib/supabase.ts`:
```ts
export const APP_URL = process.env.APP_URL ?? "https://tidelearn.com";
```

Local dev: set `APP_URL=http://localhost:5173` in MCP env.
Production: defaults to `https://tidelearn.com`.

### Callback server

The local server in `auth.ts` currently serves the full login page. After this fix it only needs one route:

```
GET /callback?access_token=...&refresh_token=...&expires_at=...
  → Parse tokens
  → Save to ~/.tidelearn-session.json
  → Return 200 with a plain "Logged in — you can close this tab" message
  → Close server
```

---

## Part 2: Stress Test Suite

### Architecture

Two layers serving different purposes:

| Layer | Type | Tool | When to run | Needs credentials |
|-------|------|------|-------------|-------------------|
| 1 | Vitest unit/integration | `npm test` | Every commit, CI | No |
| 2 | Agentic playbook | Claude + MCP tools | Manual validation, after deploys | Yes (agent Google account) |

---

## Layer 1: Vitest Tests

Target: ≥120 tests (up from ~48). All use mock Supabase — no credentials required.

### Test fixtures (shared across test files)

Derived from the `factories` object in `types.ts`. All 17 block types with IDs injected:

```ts
// fixtures/blocks.ts — export one valid instance of each block type
export const ALL_BLOCKS: Block[] = [
  { id: "b-heading",     type: "heading",     text: "Test Heading" },
  { id: "b-text",        type: "text",        text: "<p>Test paragraph</p>" },
  { id: "b-image",       type: "image",       src: "https://picsum.photos/800/400", alt: "Test image" },
  { id: "b-video",       type: "video",       url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { id: "b-audio",       type: "audio",       src: "https://www.w3schools.com/html/horse.mp3", title: "Audio clip" },
  { id: "b-document",    type: "document",    src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf", fileType: "pdf", title: "WCAG 2.1" },
  { id: "b-quiz",        type: "quiz",        question: "What is 2+2?", options: ["3","4","5","6"], correctIndex: 1 },
  { id: "b-truefalse",   type: "truefalse",   question: "The sky is blue.", correct: true, showFeedback: true, feedbackCorrect: "Yes!", feedbackIncorrect: "No!" },
  { id: "b-shortanswer", type: "shortanswer", question: "Capital of France?", answer: "Paris", acceptable: ["paris"], caseSensitive: false, trimWhitespace: true },
  { id: "b-list",        type: "list",        style: "bulleted", items: ["Alpha", "Beta", "Gamma"] },
  { id: "b-callout",     type: "callout",     variant: "warning", title: "Note", text: "<p>Pay attention.</p>" },
  { id: "b-accordion",   type: "accordion",   items: [{ id: "a1", title: "Q1", content: "Answer 1" }, { id: "a2", title: "Q2", content: "Answer 2" }] },
  { id: "b-tabs",        type: "tabs",        items: [{ id: "t1", label: "Tab A", content: "Content A" }, { id: "t2", label: "Tab B", content: "Content B" }] },
  { id: "b-quote",       type: "quote",       text: "To be or not to be.", cite: "Shakespeare" },
  { id: "b-code",        type: "code",        language: "typescript", code: "const x = 42;" },
  { id: "b-divider",     type: "divider" },
  { id: "b-toc",         type: "toc" },
];

export const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  { id: "q1", text: "What is PASS?", options: ["Pull Aim Squeeze Sweep", "Press Activate Spray Stop", "Point Aim Shoot Spray", "Push Aim Spray Sweep"], correctIndex: 0, bloomLevel: "K", source: "Module 1", feedback: "PASS is the acronym." },
  { id: "q2", text: "When should you evacuate?", options: ["Never", "Only if told", "Immediately on alarm", "After finishing work"], correctIndex: 2, bloomLevel: "AP", source: "Module 2" },
];
```

### Test file breakdown

#### `tests/schema.test.ts` (extend, currently 10 tests → ~30)

**Valid block coverage (17 tests — one per type)**
- Each block in `ALL_BLOCKS` parses successfully with `blockSchema.safeParse`

**Invalid block cases (~10 tests)**
- `quiz` with `correctIndex: "1"` (string, not number) → fail
- `quiz` with `correctIndex: 4` (out of range per AssessmentQuestion but quiz uses plain number — test the boundary)
- `truefalse` with `correct: "true"` (string) → fail
- `accordion` item missing `title` → fail
- `tabs` item missing `label` → fail
- `image` missing `alt` → fail
- `document` with `fileType: "mp3"` → fail
- `callout` with `variant: "purple"` → fail
- `list` with `style: "ordered"` (not a valid enum) → fail
- Unknown `type: "banner"` → fail

#### `tests/inject.test.ts` (extend, currently 10 tests → ~18)

**Additional cases**
- Course with only assessment lessons: all get IDs, no `kind: "content"` injected
- Course with only content lessons: all get `kind: "content"`, blocks get IDs
- Mixed course: each lesson type handled correctly independently
- Content lesson with accordion AND tabs: both get sub-item IDs
- Block with pre-existing `id`: existing ID preserved, not overwritten
- Question with pre-existing `id`: preserved
- Empty `blocks` array: no crash
- Empty `questions` array: no crash

#### `tests/validate.test.ts` (new file, ~14 tests)

**Valid cases**
- Course with all 17 block types passes
- Course with only assessment lesson passes
- Course with 0 lessons passes

**Invalid cases**
- Missing `schemaVersion` → error mentions `schemaVersion`
- `schemaVersion: 2` → error
- Lesson missing `kind` → error
- Content lesson with `questions` field → passes (passthrough schema)
- Assessment lesson with 3-option question → error (tuple requires exactly 4)
- Assessment lesson with `correctIndex: 5` → error (max 3)
- `title` missing from course → error
- `lessons` not an array → error

#### `tests/preview.test.ts` (extend, currently 12 tests → ~30)

**`renderCourseToHtml` all block types (~17 tests)**
Each block in `ALL_BLOCKS` rendered in a course:
- Output is a non-empty string
- Output does not contain `[Unknown block type]`
- Output contains expected identifying text (heading text, question text, etc.)

**Assessment rendering (~5 tests)**
- 0 questions → "No questions in bank yet" message
- 1 question → text, options, ✓ marker all present
- Question with `feedback` → feedback rendered
- Question with `bloomLevel` → badge rendered
- Question with `source` → badge rendered

**`analyzeCourse` gap matrix (~8 tests — extend existing)**
- Lesson with only a heading → flagged `too_short`
- Lesson with heading + image + text (no quiz) + course has no assessment lesson → flagged `no_assessment`
- Lesson with heading + image + text (no quiz) + course HAS assessment lesson → NOT flagged
- Lesson with no heading → flagged `no_heading`
- Lesson with no image/video → flagged `no_media`
- Lesson meeting all criteria → no gaps
- Multiple gaps on one lesson → all reported
- Course with no lessons → no crash, empty gaps array

#### `tests/mutate.test.ts` (extend, currently 2 tests → ~8)

- DB error on fetch → returns error string
- DB error on save → returns error string
- User ID mismatch (userId !== course.user_id) → returns `course_not_found`
- Course content is null → returns `course_not_found`
- Mutation function throws → error propagated

#### `tests/tool-mocks.test.ts` (new file, ~25 tests)

Mock Supabase client tests for tool-level error paths not covered elsewhere:

**`get_lesson`**
- Course not found → `course_not_found` error
- Lesson not found → `lesson_not_found` error
- Lesson found → returns full lesson object

**`replace_questions`**
- Target is content lesson → `not_assessment` error
- Lesson not found → `lesson_not_found` error
- Success → returns `{ replaced: N, question_ids: [...] }` with new IDs

**`add_block` on assessment lesson**
- Should return error (assessment lessons don't have blocks)

**`delete_question` on content lesson**
- Should return meaningful error

**`restructure_course`**
- Missing one lesson ID → `incomplete_lesson_order` error with missing ID named
- Extra lesson ID (not in course) → either error or ignored (test current behaviour)
- All lessons present but reordered → success

**`save_course`**
- Missing `schemaVersion` → validation error in response, not crash
- Missing `kind` on lesson → validation error in response
- Valid full course with all 17 block types → success, returns `course_id` and `view_url`
- Valid course with assessment lesson → success

**`list_courses`**
- Empty courses array → returns empty array
- Course with 3 lessons → `lesson_count: 3`
- Course with 0 lessons → `lesson_count: 0`

---

## Layer 2: Agentic Playbook

**File:** `docs/testing/mcp-stress-playbook.md`

**Format:** Numbered steps with expected results. Claude runs each step using MCP tools, logs `[PASS]` or `[FAIL: reason]` inline, and produces a final summary table.

**Agent account:** Uses agent Google account (stored in memory) — already registered on TideLearn.

**Setup:** `APP_URL=http://localhost:5173 npm run dev` for local run, or against production URL.

**Test course naming:** All test courses prefixed `[STRESS TEST]` for easy cleanup.

---

### Scenario 1 — Auth flow

| # | Action | Expected |
|---|--------|----------|
| 1.1 | `tidelearn_login` | Returns URL pointing to `${APP_URL}/auth?mcp_callback=...` |
| 1.2 | Open URL in browser, sign in with Google | Browser redirects to localhost callback |
| 1.3 | `list_courses` | Returns array without error |
| 1.4 | `tidelearn_logout` | Success |
| 1.5 | `list_courses` | Returns `auth_required` error |
| 1.6 | `tidelearn_login` again | Works, session restored |

---

### Scenario 2 — Course scaffold

| # | Action | Expected |
|---|--------|----------|
| 2.1 | `create_course("[STRESS TEST] Scaffold")` | Returns `course_id` and `view_url` containing `/view?id=` |
| 2.2 | `list_courses` | New course appears with `lesson_count: 0` |
| 2.3 | `get_course(course_id)` | Returns course with 0 lessons |
| 2.4 | `add_lesson(course_id, "Lesson One")` | Returns `lesson_id` |
| 2.5 | `add_lesson(course_id, "Lesson Two")` | Returns different `lesson_id` |
| 2.6 | `get_course(course_id)` | Returns 2 lessons |
| 2.7 | `list_courses` | Course shows `lesson_count: 2` |

---

### Scenario 3 — All 17 block types via `add_block`

Using the course from Scenario 2, Lesson One. Add one of each block type using the fixtures above. For `image`: `src: "https://picsum.photos/800/400"`. For `document`: `src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf"`.

| # | Block type | Expected |
|---|-----------|----------|
| 3.1 | `heading` | Success, block_id returned |
| 3.2 | `text` | Success |
| 3.3 | `image` | Success |
| 3.4 | `video` | Success |
| 3.5 | `audio` | Success |
| 3.6 | `document` | Success |
| 3.7 | `quiz` | Success |
| 3.8 | `truefalse` | Success |
| 3.9 | `shortanswer` | Success |
| 3.10 | `list` | Success |
| 3.11 | `callout` | Success |
| 3.12 | `accordion` (omit item IDs — server injects) | Success |
| 3.13 | `tabs` (omit item IDs) | Success |
| 3.14 | `quote` | Success |
| 3.15 | `code` | Success |
| 3.16 | `divider` | Success |
| 3.17 | `toc` | Success |
| 3.18 | `preview_course(course_id)` | HTML returned, no `[Unknown block type]` present |
| 3.19 | `get_lesson(course_id, lesson_id)` | Returns lesson with 17 blocks |

---

### Scenario 4 — `save_course` megacourse

Single `save_course` call with:
- `schemaVersion: 1`
- 2 content lessons (each with 5+ varied block types including accordion, tabs, quiz)
- 1 assessment lesson (10 questions, all with `bloomLevel` and `source`)

| # | Check | Expected |
|---|-------|----------|
| 4.1 | `save_course(megacourse_json)` | Returns `course_id` and `view_url` |
| 4.2 | `get_course(course_id)` | 3 lessons, lesson kinds correct |
| 4.3 | Content lesson blocks count | Matches what was sent |
| 4.4 | Assessment lesson question count | 10 |
| 4.5 | `preview_course(course_id)` | Assessment questions rendered with ✓ markers |
| 4.6 | `review_course(course_id)` | No `no_assessment` gaps (assessment lesson present) |

---

### Scenario 5 — Assessment deep test

| # | Action | Expected |
|---|--------|----------|
| 5.1 | `add_assessment_lesson(course_id, "[STRESS TEST] Exam")` | Returns `lesson_id` |
| 5.2 | `import_questions(course_id, lesson_id, questions[50])` | Returns `{ imported: 50 }` |
| 5.3 | `list_questions(course_id, lesson_id)` | Returns 50 questions |
| 5.4 | `add_question(course_id, lesson_id, question)` | Returns `question_id` |
| 5.5 | `list_questions` again | 51 questions |
| 5.6 | `update_question(course_id, lesson_id, question_id, { text: "Updated" })` | Success |
| 5.7 | `list_questions` — check updated question | Text matches "Updated" |
| 5.8 | `replace_questions(course_id, lesson_id, questions[10])` | Returns `{ replaced: 10, question_ids: [...] }` — 10 new IDs |
| 5.9 | `list_questions` | 10 questions, none with old IDs |
| 5.10 | `delete_question(course_id, lesson_id, question_ids[0])` | Success |
| 5.11 | `list_questions` | 9 questions |
| 5.12 | `update_assessment_config(course_id, lesson_id, { passingScore: 75, examSize: 8 })` | Success |
| 5.13 | `get_lesson(course_id, lesson_id)` | Config shows `passingScore: 75, examSize: 8` |

---

### Scenario 6 — Editing tools

| # | Action | Expected |
|---|--------|----------|
| 6.1 | `get_lesson(course_id, content_lesson_id)` | Returns lesson with blocks |
| 6.2 | `update_block(course_id, lesson_id, block_id, { text: "Updated heading" })` | Success |
| 6.3 | `get_lesson` | Block text updated |
| 6.4 | `rewrite_lesson(course_id, lesson_id, [heading, text, quiz])` | Success — 3 blocks |
| 6.5 | `get_lesson` | Exactly 3 blocks, previous blocks gone |
| 6.6 | `rewrite_blocks(course_id, [{ lesson_id, block_id, updated_block }, ...])` | Success |
| 6.7 | `add_block(course_id, lesson_id, divider, position: 0)` | Success, divider at position 0 |
| 6.8 | `move_block(course_id, lesson_id, block_id, new_position: 2)` | Success |
| 6.9 | `delete_block(course_id, lesson_id, block_id)` | Success |
| 6.10 | `restructure_course(course_id, [{ lesson_id: l2, title: "Renamed L2" }, { lesson_id: l1, title: "Renamed L1" }])` | Success, order reversed |
| 6.11 | `get_course(course_id)` | Lessons in new order with new titles |

---

### Scenario 7 — Review and preview

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Create sparse course: 1 lesson, 1 heading block only | — |
| 7.2 | `review_course(course_id)` | Gaps include: `too_short`, `no_media`, `no_assessment` |
| 7.3 | Add image, text, quiz blocks | — |
| 7.4 | `review_course` again | Fewer gaps |
| 7.5 | Add assessment lesson with questions | — |
| 7.6 | `review_course` again | No `no_assessment` gap |
| 7.7 | `preview_course` on content lesson | All block types render correctly |
| 7.8 | `preview_course` on full course | Assessment questions shown with ✓ markers; feedback shown for questions that have a `feedback` field (ensure at least one question in step 7.5 includes `feedback`) |

---

### Scenario 8 — Publish flow

| # | Action | Expected |
|---|--------|----------|
| 8.1 | `update_course(course_id, { is_public: true })` | Returns `view_url` and note |
| 8.2 | `list_courses` | Course shows `is_public: true` |
| 8.3 | `update_course(course_id, { title: "Renamed" })` | Returns `{ updated: true }` — no `view_url` (title-only update, `is_public` not passed as `true`) |
| 8.4 | `get_course(course_id)` | Title updated |

---

### Scenario 9 — Robustness pass

Every check below should return a meaningful error, not crash or return generic 500.

| # | Action | Expected error |
|---|--------|----------------|
| 9.1 | `get_course("00000000-0000-0000-0000-000000000000")` | `course_not_found` |
| 9.2 | `get_lesson(valid_course_id, "00000000-0000-0000-0000-000000000000")` | `lesson_not_found` |
| 9.3 | `add_block(course_id, assessment_lesson_id, heading_block)` | `not_content_lesson` or similar — named error, not a crash |
| 9.4 | `add_question(course_id, content_lesson_id, question)` | `not_assessment` or similar — named error, not a crash |
| 9.5 | `replace_questions(course_id, content_lesson_id, questions)` | `not_assessment` |
| 9.6 | `delete_question(course_id, content_lesson_id, "fake-id")` | `not_assessment` or similar — named error |
| 9.7 | `restructure_course(course_id, [lesson_1_only])` (omit lesson 2) | `incomplete_lesson_order` with missing lesson ID named |
| 9.8 | `save_course({ title: "No version", lessons: [] })` (missing schemaVersion) | Validation error mentioning `schemaVersion` |
| 9.9 | `save_course({ schemaVersion: 1, title: "T", lessons: [{ title: "No kind", blocks: [] }] })` | Validation error mentioning `kind` |
| 9.10 | `add_block(course_id, lesson_id, { type: "banner", text: "hello" })` | `invalid_block_type` with list of valid types |
| 9.11 | `add_question(course_id, lesson_id, { text: "Q", options: ["A","B","C"], correctIndex: 0 })` | Error (3 options, need 4) |
| 9.12 | `update_block(valid_ids, "00000000-0000-0000-0000-000000000000", {})` | `block_not_found` or similar — named error |
| 9.13 | `delete_block(valid_ids, "00000000-0000-0000-0000-000000000000")` | `block_not_found` or similar — named error |
| 9.14 | `move_block(valid_ids, block_id, 9999)` | Error or clamped — test current behaviour |
| 9.15 | `import_questions` with one invalid question (3 options) in a batch of 5 | All-or-nothing: 0 imported, error |

---

### Scenario 10 — Cleanup

| # | Action | Expected |
|---|--------|----------|
| 10.1 | `list_courses` — collect all `[STRESS TEST]` course IDs | — |
| 10.2 | `delete_course` for each | Success |
| 10.3 | `list_courses` | No `[STRESS TEST]` courses remain |

---

## Implementation sequence

1. **Auth fix** — `mcp/src/tools/auth.ts` + app `/auth` route (prerequisite for Scenario 1)
2. **Vitest test fixtures** — `mcp/tests/fixtures/blocks.ts` shared by all new test files
3. **Vitest schema tests** — extend `schema.test.ts`
4. **Vitest inject tests** — extend `inject.test.ts`
5. **Vitest validate tests** — create new `validate.test.ts`
6. **Vitest preview tests** — extend `preview.test.ts`
7. **Vitest mutate tests** — extend `mutate.test.ts`
8. **Vitest tool-mock tests** — new `tool-mocks.test.ts`
9. **Agentic playbook** — write `docs/testing/mcp-stress-playbook.md` using this spec
10. **Run playbook** — Claude executes all 10 scenarios, logs results

---

## Success criteria

**Vitest:** All tests green on `npm test`. Test count ≥ 120. Note: some proposed additions to `inject.test.ts` and `validate.test.ts` may overlap with existing coverage — implementer should skip any that duplicate existing assertions and add genuinely new ones to reach the target.

**Playbook:** All scenarios pass. Every robustness check returns a named, meaningful error (not a crash or generic message). Auth test confirms Google login works end-to-end with the agent account.
