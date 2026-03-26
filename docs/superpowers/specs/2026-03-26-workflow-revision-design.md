# Phase 3A Workflow Revision — Design Spec

**Date:** 2026-03-26
**Status:** Draft
**Context:** First end-to-end workflow test revealed gaps in source material handling, content persistence, build method, assessment guidance, audit re-run rules, and session management.
**Test transcript:** `f87e5679-3366-46c3-b377-d5b5560e2ed1.jsonl`

---

## Problem Statement

The Phase 3A workflow (9-step instructional design process) was tested end-to-end on 2026-03-26 building a 5-lesson course. The workflow produced a functional course but exposed several gaps:

1. **No media sourcing** — source materials contained usable content but the workflow never inventories or sources media assets (images, diagrams, videos). The finished course had zero media.
2. **No research offer** — when coverage gaps were found in Step 3, the workflow noted gaps but didn't offer to research and fill them.
3. **No approval gate after Step 6** — the author never reviewed drafted content before it was built into TideLearn.
4. **Content lost to compaction** — Step 6 output was lost when the context window compacted. The content was only saved to markdown because the user explicitly instructed it on the second attempt.
5. **Wrong build method** — `generate_lesson` was used in Step 7, producing generic content that ignored the carefully drafted Step 6 output. Content had to be rebuilt block-by-block.
6. **Schema field mismatches** — ~1.5 hours lost to incorrect field names, missing required fields, and format mismatches between what the LLM assumed and what the MCP schema requires.
7. **No assessment guidance** — workflow didn't guide assessment lesson creation, question type selection, or `assessmentConfig` settings (passing score, time limit, attempts).
8. **No audit re-run rule** — after user-requested changes post-Step 8, no guidance on whether to re-run the audit.
9. **No session boundary guidance** — 7 compaction events across 680 turns, with context peaking at 166K tokens.

---

## Deliverables

| File | Action |
|---|---|
| `docs/phase-3/phase-3-workflow.md` | Update Steps 3, 6, 7, 8, 9; add session boundary guidance |
| `docs/phase-3/step6-block-development.md` | Update shortanswer guidance, add assessment question type guidance |
| `docs/phase-3/step7-mcp-reference.md` | **New file** — MCP schema reference for all block types and assessment question types |
| `docs/phase-3/step4-block-planning.md` | Expand Step 4g assessment section format (Change 6c) |

---

## Change 1 — Step 3 Expansion (Source Materials & Media)

### Current behaviour

Step 3 asks the user to share materials, extracts key concepts, maps against objectives, and produces a coverage matrix. For gaps, it says "note that the LLM will draft this content in Step 6."

### New behaviour

**1a. Research offer.** When the coverage matrix shows gaps (❌ Missing), the workflow offers to research and source content for those gaps rather than passively noting the LLM will draft it.

**1b. Media inventory.** After the coverage matrix, add a media audit:

```
MEDIA INVENTORY

From provided materials:
  ✅ [filename] — [description of usable media: diagram, photo, chart, etc.]
  ✅ [filename] — [description]

Media gaps (no asset available):
  ❌ [lesson/block] — needs [type: diagram / photo / chart / video]
  ❌ [lesson/block] — needs [type]
```

This inventory is carried forward to Step 6 media sourcing.

**1c. Source content extraction.** Extract all text content, key facts, data, and structure from uploaded materials into a persistent markdown file (e.g. `docs/phase-3/source-notes-<slug>.md`, where `<slug>` is a kebab-case version of the working title). This file survives context compaction and session breaks. Raw source files are NOT stored — only extracted text.

**1d. Media stays in context.** Media assets from source materials are not extracted or stored at this step. Step 6 media sourcing will explicitly ask the user: "Are the following files still in our conversation? If not, please re-upload: [list from media inventory]." The LLM cannot reliably detect whether uploaded files survived compaction.

### Rationale

- Source materials in the test included usable content but the workflow never surfaced media potential.
- Uploaded files are lost when context compacts — extracted text must be persisted to a file.
- Media assets cannot be represented in markdown, so they stay in context and are re-requested if compacted.

---

## Change 2 — Step 6 Approval Gate & Content Persistence

### Current behaviour

Step 6 drafts all content and moves straight to Step 7. No save, no approval gate.

### New behaviour

**2a. Build mode selection.** At the start of Step 6, ask the user which mode they prefer:

- **Whole-course mode:** Draft all lessons, saving each to markdown as completed. After all lessons are drafted, present the full draft for approval. PAUSE.
- **Lesson-by-lesson mode (recommended for 4+ lessons):** Draft one lesson → save to markdown → present → PAUSE for approval → repeat for each lesson.

**2b. Per-lesson save to markdown.** Each lesson's drafted content is saved to the build markdown file (e.g. `docs/phase-3/course-build-<slug>.md`, same slug convention as 1c) as soon as it is drafted, before moving to the next lesson. This is mandatory in both modes.

**2c. Approval gate.** After all content is drafted and saved:

- Present the full draft (or final lesson in lesson-by-lesson mode)
- **→ PAUSE: Content approved? Proceed to media sourcing.**

**2d. Media sourcing.** After all content is drafted and approved:

1. Check which media assets from the Step 3 inventory are still in context
2. If any have been compacted away, ask the user to re-upload the specific file needed
3. Source, select, or upload media assets for blocks that need them (images, diagrams, videos, documents)
4. Update the build markdown file with media references

Default: media sourcing is batched at the end of Step 6, after all lessons are approved. In lesson-by-lesson mode, the user may request per-lesson media sourcing, but the workflow does not suggest it by default.

### Rationale

- First test lost Step 6 output to compaction. User had to manually instruct a save on the second generation.
- Per-lesson save means a mid-Step-6 compaction only loses the lesson currently being drafted.
- The author never saw the drafted content before it was built — no opportunity to catch issues before persistence.
- Media sourcing is the natural final sub-step before building, once the exact block needs are known.

---

## Change 3 — Step 7 Build Method

### Current behaviour

Step 7 says to use `generate_lesson` for building. The field reminders are inline in the workflow doc (10 bullet points).

### New behaviour

**3a. Build method.** Mandate `add_lesson` + `add_block` calls, built block-by-block from the approved markdown draft. Never use `generate_lesson` in the guided workflow. `generate_lesson` remains available for quick prototyping outside the workflow.

**3b. MCP schema reference.** Step 7 loads a new standalone doc `step7-mcp-reference.md` containing:

- Exact field names, types, and required/optional status for every block type
- Assessment question schemas for all 5 question kinds (mcq, multipleresponse, fillinblank, matching, sorting)
- Common gotchas and field name mismatches (content block vs assessment question differences)
- `assessmentConfig` fields and defaults

Source of truth: derive all schemas from the Zod definitions in `mcp/src/lib/types.ts` (strict MCP schemas) and cross-reference with `src/types/course.ts` (frontend schemas). When the two differ, the MCP schema is authoritative — that's what tool calls validate against.

> **Maintenance:** When new block types or question types are added, `step7-mcp-reference.md` must be updated. Add this to the existing CLAUDE.md critical rules checklist for new block types.

**3c. Error recovery guidance.** When a tool call fails:

1. Read the error message — it typically names the exact field or constraint that failed
2. Check `step7-mcp-reference.md` for the correct schema
3. Fix and retry
4. After build completes, verify block count and order per lesson against the approved draft

**3d. Assessment lesson build.** The build sequence must explicitly include:

1. `add_assessment_lesson` (not `add_lesson`)
2. `add_question` per question with correct `kind` field
3. `update_assessment_config` with user-specified values (passing score, time limit, attempts)
4. The workflow must prompt the user for `assessmentConfig` values — never leave them at defaults without asking

### Rationale

- `generate_lesson` produced generic content ignoring the drafted material. Block-by-block building is faithful to the approved draft.
- ~1.5 hours were lost to schema field mismatches. A standalone reference doc eliminates this discovery overhead for all future builds.
- The test course had an empty `assessmentConfig` — never prompted the user.

---

## Change 4 — Step 8 Audit Re-run Rule

### Current behaviour

No guidance on when to re-run the audit after changes.

### New behaviour

**4a. Audit fixes do NOT trigger re-run.** Changes made to address Step 8's own findings are scoped corrections that the audit already identified.

**4b. User-requested changes after Step 8 DO trigger re-run.** The audit validated a state that no longer exists. After making the user's requested changes, inform them: "Since the course changed beyond audit fixes, I'm re-running the quality audit." Then re-run all three audit tools (cognitive-load-analyser, assessment-validity-checker, differentiation-adapter) on affected lessons.

**4c. Step 9 only proceeds after a clean audit state** — either the original audit + its fixes, or the most recent re-run audit + its fixes.

### Rationale

- In the test, the audit ran twice: once after initial build, again after shortanswer replacement. The second run was necessary because the changes invalidated the first audit's findings. The rule needs to be explicit.

---

## Change 5 — Session Boundary Guidance

### Current behaviour

None. The first test had 7 compaction events across 680 turns.

### New behaviour

Add a "Session Management" section to the workflow doc, either at the top (before Step 1) or as an appendix.

**Token-heavy activities** (from test data):
- Step 6: Manning skill calls × lessons × skills-per-lesson. Caused 2 compactions for 5 lessons.
- Step 7: MCP `add_block` calls × total blocks. Caused 2 compactions for 92 blocks.
- Step 8: `get_lesson` reads + audit skill calls. Caused 1 compaction.
- Post-audit fixes: bulk block operations. Caused 2 compactions.

**Recommended session boundaries:**

| Course size | Guidance |
|---|---|
| ≤3 lessons, ≤15 blocks/lesson | Can likely run Steps 1–9 in one session. Per-lesson save in Step 6 still mandatory. |
| 4–6 lessons | Break after Step 5. Handoff = lesson plan file + source notes file. User re-uploads source materials at start of Step 6 session. |
| 7+ lessons | Break after Step 5. Additionally, batch Step 6 into groups (e.g. lessons 1–3, then 4–7), saving each batch to the build markdown file. |

**No break between Steps 7 and 8.** They share context naturally — Step 8 needs the course state that Step 7 just created.

**Handoff artifacts:**
- Step 3 → source notes markdown file (survives all breaks)
- Step 5 → lesson plan (structured output from Step 4g)
- Step 6 → build markdown file (per-lesson saves)
- Source material files: user re-uploads at start of new session if break occurs before Step 6 completes

### Rationale

- Context window peaked at 166K tokens and compacted 7 times across 680 turns.
- The 5→6 boundary is the cleanest break: Step 5 produces a structured artifact, and Step 6 starts the heaviest token work.
- Source files can't be persisted in markdown (binary), so users re-upload them. Extracted text content is already saved in the source notes file from Step 3.

---

## Change 6 — Assessment Coverage

### Current behaviour

The workflow mentions assessment lessons in Step 4f (validity check) and Step 7 (build sequence) but doesn't guide question type selection, `assessmentConfig`, or the relationship between content block knowledge checks and assessment lesson questions.

### New behaviour

**6a. Assessment question type guidance.** Add to `step6-block-development.md`:

- Supported assessment question kinds: `mcq`, `multipleresponse`, `fillinblank`, `matching`, `sorting`
- `shortanswer` is NOT a supported assessment question kind (platform constraint)
- Selection guidance: which question kind maps to which knowledge type and Bloom level
- Field differences between content blocks and assessment questions (documented in `step7-mcp-reference.md`)

**6b. assessmentConfig prompting.** Step 7 must prompt the user for:

- `passingScore` (percentage, e.g. 80)
- `timeLimit` (minutes, or null for untimed)
- `maxAttempts` (number, or null for unlimited)

Never leave at defaults without explicitly asking.

**6c. Assessment plan in Step 4g.** The Course Plan Document already includes an assessment lesson section. Replace the current 4-line assessment section with:

```
ASSESSMENT LESSON
  Question count: [total]
  Per learning target:
    LT 1: [N] × [kind] — [rationale]
    LT 2: [N] × [kind] — [rationale]
    ...
  Non-assessable targets (content-block-only): [any LTs where supported question kinds cannot reach required Bloom level]
  Leitner spaced repetition: yes/no
```

**6d. Shortanswer content block guidance update.** In `step6-block-development.md`:

- Flag `shortanswer` as non-auto-scorable in the knowledge check selection table
- Update ALL rows that currently recommend `shortanswer` with auto-scorable alternatives:
  - "Conceptual understanding" (C–AP) → `quiz` (C) or `multipleresponse` (AP)
  - "Procedure application" (UN) → `sorting` (UN) or `quiz` with scenario stem
  - "Elaborative interrogation" (C–AP) → `quiz` with "why" stem or `multipleresponse`
  - "Open application" (UN–EV) → `branching` (EV)
- `shortanswer` remains valid for open/reflective questions where auto-scoring is not required, but must be explicitly flagged as non-scorable in every row where it appears

### Rationale

- The test course assessment had empty `assessmentConfig` — never prompted.
- 4 planned shortanswer assessment questions had to be omitted because `shortanswer` isn't a supported assessment question kind.
- The step6 guide still recommends `shortanswer` as the primary block for C–AP level checks without flagging the auto-scoring limitation.

---

## Out of Scope

- **MCP tool description updates** — field name corrections in `add_question` tool descriptions are MCP server changes, not workflow doc changes. Tracked separately.
- **`generate_lesson` improvements** — making it respect drafted content is a tool enhancement, not a workflow change. The workflow works around it by using `add_lesson` + `add_block`.
- **Shortanswer assessment question kind** — adding this to the platform is a feature request, not a workflow change.
- **Position race conditions** — block insertion ordering is an MCP server concern, not workflow guidance. The error recovery guidance in Change 3c addresses the symptom.
