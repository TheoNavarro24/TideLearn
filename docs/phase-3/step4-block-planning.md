# Step 4 — Block Planning Guide

**IMPORTANT — This guide is a decision framework, not a step replacement:**

This guide helps you *structure* lesson content using outputs from Step 4's Manning skills. **Reading and applying this guide alone does not complete Step 4.** The guide tells you how to use skill outputs; the skills themselves provide evidence-based validation (backwards design, hinge questions, assessment validity, interleaving, spaced practice).

**To complete Step 4, you must:**
1. Call all 6 Manning skills (4a–4f) listed in phase-3-workflow.md
2. Use this guide to structure block skeletons based on skill outputs
3. Assemble the Course Plan Document from all skill outputs
4. Present to SME for approval

Presenting block skeletons from this guide alone as "Step 4 complete" is a workflow deviation. The guide cannot replace the skills.

---

## Step 1: Classify the lesson objective

### Clark content type

| Type | Signal words | What the learner will do |
|---|---|---|
| **Facts** | names, dates, codes, regulations, terminology | recall exactly |
| **Concepts** | categories, definitions, identifying examples | recognise in new contexts |
| **Processes** | how X works, mechanism, what causes Y | explain the mechanism |
| **Procedures** | steps to perform, how to do X | perform correctly |
| **Principles** | when to use, guidelines, judgement calls, best practice | apply with judgement |

### Bloom level required

| Code | Level | Indicator |
|---|---|---|
| K | Remember | "define", "list", "name", "recall" |
| C | Comprehend | "explain", "describe", "summarise" |
| UN | Apply | "use", "demonstrate", "perform" |
| AP | Analyse | "compare", "differentiate", "examine" |
| AN | Synthesise | "design", "construct", "plan" |
| EV | Evaluate | "judge", "critique", "justify" |

### Learner experience level

| Level | Adjust skeleton how |
|---|---|
| **Novice** | Include process blocks, worked examples, scaffolded We Do before You Do |
| **Experienced** | Remove or abbreviate process blocks; increase shortanswer and branching; reduce flashcard |
| **Mixed** | Design for novice; note that experienced learners may move faster |

---

## Step 2: Select the skeleton

> **NotebookLM artifact slots (if active):** Each skeleton below includes conditional artifact placeholder lines at the end. These are part of the lesson structure — not optional decoration. Their positions within the lesson are determined at Step 5a (artifact block planning). If NotebookLM is not active, omit these lines entirely.
>
> Standard artifact set per lesson (determined at 5a):
> - `audio [PENDING]*` — lesson-level narrative overview or post-concept consolidation
> - `image [PENDING]*` — infographic for visual consolidation (concept map, taxonomy, framework)
> - `document [PENDING]*` — slide deck as structured post-lesson reference
> - `button*` — external supplementary resource links (from Step 3.6 supplementary sourcing)
> - `button*` — Sources notebook learner link (L1 opener + final lesson bookend only)
>
> `*` = NotebookLM active only. Not every lesson needs all types — omit per the selection table at Step 5a.

### Facts skeleton

```
heading
text            → hook: why these facts matter
toc             → if 3+ sections
text + list     → present the facts (max 7 items per list)
image           → labelled diagram (if spatial structure helps)
callout         → single most important item
flashcard       → We Do (attempt recall before flipping — instruct this explicitly)
quiz × 2–3     → You Do
button          → job aid / reference link
audio [PENDING]*    → position determined at Step 5a
image [PENDING]*    → position determined at Step 5a
document [PENDING]* → lesson-end reference
button*             → external supplementary resources (from Step 3.6 sourcing)
button*             → Sources notebook link (L1 and final lesson only)
```

### Concepts skeleton

```
heading
text            → open with a case or example that creates a question
text            → define the concept + its defining attributes
tabs/accordion  → concept variants or facets (tabs = parallel views; accordion = selectable list)
image           → concept map or relationship diagram
callout         → defining attributes — what makes it this concept, not another
shortanswer     → We Do: "Why does X qualify as Y? Explain in your own words."
quiz or multipleresponse → You Do
shortanswer     → You Do: apply to their own role
audio [PENDING]*    → position determined at Step 5a
image [PENDING]*    → position determined at Step 5a
document [PENDING]* → lesson-end reference
button*             → external supplementary resources (from Step 3.6 sourcing)
button*             → Sources notebook link (L1 and final lesson only)
```

### Processes skeleton

```
heading
video or image  → process overview (show the whole before the parts)
text            → why this process exists, what drives it
timeline/chart  → if data or time is core to the mechanism
text            → mechanism explanation
callout         → key mechanism or critical point
shortanswer     → We Do: "What would change if step X were different?"
sorting or quiz → You Do
audio [PENDING]*    → position determined at Step 5a
image [PENDING]*    → position determined at Step 5a
document [PENDING]* → lesson-end reference
button*             → external supplementary resources (from Step 3.6 sourcing)
button*             → Sources notebook link (L1 and final lesson only)
```

### Procedures skeleton

```
heading
video           → procedure demonstrated (strongest I Do for procedures)
text            → context: when to use, why it matters
process         → complete worked example (all steps)
callout         → common error points
document        → job aid checklist (embed for post-course transfer)
sorting         → We Do: reorder the steps
shortanswer     → You Do: describe how you'd handle a specific scenario
button          → link to real practice task
audio [PENDING]*    → position determined at Step 5a
image [PENDING]*    → position determined at Step 5a
document [PENDING]* → lesson-end reference
button*             → external supplementary resources (from Step 3.6 sourcing)
button*             → Sources notebook link (L1 and final lesson only)
```

### Principles skeleton

```
heading
branching       → anticipatory scenario: present the dilemma BEFORE teaching the principle
text            → state the principle + rationale
tabs            → how the principle applies in different contexts
callout         → key rule or guideline
text            → worked example: principle applied correctly
text            → non-example: principle misapplied + what goes wrong
shortanswer     → We Do: apply this principle to a given case
branching       → You Do: decision scenario (best / acceptable / poor choices)
shortanswer     → Transfer: "How will you apply this next week?"
audio [PENDING]*    → position determined at Step 5a
image [PENDING]*    → position determined at Step 5a
document [PENDING]* → lesson-end reference
button*             → external supplementary resources (from Step 3.6 sourcing)
button*             → Sources notebook link (L1 and final lesson only)
```

---

## Step 3: Validate the skeleton against planning rules

- [ ] Does the lesson open with an attention hook? (Gagné Event 1)
- [ ] Are objectives stated explicitly? (Gagné Event 2)
- [ ] Is prior knowledge activated before content is presented? (Gagné Event 3 — a low-stakes quiz or shortanswer opener)
- [ ] Is there at least one We Do block between content (I Do) and the first full knowledge check (You Do)?
- [ ] Does every `process` block have a subsequent `sorting`, `shortanswer`, or `quiz`?
- [ ] If Bloom objective is UN or higher, is there a `shortanswer`, `multipleresponse`, or `branching` block? (`quiz` alone is insufficient for UN+)
- [ ] If the learner profile is experienced, are worked examples reduced and branching / shortanswer increased?
- [ ] If the objective is dispositional (Type 3 — "demonstrates X mindset/behaviour"), has this been flagged? Async e-learning cannot assess dispositions — redirect to knowledge and reasoning prerequisites.

---

## Block quick-select: what each block is good for

| Block | Clark type | Bloom ceiling | I/We/You |
|---|---|---|---|
| `heading` | — | — | All |
| `divider` | — | — | All |
| `toc` | — | — | I Do |
| `text` | All | All | I Do |
| `list` | Facts, concepts | C | I Do |
| `callout` | All (signal) | — | I Do |
| `quote` | Principles, concepts | AP | I Do |
| `code` | Procedures, facts | AP | I Do |
| `image` | Facts, processes, procedures | AP | I Do |
| `video` | Procedures, processes | UN | I Do |
| `audio` | Concepts, processes | C | I Do |
| `document` | All (reference) | All | I/You |
| `accordion` | Facts, concepts, processes | C | I Do |
| `tabs` | Concepts, processes | AP | I Do |
| `embed` | All | All | I Do |
| `flashcard` | Facts, concepts | C | You Do |
| `timeline` | Facts, processes | C | I Do |
| `process` | Procedures, processes | UN | I Do → We Do |
| `chart` | Processes, facts, concepts | AP | I Do |
| `quiz` | Facts, concepts | C | You Do |
| `truefalse` | Facts | K | You Do |
| `shortanswer` | All | AN | We/You Do |
| `multipleresponse` | Concepts, procedures, principles | AP | You Do |
| `fillinblank` | Facts, concepts | C | You Do |
| `matching` | Facts | K | You Do |
| `sorting` | Procedures, facts | UN | We/You Do |
| `hotspot` | Facts (visual), processes | UN | You Do |
| `branching` | Principles | EV | You Do |
| `button` | — | — | You Do |
