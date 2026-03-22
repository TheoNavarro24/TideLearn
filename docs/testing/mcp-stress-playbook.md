# MCP Stress Test Playbook

**Format:** Numbered steps with expected results. Claude reads this file and executes each step using TideLearn MCP tools, logging `[PASS]` or `[FAIL: reason]` after each step, then produces a final summary table.

**Agent account:** Uses the agent Google account (stored in memory) — already registered on TideLearn.

**Course naming:** All test courses prefixed `[STRESS TEST]` for easy cleanup.

**How to run:**
1. Ensure the MCP server is connected and `APP_URL` is set to the right environment
2. Ask Claude: "Run the MCP stress test playbook at `docs/testing/mcp-stress-playbook.md`"
3. Claude will execute each scenario in order and log results inline
4. At the end, Claude produces a summary table: Scenario | Steps | Pass | Fail

---

## Scenario 1 — Auth flow

| # | Action | Expected |
|---|--------|----------|
| 1.1 | `tidelearn_login` | Returns URL pointing to `${APP_URL}/auth?mcp_callback=...` |
| 1.2 | Open URL in browser, sign in with Google (agent account) | Browser redirects to localhost callback, tab shows "Logged in successfully" |
| 1.3 | `list_courses` | Returns array without error |
| 1.4 | `tidelearn_logout` | Success |
| 1.5 | `list_courses` | Returns `auth_required` error |
| 1.6 | `tidelearn_login` again | Works, session restored |

---

## Scenario 2 — Course scaffold

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

## Scenario 3 — All 17 block types via `add_block`

Using the course from Scenario 2, Lesson One. Add one of each block type. For `image`: `src: "https://picsum.photos/800/400"`. For `document`: `src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf"`.

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

## Scenario 4 — `save_course` megacourse

Single `save_course` call with `schemaVersion: 1`, 2 content lessons (each 5+ varied blocks including accordion, tabs, quiz), 1 assessment lesson (10 questions, all with `bloomLevel` and `source`).

| # | Check | Expected |
|---|-------|----------|
| 4.1 | `save_course(megacourse_json)` | Returns `course_id` and `view_url` |
| 4.2 | `get_course(course_id)` | 3 lessons, lesson kinds correct |
| 4.3 | Content lesson blocks count | Matches what was sent |
| 4.4 | Assessment lesson question count | 10 |
| 4.5 | `preview_course(course_id)` | Assessment questions shown with ✓ markers |
| 4.6 | `review_course(course_id)` | No `no_assessment` gaps (assessment lesson present) |

---

## Scenario 5 — Assessment deep test

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

## Scenario 6 — Editing tools

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

## Scenario 7 — Review and preview

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Create sparse course: 1 lesson, 1 heading block only | — |
| 7.2 | `review_course(course_id)` | Gaps include: `no_media`, `no_assessment` |
| 7.3 | Add image, text, quiz blocks | — |
| 7.4 | `review_course` again | Fewer gaps |
| 7.5 | Add assessment lesson with ≥1 question that has a `feedback` field | — |
| 7.6 | `review_course` again | No `no_assessment` gap |
| 7.7 | `preview_course` on content lesson | All block types render correctly |
| 7.8 | `preview_course` on full course | Assessment questions shown with ✓ markers; feedback shown for questions that have a `feedback` field |

---

## Scenario 8 — Publish flow

| # | Action | Expected |
|---|--------|----------|
| 8.1 | `update_course(course_id, { is_public: true })` | Returns `view_url` and note about public access |
| 8.2 | `list_courses` | Course shows `is_public: true` |
| 8.3 | `update_course(course_id, { title: "Renamed" })` | Returns `{ updated: true }` — no `view_url` (title-only update, `is_public` not passed as `true`) |
| 8.4 | `get_course(course_id)` | Title updated |

---

## Scenario 9 — Robustness pass

Every check below should return a meaningful error, not crash or return generic 500.

| # | Action | Expected error |
|---|--------|----------------|
| 9.1 | `get_course("00000000-0000-0000-0000-000000000000")` | `course_not_found` |
| 9.2 | `get_lesson(valid_course_id, "00000000-0000-0000-0000-000000000000")` | `lesson_not_found` |
| 9.3 | `add_block(course_id, assessment_lesson_id, heading_block)` | Named error, not a crash |
| 9.4 | `add_question(course_id, content_lesson_id, question)` | Named error, not a crash |
| 9.5 | `replace_questions(course_id, content_lesson_id, questions)` | `not_assessment` |
| 9.6 | `delete_question(course_id, content_lesson_id, "fake-id")` | Named error, not a crash |
| 9.7 | `restructure_course(course_id, [lesson_1_only])` (omit lesson 2) | `incomplete_lesson_order` with missing lesson ID named |
| 9.8 | `save_course({ title: "No version", lessons: [] })` (missing schemaVersion) | Validation error mentioning `schemaVersion` |
| 9.9 | `save_course({ schemaVersion: 1, title: "T", lessons: [{ title: "No kind", blocks: [] }] })` | (After inject, kind is added — this may succeed. Test and document actual behaviour.) |
| 9.10 | `add_block(course_id, lesson_id, { type: "banner", text: "hello" })` | `invalid_block_type` or similar — named error |
| 9.11 | `add_question(course_id, lesson_id, { text: "Q", options: ["A","B","C"], correctIndex: 0 })` | Error (3 options, need 4) |
| 9.12 | `update_block(valid_ids, "00000000-0000-0000-0000-000000000000", {})` | `block_not_found` error |
| 9.13 | `delete_block(valid_ids, "00000000-0000-0000-0000-000000000000")` | `block_not_found` error |
| 9.14 | `move_block(valid_ids, block_id, 9999)` | Success — block clamped to end; verify with `get_lesson` |
| 9.15 | `import_questions` with one invalid question (3 options) in a batch of 5 | All-or-nothing: 0 imported, error |

---

## Scenario 10 — Cleanup

| # | Action | Expected |
|---|--------|----------|
| 10.1 | `list_courses` — collect all `[STRESS TEST]` course IDs | — |
| 10.2 | `delete_course` for each | Success |
| 10.3 | `list_courses` | No `[STRESS TEST]` courses remain |

---

## Summary table template

After running all scenarios, Claude outputs:

| Scenario | Steps | Pass | Fail | Notes |
|----------|-------|------|------|-------|
| 1 — Auth | 6 | ? | ? | |
| 2 — Scaffold | 7 | ? | ? | |
| 3 — All blocks | 19 | ? | ? | |
| 4 — Megacourse | 6 | ? | ? | |
| 5 — Assessment | 13 | ? | ? | |
| 6 — Editing | 11 | ? | ? | |
| 7 — Review/preview | 8 | ? | ? | |
| 8 — Publish | 4 | ? | ? | |
| 9 — Robustness | 15 | ? | ? | |
| 10 — Cleanup | 3 | ? | ? | |
| **Total** | **92** | | | |
