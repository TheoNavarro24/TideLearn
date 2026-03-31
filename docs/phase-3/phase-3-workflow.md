# TideLearn Phase 3 — Course Authoring Workflow

**Version:** Phase 3A (prototype — uses Manning MCP skills directly)
**Invoke as:** `/phase-3` skill
**References:** `step4-block-planning.md` (loaded after Step 4 skill calls), `step6-block-development.md` (loaded after Step 6 skill calls), `step7-mcp-reference.md` (loaded at Step 7)

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

## Session Management

Large courses consume significant context window tokens. Plan session breaks to avoid losing work to compaction.

| Course size | Guidance |
|---|---|
| ≤3 lessons, ≤15 blocks/lesson | Can likely run Steps 1–9 in one session. Per-lesson save in Step 6 still mandatory. |
| 4–6 lessons | Break after Step 5. Handoff = lesson plan (Step 4g output) + source notes file (Step 3). User re-uploads source materials at start of Step 6 session. |
| 7+ lessons | Break after Step 5. Additionally, batch Step 6 into groups (e.g. lessons 1–3, then 4–7), saving each batch to the build markdown file. |

**No break between Steps 7 and 8** — they share context naturally. Step 8 needs the course state Step 7 just created.

**Handoff artifacts:**
- Step 3 → `docs/phase-3/source-notes-<slug>.md` (extracted text, survives all breaks)
- Step 5 → Course Plan Document (structured output from Step 4g, updated with artifact slots at Step 5a if NotebookLM active)
- Step 5 → Artifact plan (saved to source notes file — block positions, purposes, prompts)
- Step 6 → `docs/phase-3/course-build-<slug>.md` (per-lesson saves)
- Source material files (PDFs, slides, etc.) → user re-uploads at start of new session

**On session resume:** Before taking any action, re-read this document from the top. Do not rely on the session summary — it records completed artifacts, not workflow instructions. Session summaries describe *what was done*; this document specifies *what to do next*. If NotebookLM was used: Memory notebook ID and Source notebook ID were saved to the top of the source notes file (`docs/phase-3/source-notes-<slug>.md`) at Step 3. Retrieve those IDs on resume without a `notebook_list` call. If studio generation was kicked off before the break, check `studio_status` for all artifacts before continuing — download and upload any that completed while the session was inactive.

---

## Before Starting: NotebookLM Check (if MCP installed)

If `notebooklm-mcp-cli` tools are available in this Claude Code session:

**First turn — offer the enhancement:**
> "I can use NotebookLM to make this course build much more powerful — grounded research from your source materials, auto-generated audio overviews, video explainers, slide decks, and infographics for each lesson, plus a persistent Memory notebook that survives context resets.
> Shall I set this up now? (I'll create the Memory notebook immediately, and the Sources notebook once you share your materials.)"

**If user accepts:**
- `notebook_create("Course Memory: [title]")` — create Memory notebook now, before Step 1; record the returned notebook ID — it will be saved to the source notes file at Step 3 so it persists across context resets
- Proceed through all steps writing to Memory notebook notes alongside local files (dual persistence)
- Source notebook created at Step 3 when materials are uploaded

**If not installed or user declines:** proceed with local files only — no degradation.

**If auth is needed:** `nlm login` — prompt user to authenticate while Claude begins Step 1 analysis. The Memory notebook creation waits for auth; analysis does not.

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

*NotebookLM (if active):* `note_create(title="Course Brief", content=<brief>)` in Memory notebook.

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

> **Save `common_misconceptions`** — used again in Steps 4 and 6. Append these to `docs/phase-3/source-notes-<slug>.md` under a `## Common Misconceptions` heading immediately after this step completes. This file survives context compaction and session breaks; the Memory notebook does not replace it for multi-session workflows.

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

*NotebookLM (if active):* `note_create(title="Learning Objectives", content=<objectives + Bloom levels + knowledge types>)` in Memory notebook.

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

3.6. **Supplementary material sourcing** — proactively search for articles, videos, infographics, and other multimedia that supplement the primary sources. Do not wait for explicit ❌ gaps. A full coverage matrix does not mean media coverage is complete — primary sources are often text-only slides with no multimedia.

Search for: practitioner articles, open-access guides (e.g. Devlin Peck, eLearning Industry), infographics, process diagrams, and video content relevant to the course objectives. Record all supplementary sources found in `docs/phase-3/source-notes-<slug>.md` with their LT relevance and intended use.

> ⚠️ **Web search YouTube limitation:** The web search tool cannot return direct YouTube video URLs — it returns article summaries only. If video resources are needed: (a) ask the user to provide specific video URLs, (b) use `video_overview_create` in NotebookLM to generate a video explainer, or (c) search for embed pages on educational sites (TED-Ed, Coursera previews, Khan Academy).

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

5. **Source content extraction** — extract all text content from uploaded materials to `docs/phase-3/source-notes-<slug>.md` (where `<slug>` is the kebab-case working title from Step 1, e.g. `source-notes-financial-literacy.md`). This file survives context compaction and session breaks — it is the persistent record of source material content. If NotebookLM is active, prepend both notebook IDs (Memory and Sources, with their titles) to the top of this file so they can be retrieved on session resume without a `notebook_list` call.

6. **Media note** — media asset files (images, PDFs, audio files) from source materials are not stored in the model's context. Step 6 will check asset availability and request re-uploads as needed.

**→ PAUSE: Coverage matrix reviewed. Research gaps addressed. Supplementary sources found (3c). Media inventory complete. Source notes saved. Proceed to Step 4.**

*NotebookLM (if active):*
- `notebook_create("[Course Title] Sources")` — create Source notebook
- `source_add` all uploaded materials (`source_type="file", file_path=<path>`) and URLs
- `notebook_query` to validate coverage matrix against sources
- For gaps and supplementary sourcing: `research_start` → `research_import` → `source_add` new sources. If `research_import` times out (MCP error -32001), call `research_status` to retrieve the completed research results, then add individual source URLs via `notebook_add_url`. Do not retry `research_import` more than twice.
- `note_create(title="Coverage Matrix", content=<matrix>)` in Memory notebook
- `note_create(title="Media Inventory", content=<inventory>)` in Memory notebook

---

## Step 4 — Plan and Structure

**Goal:** Design the full course structure — lesson sequence, block skeletons, assessment approach — before writing any content.

**Step 4 mandatory skill calls — all 6 must be executed before assembling the Course Plan Document (4g):**
- [ ] 4a `curriculum-knowledge-architecture-designer`
- [ ] 4b `backwards-design-unit-planner`
- [ ] 4c `interleaving-unit-planner` *(skip for ≤2 lessons or where sequence is fixed by prerequisites)*
- [ ] 4d `spaced-practice-scheduler` *(skip for ≤2 lessons — uses final lesson order from 4c)*
- [ ] 4e `hinge-question-designer` *(once per lesson)*
- [ ] 4f `assessment-validity-checker`

Do not load `step4-block-planning.md` yet — it is loaded after all skill calls complete (before 4g).

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

### 4c. Interleaving

*Skip for courses of 2 lessons or fewer, or where sequence is fixed by prerequisites.*

Call `interleaving-unit-planner`:

```
topics: [[lesson topics in current planned order]]
subject: "[topic domain], [learner experience level]"
unit_length: "[N] lessons"
prerequisite_dependencies: [[topics that must precede others — from sequencing_notes Step 2c]]
```

**Use from output:** `interleaved_sequence` — update lesson order if recommended. If the order changes, use the updated order for all subsequent calls (4d, 4e, 4f).

### 4d. Spaced practice scheduling

*Skip for courses of 2 lessons or fewer.*

Call `spaced-practice-scheduler`:

```
topics: [[list of lesson topics in final sequence — after any interleaving reorder from 4c]]
timeline: "[N]-lesson course"
lessons_per_week: 1
topic_difficulty: [[high/medium/low per topic]]
curriculum_sequence: [sequencing_notes from Step 2c]
```

**Use from output:** `schedule`, `review_activity_suggestions`
Note which lessons should open with a retrieval starter on previous lesson content.

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
assessment_description: "Inline knowledge checks (quiz, fillinblank, matching, sorting blocks; shortanswer for guided reflection only) per content lesson. Assessment lesson with Leitner spaced repetition for formal evaluation."
intended_learning: [all learning objectives from Step 2]
student_level: [learner profile]
assessment_purpose: "formative (inline checks) and summative (assessment lesson)"
```

**Use from output:** `threats_identified`, `recommendations` — note any alignment gaps for Step 6.

### 4g. Assemble the Course Plan Document

> **NOW load `step4-block-planning.md`.** Use its Clark classification, skeleton templates, and validation checklist to structure the skill outputs above into block skeletons. The guide is a post-processing layer on skill output — not a standalone content-generation tool.

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
  Learner journey: [1–2 sentences — cognitive state on arrival, key challenge, what this lesson must accomplish for the learner]
  Block skeleton (annotated):
    [block type] | LT [N.N] | [I/We/You Do] | [cognitive purpose — one sentence: why this block exists at this position]
    [block type] | LT [N.N] | [I/We/You Do] | [...]
    ...
  Hinge question: [stem + 4 options + correctIndex from 4e]
  Diagnostic key: [per-distractor misconception explanation from 4e — used as feedbackIncorrect at Step 6f; must survive session breaks]
  Spaced review: [prior-lesson content to revisit at lesson open — from 4d]

Lesson 2: [title]
  ...

[Repeat per lesson]

ASSESSMENT LESSON
  Question count: [total]
  Per learning target:
    LT 1: [N] × [kind] — [rationale for this question type]
    LT 2: [N] × [kind] — [rationale]
    ...
  Non-assessable targets (content-block-only): [any LTs where supported question kinds cannot reach required Bloom level — these are assessed via branching/shortanswer blocks in content lessons only]
  Leitner spaced repetition: yes/no
  Supported kinds: mcq, multipleresponse, fillinblank, matching, sorting (NOT shortanswer)

ASSESSMENT FLAGS
  [Threats from 4f]
  [Type 3 flags from Step 2]
```

> **Block skeleton annotation is mandatory.** Each block must have a row with: block type, LT number (from Step 2), I/We/You Do phase, and one sentence on why this block exists at this position for this learner. A block plan without this annotation is incomplete — it shows structure but not pedagogical reasoning. The Learner Journey paragraph and Diagnostic Key must also be present in every lesson entry.

Present the plan to the user for review. Proceed to Step 5 for formal approval.

*NotebookLM (if active):*
- `notebook_query` Source notebook to validate lesson depth and sequencing
- `note_create(title="Course Plan", content=<full plan with block skeletons>)` in Memory notebook

---

## Step 5 — SME Approval + Artifact Planning

### NotebookLM Architecture (if active)

Two notebooks are used throughout this course build. No per-lesson notebooks are needed.

| Notebook | Purpose | Shared with learners? |
|---|---|---|
| **Sources notebook** | All course materials (primary + supplementary). Used for all artifact generation (scoped via `source_ids` + `focus_prompt`). | Yes — share as learner study companion |
| **Memory notebook** | Course plan, coverage matrix, learning objectives, lesson drafts, audit notes. Internal only. | No |

Source content is not duplicated per lesson — `source_ids` scoping selects the relevant subset per artifact, and `focus_prompt` provides instructional direction.

> **Steps 5a → 5b → 5c are sequential and interdependent.** You cannot write good generation prompts (5a) without an approved block plan. You cannot generate artifacts (5c) without knowing their purpose at position (5a). Do not generate any artifacts before 5a is complete and the block plan is approved.

Present the complete Course Plan Document. Wait for explicit approval.

If changes requested:
- **Wording changes:** update plan directly, continue
- **Structural changes** (lesson reorder, new objective, scope change): re-run relevant Step 4 skills with updated inputs, then resubmit plan
- **Objective changes:** return to Step 2, re-run from 2b

**→ PAUSE: Plan approved. Proceed to 5a (if NotebookLM active) or Step 6 (if not).**

*NotebookLM (if active):* `note_update(title="Course Plan", content=<approved plan + feedback>)` in Memory notebook. Then proceed through 5a–5c below.

### 5a. Artifact block planning

**Select which artifact types each lesson needs.** Not every lesson requires all three. Choose based on content density and Clark type:

| Artifact | Best for | Skip when |
|---|---|---|
| Audio overview | Concept-heavy or theory-heavy lessons (Concepts, Processes, Principles) | Short Facts lessons, lessons with <3 text blocks |
| Infographic | Lessons with structured content — definitions, taxonomies, comparison frameworks | Procedure-only lessons where a process block is more useful |
| Slide deck | Sequential or structured content suitable as a post-lesson reference | Lessons that are already highly structured (e.g. Procedures with process blocks) |

For each lesson, plan where each selected artifact will sit in the block skeleton and what instructional purpose it serves **at that position**. The purpose at the planned position determines the generation prompt — not the other way around.

```
ARTIFACT PLAN

Lesson [N]: [title]
  Audio (position: block [N], after [block name]):
    Purpose: [what this audio does at this position]
    Prompt: [derived from purpose + exact LT text from Step 2 + learner profile + prior lesson context]
  Infographic (position: block [N], before [block name]):
    Purpose: [what this visual does at this position]
    Prompt: [derived from purpose + specific content items to visualize]
  Slide deck (position: block [N], last):
    Purpose: [what this reference does at this position]
    Prompt: [derived from purpose + lesson structure/headings]

Lesson [M]: [title]
  Audio: skip (short Facts lesson — insufficient content depth)
  Infographic (position: ...):
    ...
```

**Update the lesson skeletons** in the Course Plan Document to include artifact slots at the planned positions. Artifact blocks are structural parts of the lesson, not media to add later:

```
Block skeleton (updated):
  heading
  text → hook
  audio [PENDING] — narrative introduction (purpose from artifact plan)
  text → concept definition
  ...
  image [PENDING] — visual consolidation (purpose from artifact plan)
  quiz × 2
  document [PENDING] — structured reference (purpose from artifact plan)
```

Save the artifact plan and updated skeletons to the source notes file.

### 5b. Scope sources per artifact

For each lesson and artifact type planned at 5a, identify which source IDs from the Sources notebook are most relevant to that artifact's instructional purpose.

1. Retrieve source IDs: use `source_list(notebook_id=<sources_nb_id>)` — record all returned IDs and their titles
2. For each planned artifact, select the 2–4 source IDs most relevant to that lesson's objectives and artifact type:
   - Audio: sources with narrative explanations, concept descriptions, and examples
   - Infographic: sources with structured content — definitions, numbered lists, comparison tables, taxonomic relationships
   - Slide deck: sources with sequential content — step-by-step descriptions, framework breakdowns, structured headings
3. Record the selected `source_ids` list per artifact in the artifact plan (saved to source notes file at 5a)

Do not use all sources for every artifact — unfocused source sets degrade generation quality. The `focus_prompt` + `source_ids` together provide the differentiation that per-lesson notebooks previously attempted.

### 5c. Generate artifacts

→ **EXECUTE:** For each lesson, call `studio_create` using the **purpose-informed prompts from the artifact plan** (5a) and the **source IDs captured at 5b**. Do not use a generic template — each prompt was derived from the instructional purpose at the planned block position.

```
studio_create(
  notebook_id=<sources_nb_id>,   ← same Sources notebook for all artifacts — scoped via source_ids
  artifact_type="audio",
  audio_format="deep_dive",
  focus_prompt="[prompt from artifact plan — written at 5a, derived from position + purpose]",
  source_ids=[<2–4 source IDs selected at 5b for this artifact>]
)
```

Repeat for `artifact_type="infographic"`, `"slide_deck"` per lesson as planned at 5a.

Generation takes 2–8 min per artifact — runs in parallel with Step 6.

### 5d. Inspect generated artifacts

Before marking any artifact as ready for the block plan, inspect it:

1. Call `studio_status` to confirm completion
2. For each completed artifact, check three things:
   - **Content accuracy** — Do the facts match the source material? Count taxonomy items, verify definitions, check nothing was collapsed or incorrectly merged.
   - **Coverage** — Does the artifact address the instructional purpose stated at 5a? A lesson-opening audio should frame the lesson; a consolidation infographic should cover all key items in the skeleton.
   - **Quality** — Is it clear, well-structured, and appropriate for the learner level from the course brief?
3. For any artifact that fails inspection:
   - Note the specific failure (e.g. "collapsed 5 components to 3", "missing application context examples")
   - Revise the `focus_prompt` with more explicit constraints addressing the failure
   - Regenerate using `studio_create` with the revised prompt and same `source_ids`
4. Mark passing artifacts as `[READY]` in the artifact plan in the source notes file; mark failing ones as `[REGENERATING]` until they pass

**Do not mark any artifact as `[READY]` without inspection. Assuming generation = quality is a workflow deviation.**

---

## Step 6 — Development

**Goal:** Draft full content for every block in every lesson.

**Step 6 mandatory skill calls — per lesson, in this order:**
- [ ] 6a `explicit-instruction-sequence-builder`
- [ ] 6b `worked-example-fading-designer` *(procedural/Clark Type: Procedures content only)*
- [ ] 6c `dual-coding-designer` *(per explanatory text block)*
- [ ] 6d `elaborative-interrogation-generator`
- [ ] 6e `retrieval-practice-generator` × 2 *(end-of-lesson + spaced opener from Lesson 2 onward; end-of-lesson only for Lesson 1)*
— then load guide, draft content (6f) —
- [ ] 6g `feedback-quality-analyser` *(per knowledge check block, after 6f)*

Do not load `step6-block-development.md` yet — it is loaded after 6a–6e complete (before 6f).

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

Translate the I/We/You Do structure into the block skeleton from the Step 4 Course Plan Document.

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
verbal_content: [outline of this text block's content — from source notes + 6a I Do structure]
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
content_text: [lesson content outline — from source notes + 6a I/We/You Do structure]
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

**Spaced opener (Lesson 2+ only — reviewing earlier content per 4d schedule):**
```
topic: [content scheduled for review at this lesson's opening — from 4d spaced-practice schedule]
student_level: [learner profile]
question_count: 3
time_since_learning: [gap since that content was taught — from 4d schedule]
known_misconceptions: [from Step 2b relevant to the reviewed content]
```

**Map retrieval type to block:**
- `free recall` → `shortanswer`
- `cued recall` → `fillinblank`
- `recognition` → `quiz` (or `truefalse` for binary content)

### 6f. Draft all block content

> **NOW load `step6-block-development.md`.** Use its field reference, knowledge check selection table, feedback rules, and hard rules to structure the skill outputs above into block content. The guide is a post-processing layer on skill output — not a standalone content-generation tool.

Draft full content for every block in the lesson skeleton (including artifact blocks from Step 5 if NotebookLM is active). For each block:

1. Use `step6-block-development.md` for field requirements and quality rules
2. Write `feedbackCorrect` and `feedbackIncorrect` at **Task or Process level** — "Correct!" alone fails the quality check
3. For `quiz` blocks: each distractor should represent a specific plausible misconception (use `diagnostic_key` from hinge question if available)
4. For `branching` blocks: write three choice types — best / acceptable-but-not-ideal / poor
5. For artifact blocks marked `[PENDING]`: draft the surrounding content (caption, intro text, alt text) and note `src: [PENDING: artifact_type]` — URLs are filled in at 6j when artifacts are downloaded

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

### 6h. Assessment question drafting

After all content lessons are drafted, draft the assessment lesson questions. Use the Course Plan Document's ASSESSMENT LESSON section (question counts, types, and rationale per learning target) as the specification. Use hinge questions from 4e and retrieval practice questions from 6e as a starting bank — adapt format to assessment question kinds. Draft additional questions to reach the count specified in the Course Plan Document.

For each question:
1. Write the question stem, referencing specific content from the drafted lessons
2. Write options/items using `common_misconceptions` from Step 2b as distractors (MCQ, multipleresponse) or plausible wrong orderings (sorting)
3. Write feedback at Task or Process level — explain why the correct answer is right and what the most likely error reveals
4. For `fillinblank`: ensure gaps have enough surrounding context for cued recall; populate the `acceptable` array
5. For `matching`: ensure each left item maps unambiguously to one right item

Save all assessment questions to the build markdown file.

**Assessment question kinds:** mcq, multipleresponse, fillinblank, matching, sorting. NOT shortanswer (no automated grading in assessment lessons).

### 6i. Content approval gate

Present the full draft (whole-course mode) or confirm all individual lessons are approved (lesson-by-lesson mode). Present assessment questions for approval alongside content.

**→ PAUSE: All content and assessment questions approved? Proceed to media sourcing.**

### 6j. Media sourcing

1. Review the media inventory from Step 3
2. Ask the user: "Are the following source files still in our conversation? If not, please re-upload: [list files from media inventory that contained usable assets]"
3. For each media gap identified in Step 3, source or select appropriate assets (images, diagrams, videos, documents)
4. Upload assets via `upload_media` and note the returned URLs in the build markdown file
5. Update block drafts in the build file with media URLs

Default: media sourcing is batched here, after all content is approved. In lesson-by-lesson mode, the user may request per-lesson media sourcing during the lesson loop — if they do, proceed as requested.

**After media sourcing, proceed to Step 7.**

*NotebookLM (if active):*
- After each lesson is approved: `note_create(title="Lesson [N] Draft", content=<draft>)` in Memory notebook
- Check `studio_status` periodically between lessons
- As artifacts complete: `download_artifact(output_path="/tmp/<file>")` → `upload_media(file_path=...)` → replace `[PENDING]` URLs in the build markdown file with the returned media URLs
- Artifact type → block type mapping: audio (M4A) → Audio block, infographic (PNG) → Image block, slide deck (PPTX) → Document block, study guide (Markdown) → Text block (render as HTML)
- The artifact block positions and surrounding content (caption, alt text) were already drafted at 6f — media sourcing only fills in the `src` URL

---

## Step 7 — Build in TideLearn

**Goal:** Persist all drafted and approved content into TideLearn via the MCP.

> **Load `step7-mcp-reference.md` now.** Use it for all field names, types, and constraints during building.

Always `get_course` before any edits to confirm current state and IDs.

**NotebookLM pre-build check (if active):** Before building, check `studio_status` for all pending artifacts. Download and upload any completed artifacts via `download_artifact` → `upload_media`. Replace `[PENDING]` URLs in the build markdown file with actual media URLs. If some artifacts are still generating, build those blocks with a placeholder `src` and note them — update via `update_block` when artifacts complete after the build.

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

*NotebookLM (if active):*
- `note_update(title="Build Log")` after each lesson/block is built
- Before sharing: remove internal notes from Source notebook (gap analysis, rough drafts) — keep source materials and web research only
- Share the Source notebook manually — provide the notebook URL to the user and instruct them to set sharing permissions in NotebookLM. Add a Button block with the shared URL.
- ⚠️ NotebookLM notebooks are not embeddable — Button block only, not Embed
- Remind author: if this course is later deleted, both notebooks remain in their Google account

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

### 8d. Audit re-run rule

**Audit fixes do NOT trigger re-run.** Changes made to address findings from 8a–8c are scoped corrections the audit already identified.

**User-requested changes after Step 8 DO trigger re-run.** If the user requests changes beyond what the audit found (e.g. "add a callout here", "rewrite this quiz", "change the branching scenario"), make the changes, then inform the user: "Since the course changed beyond audit fixes, I'm re-running the quality audit." Re-run 8a–8c on affected lessons.

**Step 9 only proceeds after a clean audit state** — either the original audit + fixes, or the most recent re-run + fixes.

**→ PAUSE: Audit complete (or re-run complete). Course ready for SME review. Proceed to Step 9.**

*NotebookLM (if active):* `note_update(title="Audit Notes")` with findings and modifications.

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

---

## Memory Notebook Sync Rules (NotebookLM active only)

Every mutation to the course must be mirrored to the Memory notebook in the same step — not as a cleanup pass.

| Action | Memory notebook update |
|--------|----------------------|
| Coverage matrix saved (Step 3) | `note_create("Coverage Matrix", <matrix>)` |
| Media inventory saved (Step 3) | `note_create("Media Inventory", <inventory>)` |
| Course plan approved (Step 5) | `note_update("Course Plan", <approved plan>)` |
| Artifact plan saved (Step 5a) | `note_create("Artifact Plan", <plan>)` |
| Artifact inspection complete (Step 5d) | `note_update("Artifact Plan", <inspection results: READY/REGENERATING status per artifact>)` |
| Lesson draft approved (Step 6) | `note_create("Lesson [N] Draft", <draft>)` |
| Lesson revised | `note_update("Lesson [N] Draft", <revised>)` |
| Lesson deleted | `note_delete("Lesson [N] Draft")` |
| Block revised | Update the relevant lesson draft note |
| Build log entry (Step 7) | `note_update("Build Log", <append entry>)` |
| Audit notes (Step 8) | `note_update("Audit Notes", <findings>)` |

**After context compaction:** retrieve Memory notebook notes by exact title. Source notebook is still available for `notebook_query`. Local markdown files are the backup.

⚠️ Verify the actual tool names (`note_create`, `note_update`, `note_get`, `note_delete`) against the installed `notebooklm-mcp-cli` before use — see `docs/notebooklm-setup.md`.
