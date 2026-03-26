# TideLearn Phase 3 — Course Authoring Workflow

**Version:** Phase 3A (prototype — uses Manning MCP skills directly)
**Invoke as:** `/phase-3` skill
**References:** Load `step4-block-planning.md` at Step 4, `step6-block-development.md` at Step 6

You are guiding a course author through TideLearn's professional instructional design workflow. Follow each step in sequence. Pause at every approval gate marked **→ PAUSE** and wait for explicit confirmation before continuing.

---

## Vocabulary — always translate these when calling Manning skills

| Manning field | What to put in it |
|---|---|
| `student_level` / `learner_stage` | Learner profile: role + experience (e.g. "Mid-level sales managers, 3–5 years experience, new to consultative selling") |
| `band_range` | Experience range: "Novice to Practitioner" or role-level range |
| `programme_purpose` | Business need: the performance problem this training addresses and the outcome it supports |
| `subject_area` / `domain_or_subject` | Topic domain (e.g. "Financial compliance", "Data governance") |
| `student_profiles` | Array of learner context: role, experience, motivation (mandatory vs voluntary), constraints |
| `curriculum_framework` | Competency or performance framework in use — omit if none |
| `class_size` | Omit — async e-learning has no class |
| `unit_duration` / `unit_length` | "N lessons" |
| `lessons_per_week` | 1 (async — learner sets own pace) |
| `developmental_bands` | "Novice / Practitioner / Expert" (or role-level equivalent) |
| `curriculum_input_type` | Always `"course"` |
| `response_method` | Omit — async e-learning |

---

## Step 1 — Discovery

**Goal:** Understand the performance problem, audience, and context.

Ask these questions conversationally. Adapt order to flow, but collect all answers before synthesising.

1. **Performance gap:** "What is the specific gap this training addresses? What are people doing, or not doing, that they should be?"
2. **Evidence:** "How was this gap identified — data, observation, complaints, audit?"
3. **Impact:** "What is the business impact? What does 'fixed' look like in measurable terms?"
4. **Why e-learning:** "Why is self-paced e-learning the right solution here, rather than a workshop, job aid, or coaching?"
5. **Audience:** "Who specifically will take this? Role, experience level, prior knowledge."
6. **Motivation:** "Will learners choose this or be required to take it? What is their likely starting disposition?"
7. **Content available:** "What materials, documents, examples, or expertise already exist that we can draw from?"
8. **Constraints:** "Any length, language, accessibility, or technical constraints?"
9. **Success measure:** "How will you know the training worked? What will you measure 3–6 months out?"

After all answers collected, synthesise into a brief and present it:

```
COURSE BRIEF
Working title: [title]
Business need: [performance problem + impact]
Why e-learning: [rationale]
Learner profile: [role + experience + motivation]
Content available: [list]
Constraints: [any constraints]
Success measure: [measurement approach]
```

**→ PAUSE: Confirm brief is accurate before proceeding.**

---

## Step 2 — Learning Objectives + Knowledge Structure

**Goal:** Define what learners will know and do. Classify knowledge type to route assessment correctly.

### 2a. Learning target authoring

Call `learning-target-authoring-guide` once per major competency the course addresses.

```
competency_name: [the main capability, e.g. "Consultative Selling"]
competency_definition: "The ability to [verb] [what] [in what context]"
band_range: "Novice to Practitioner"   ← or appropriate experience range
programme_purpose: [business need from Step 1 brief]
```

**Use from output:** `lt_decomposition`, `lt_definitions`, `knowledge_type_classification`, `quality_check`

### 2b. Competency unpacking

Call `competency-unpacker` once per learning objective.

```
competency_descriptor: [the learning objective text]
student_level: [learner profile from Step 1]
subject_area: [topic domain]
student_profiles: [[learner context]]
assessment_purpose: "for course design and assessment planning"
```

**Use from output:** `observable_indicators`, `prerequisite_knowledge`, `common_misconceptions`, `success_criteria`

> **Save `common_misconceptions`** — used again in Steps 4 and 6.

### 2c. KUD knowledge type mapping

Call `kud-knowledge-type-mapper` once for the full course.

```
curriculum_input: [description of what learners will learn and be able to do across all objectives]
learner_stage: [experience level range, e.g. "Novice to Practitioner"]
existing_learning_targets: [lt_definitions output from 2a]
programme_purpose: [business need]
```

**Use from output:** `kud_chart`, `assessment_routing_plan`, `sequencing_notes`, `design_flags`

> **Read `design_flags` carefully.** If any objective is classified Type 3 (dispositional), flag this to the user: *"This goal — [X] — describes a behaviour that develops through sustained practice over time. An e-learning course can build the knowledge and reasoning prerequisites, but the behaviour itself cannot be formally assessed here. Recommend reframing the course goal to focus on what the course can achieve."*

**Present to user:**
- Refined objectives (from lt_decomposition + lt_definitions)
- Knowledge type per objective (Type 1 / 2 / 3)
- Assessment route per objective
- Any design flags

**→ PAUSE: Objectives confirmed? Proceed to Step 3.**

---

## Step 3 — Content Gathering and Curation

**Goal:** Map existing materials to objectives. Identify gaps before planning begins.

No skill calls at this step.

1. Ask the user to share all available materials (documents, slides, links, notes, examples).
2. Read all materials. Extract per document:
   - Key concepts and definitions
   - Procedures and processes
   - Examples and case studies
   - Terminology
3. Map extracted content against objectives from Step 2. Produce a coverage matrix:

```
COVERAGE MATRIX

Objective 1: [title]
  ✅ Covered: [what exists]
  ⚠️ Partial: [what needs developing]
  ❌ Missing: [what needs sourcing or creating from scratch]

Objective 2: [title]
  ...
```

3.5. **Research offer** — for any ❌ Missing items: "I can research [topic] and draft content for this gap. Would you like me to do that, or will you provide additional materials?"

4. **Media inventory** — scan all uploaded materials and list any media assets that could be used in the course:

```
MEDIA INVENTORY

File: [filename]
  - [image/diagram/chart/video/audio description]
  - Potential use: [block type + lesson]

File: [filename]
  ...

Media gaps (blocks needing assets not in source materials):
  - [block type + lesson + what's needed]
```

5. **Source content extraction** — extract all text content from uploaded materials to `docs/phase-3/source-notes-<slug>.md` (where `<slug>` is the kebab-case working title from Step 1, e.g. `source-notes-financial-literacy.md`). This file survives context compaction and session breaks — it is the persistent record of source material content.

6. **Media note** — media asset files (images, PDFs, audio files) from source materials are not stored in the model's context. Step 6 will check asset availability and request re-uploads as needed.

**→ PAUSE: Coverage matrix reviewed. Research gaps addressed. Media inventory complete. Source notes saved. Proceed to Step 4.**

---

## Step 4 — Plan and Structure

**Goal:** Design the full course structure — lesson sequence, block skeletons, assessment approach — before writing any content.

> **Load `step4-block-planning.md` now.** Use it for all block type and skeleton decisions.

### 4a. Knowledge architecture

Call `curriculum-knowledge-architecture-designer`:

```
curriculum_input_type: "course"
domain_or_subject: [topic domain + one sentence description]
learner_stage: [experience level]
learning_goals: [3–5 sentences: what learners will know, understand, and be able to do]
prior_knowledge_baseline: [prerequisite_knowledge from Step 2b]
existing_curriculum_documents: [kud_chart from Step 2c — paste as string]
```

**Use from output:** `epistemic_diagnosis`, `teaching_sequencing_implications`, `assessment_implications`

### 4b. Backwards design

Call `backwards-design-unit-planner`:

```
desired_outcomes: [learning objectives from Step 2, formatted as a numbered list]
student_level: [learner profile]
unit_duration: "[N] lessons"
subject_area: [topic domain]
available_resources: [content inventory summary from Step 3]
```

**Use from output:** `stage_1_desired_results`, `stage_2_assessment_evidence`, `stage_3_learning_plan`, `alignment_check`

> **`stage_3_learning_plan` is the key output** — this becomes your lesson structure. Each activity in Stage 3 maps to one or more blocks.

### 4c. Spaced practice scheduling

*Skip for courses of 2 lessons or fewer.*

Call `spaced-practice-scheduler`:

```
topics: [[list of lesson topics in planned sequence]]
timeline: "[N]-lesson course"
lessons_per_week: 1
topic_difficulty: [[high/medium/low per topic]]
curriculum_sequence: [sequencing_notes from Step 2c]
```

**Use from output:** `schedule`, `review_activity_suggestions`
Note which lessons should open with a retrieval starter on previous lesson content.

### 4d. Interleaving

*Skip for courses of 2 lessons or fewer, or where sequence is fixed by prerequisites.*

Call `interleaving-unit-planner`:

```
topics: [[lesson topics in current planned order]]
subject: "[topic domain], [learner experience level]"
unit_length: "[N] lessons"
prerequisite_dependencies: [[topics that must precede others — from sequencing_notes Step 2c]]
```

**Use from output:** `interleaved_sequence` — update lesson order if recommended

### 4e. Hinge questions

Call `hinge-question-designer` once per lesson.

```
concept_being_taught: [the key concept this lesson teaches]
student_level: [learner profile]
lesson_context: [brief description of what this lesson covers]
known_misconceptions: [relevant items from common_misconceptions in Step 2b]
```

**Use from output:** `hinge_question` (becomes a `quiz` block), `diagnostic_key` (becomes feedbackIncorrect text — each distractor explanation)

### 4f. Assessment validity

Call `assessment-validity-checker`:

```
assessment_description: "Inline knowledge checks (quiz, shortanswer, fillinblank, matching, sorting blocks) per content lesson. Assessment lesson with Leitner spaced repetition for formal evaluation."
intended_learning: [all learning objectives from Step 2]
student_level: [learner profile]
assessment_purpose: "formative (inline checks) and summative (assessment lesson)"
```

**Use from output:** `threats_identified`, `recommendations` — note any alignment gaps for Step 6.

### 4g. Assemble the Course Plan Document

Compile all outputs into a plan and present to the user:

```
COURSE PLAN

Title: [title]
Learner profile: [from Step 1]
Business need: [from Step 1]
Success measure: [from Step 1]

LEARNING OBJECTIVES
1. [Objective] — Type [1/2/3] — Assessment route: [auto-gradeable / shortanswer / flag]
2. ...

LESSON STRUCTURE

Lesson 1: [title]
  Clark content type: [Facts / Concepts / Processes / Procedures / Principles]
  Objectives addressed: [list]
  Block skeleton: [list blocks in order — from step4-block-planning.md skeleton templates]
  Hinge question: [from 4e]
  Spaced review: [prior-lesson content to revisit at lesson open — from 4c]

Lesson 2: [title]
  ...

[Repeat per lesson]

ASSESSMENT LESSON
  Question types: [MCQ / shortanswer / fillinblank / matching / sorting]
  Objectives covered: [all]
  Leitner spaced repetition: yes

ASSESSMENT FLAGS
  [Threats from 4f]
  [Type 3 flags from Step 2]
```

**→ PAUSE: Course plan approved? Any structural changes? Proceed to Step 5.**

---

## Step 5 — SME Approval Gate

Present the complete Course Plan Document. Wait for explicit approval.

If changes requested:
- **Wording changes:** update plan directly, continue
- **Structural changes** (lesson reorder, new objective, scope change): re-run relevant Step 4 skills with updated inputs, then resubmit plan
- **Objective changes:** return to Step 2, re-run from 2b

**→ PAUSE: Plan approved. Proceed to Step 6.**

---

## Step 6 — Development

**Goal:** Draft full content for every block in every lesson.

> **Load `step6-block-development.md` now.** Use it for all field-level content decisions and feedback quality rules.

### 6-pre. Build mode and content persistence

Ask the user which mode they prefer:

- **Whole-course mode:** Draft all lessons, saving each to markdown as completed. After all lessons are drafted, present the full draft for approval.
- **Lesson-by-lesson mode (recommended for 4+ lessons):** Draft one lesson → save to markdown → present → PAUSE for approval → repeat for each lesson.

**Per-lesson save (mandatory in both modes):** After drafting each lesson, immediately save it to the build file `docs/phase-3/course-build-<slug>.md` (same slug as source notes). Do this before moving to the next lesson. If context compacts mid-step, only the lesson currently being drafted is lost.

Then work one lesson at a time through steps 6a–6g below.

### 6a. Instruction sequence

Call `explicit-instruction-sequence-builder`:

```
skill_to_teach: [the specific skill or concept this lesson teaches]
student_level: [learner profile]
lesson_time: "[target duration] minutes"
common_misconceptions: [from Step 2b, relevant to this lesson]
prior_knowledge: [prerequisites from Step 2b relevant to this lesson]
```

**Use from output:** `i_do`, `we_do`, `you_do`, `cfu_points`, `timing_guide`

Translate the I/We/You Do structure into the block skeleton from Step 4 using `step4-block-planning.md`.

### 6b. Worked examples — procedural content only

*Only call this if the lesson contains Clark Type: Procedures content.*

Call `worked-example-fading-designer`:

```
skill_to_teach: [the procedure to teach]
student_level: [learner profile]
steps_in_procedure: [estimated step count]
common_errors: [common_misconceptions from Step 2b relevant to this procedure]
prior_knowledge: [relevant prerequisites]
```

**Map output to blocks:**
- `worked_example` → `process` block (complete worked example)
- `completion_problems` → `sorting` or `shortanswer` blocks (We Do)
- `independent_problems` → `shortanswer` or `branching` (You Do)

### 6c. Visual planning

For each explanatory text block, call `dual-coding-designer`:

```
verbal_content: [the text block content]
subject_and_level: "[topic domain], [learner experience level]"
visual_constraints: "for web-based e-learning — image, chart, or timeline block"
existing_visuals: [any visuals already planned for this lesson]
```

**Map output to blocks:**
- `visual_design.type` determines block: diagram/photo → `image`, data → `chart`, temporal → `timeline`
- `integration_notes` → placement guidance (put image immediately after its explanatory text)
- `annotation_strategy` → what text goes in the block's caption/alt text

### 6d. Elaborative prompts (We Do shortanswer blocks)

Call `elaborative-interrogation-generator`:

```
topic: [the concept being learned in this lesson]
student_level: [learner profile]
prompt_count: 5
content_text: [draft text content for this lesson]
learning_objectives: [relevant objectives from Step 2]
```

**Use from output:** `elaborative_prompts` → `shortanswer` blocks in the We Do phase (not formal assessment — guided reflection)

### 6e. Retrieval practice questions

Call `retrieval-practice-generator` **twice** per lesson (from Lesson 2 onward):

**End-of-lesson check (all lessons):**
```
topic: [this lesson's content]
student_level: [learner profile]
question_count: 4
time_since_learning: "immediately after initial learning"
known_misconceptions: [from Step 2b]
```

**Spaced opener (Lesson 2+ only — reviewing previous lesson):**
```
topic: [previous lesson's content]
student_level: [learner profile]
question_count: 3
time_since_learning: "previous lesson"
known_misconceptions: [from Step 2b relevant to prior lesson]
```

**Map retrieval type to block:**
- `free recall` → `shortanswer`
- `cued recall` → `fillinblank`
- `recognition` → `quiz` (or `truefalse` for binary content)

### 6f. Draft all block content

Draft full content for every block in the lesson skeleton. For each block:

1. Refer to `step6-block-development.md` for field requirements and quality rules
2. Write `feedbackCorrect` and `feedbackIncorrect` at **Task or Process level** — "Correct!" alone fails the quality check
3. For `quiz` blocks: each distractor should represent a specific plausible misconception (use `diagnostic_key` from hinge question if available)
4. For `branching` blocks: write three choice types — best / acceptable-but-not-ideal / poor

### 6g. Feedback quality check

After drafting, call `feedback-quality-analyser` on each knowledge check block's feedback:

```
feedback_text: [the feedbackCorrect and feedbackIncorrect text for this block]
task_context: [the question text and the learning objective it addresses]
```

Revise any feedback flagged as ego-level ("Well done!") or insufficiently specific.

**After each lesson:** Save the drafted content to the build markdown file immediately.

**In lesson-by-lesson mode:** Present the lesson draft and **→ PAUSE: Lesson [N] content approved?** before starting the next lesson.

**After all lessons are drafted and saved:**

### 6h. Content approval gate

Present the full draft (whole-course mode) or confirm all individual lessons are approved (lesson-by-lesson mode).

**→ PAUSE: All content approved? Proceed to media sourcing.**

### 6i. Media sourcing

1. Review the media inventory from Step 3
2. Ask the user: "Are the following source files still in our conversation? If not, please re-upload: [list files from media inventory that contained usable assets]"
3. For each media gap identified in Step 3, source or select appropriate assets (images, diagrams, videos, documents)
4. Upload assets via `upload_media` and note the returned URLs in the build markdown file
5. Update block drafts in the build file with media URLs

Default: media sourcing is batched here, after all content is approved. In lesson-by-lesson mode, the user may request per-lesson media sourcing during the lesson loop — if they do, proceed as requested.

**After media sourcing, proceed to Step 7.**

---

## Step 7 — Build in TideLearn

**Goal:** Persist all drafted and approved content into TideLearn via the MCP.

> **Load `step7-mcp-reference.md` now.** Use it for all field names, types, and constraints during building.

Always `get_course` before any edits to confirm current state and IDs.

**Build method:** Use `add_lesson` + `add_block` per block, built from the approved build markdown file. Do NOT use `generate_lesson` — it produces generic content that ignores drafted material.

**Build sequence:**
1. `create_course` — title, description from Step 1 brief
2. Per content lesson:
   a. `add_lesson` — title from course plan
   b. `add_block` per block in skeleton order, using exact field names from `step7-mcp-reference.md`
3. Per assessment lesson:
   a. `add_assessment_lesson` — title (NOT `add_lesson`)
   b. `add_question` per question with correct `kind` field
   c. Prompt the user for assessment config: "What passing score, exam size would you like? (Default: no minimum, all questions)"
   d. `update_assessment_config` with user-specified values
4. `upload_media` for any image, audio, or document assets not yet uploaded
5. `save_course`

**Error recovery:**
1. Read the error message — it names the exact field or constraint that failed
2. Check `step7-mcp-reference.md` for the correct schema
3. Fix the field and retry the tool call
4. After build completes, verify block count and order per lesson against the build markdown file

**Post-build verification:**
- `get_course` to confirm lesson count, block counts, and assessment question count match the approved draft
- Report any discrepancies to the user before proceeding to Step 8

---

## Step 8 — Preview and Audit

**Goal:** Validate the built course for load, alignment, and accessibility before SME review.

### 8a. Cognitive load audit (per lesson)

Call `cognitive-load-analyser` for each lesson:

```
task_description: [description of this lesson's content structure and block sequence]
student_level: [learner profile]
lesson_context: [what comes before and after this lesson]
```

**Use from output:** `problem_areas`, `modification_suggestions`, `expertise_reversal_check`
Apply modifications via `update_block`.

### 8b. Assessment validity — final check

Call `assessment-validity-checker`:

```
assessment_description: [complete description of knowledge checks across the course and the assessment lesson]
intended_learning: [all learning objectives from Step 2]
student_level: [learner profile]
assessment_purpose: "formative and summative"
marking_approach: "auto-graded knowledge checks; Leitner spaced repetition for assessment lesson"
```

**Use from output:** `threats_identified`, `recommendations`
Address any remaining alignment gaps.

### 8c. Differentiation check (spot-check)

For any lesson or block that may challenge a specific learner profile, call `differentiation-adapter`:

```
original_task: [the block content or activity]
learner_profile: [specific need — e.g. "experienced practitioner", "novice", "learner with low prior knowledge"]
learning_objective: [relevant objective]
```

Apply adaptations via `update_block`. Then `save_course`.

**→ PAUSE: Audit complete. Course ready for SME review. Proceed to Step 9.**

---

## Step 9 — Publish and SME Approval

1. `preview_course` — generate preview link
2. Present to user with build summary:
   - Lessons built
   - Total blocks
   - Assessment questions
   - Objectives addressed
   - Any outstanding flags from audit
3. Ask user to share the preview link with the SME for review.

**→ PAUSE: SME reviewing.**

If changes requested:
- Content edits: `update_block` or `update_question` → `save_course`
- Structural changes: `add_block`, `delete_block`, `move_block` → `save_course`
- Significant restructuring: re-run relevant Step 8 audit skills on affected lessons
- Objective scope changes: return to Step 4

**Course complete when SME explicitly approves.**
