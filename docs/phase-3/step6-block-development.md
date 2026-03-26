# Step 6 — Block Development Guide

Use this at Step 6 (Development) to draft content per block and select knowledge check types.
For lesson skeleton planning, use `step4-block-planning.md`.

---

## Block field reference

Key field guidance per block. Only blocks where field choices matter are listed.

### Text and prose

**`text`**
- Write conversationally — direct, second person where natural ("you'll notice…")
- Break at ~200 words by introducing another block type
- HTML accepted — use bold/italic for signalling, not decoration
- Never write a procedure in prose — use `process` block

**`callout`**
- `text` field: use HTML
- One key point only — if you're calling out three things, you're calling out nothing
- Use for: warnings, critical rules, must-remember takeaways

**`list`**
- Max 7 items without grouping (Miller's limit)
- All items should be parallel in structure
- If items have a meaningful sequence, use `process` or `timeline` instead

**`code`**
- Include inline comments explaining the reasoning, not just the syntax
- Without annotation, no worked example effect is achieved

---

### Media blocks

**`image`**
- `alt` is required — describe what the image conveys, not "diagram of X"
- The image must add information the surrounding text does not already contain
- If the image merely illustrates what the text says, remove it (redundancy effect)

**`video`**
- Accepts YouTube URL, Vimeo URL, or direct mp4
- Add a `description` field note about what learners should look for before watching
- Do not add captions that duplicate narration word-for-word

**`audio`**
- Accepts `audio/mpeg` and `audio/wav` — NOT `audio/mp3`

**`document`**
- Field is `src` — not `url`
- Frame the document with surrounding text: what it is, when to use it, what to look for

---

### Interactive presentation blocks

**`accordion`**
- Each panel should be independently meaningful — learners may open only one
- Do not use for sequential content — collapse destroys flow
- 3–5 panels is the practical range

**`tabs`**
- Tabs are for parallel content (same structure across each tab)
- If content is sequential or causal, use `process` or flowing `text` instead
- Accordion vs Tabs: **Accordion** = select from list. **Tabs** = switch between parallel views.

**`flashcard`**
- Front: the prompt / question / term
- Back: the answer / definition / explanation
- Add a text block before the flashcard set explicitly instructing: "Attempt to recall the answer before flipping."
- Without this instruction, learners read both sides passively — which is re-study, not retrieval practice.

**`process`**
- Each step needs: a step title + description
- Steps should be at roughly equal granularity
- Always follow with a `sorting`, `shortanswer`, or `quiz` — a process block without practice is demonstration without retrieval

**`timeline`**
- Each entry: date/period + event description
- Max 8–10 entries before visual overwhelm

**`chart`**
- Provide the data AND a text block with the key insight the chart illustrates
- The chart shows the pattern; the text states what to conclude from it

---

### Knowledge check blocks

**`quiz`** (single MCQ)
- 4 options preferred; minimum 3
- Each distractor should represent a specific, plausible misconception — not random wrong answers
- `correctIndex` is 0-based; factory default is -1 (must set before publish)
- `feedbackCorrect` + `feedbackIncorrect` are both required — see feedback rules below

**`truefalse`**
- Only for genuinely binary statements
- If the statement is "sometimes true," do not use this block

**`shortanswer`** ⚠️ NOT auto-scorable for open-ended questions
- `acceptable`: array of acceptable answers — only works for exact-match factual answers
- `caseSensitive`: usually false
- `trimWhitespace`: usually true
- `answer` field must be non-empty (min 1 char)
- For open/reflective questions, write a substantive `feedbackMessage` — but be aware the learner's response is not auto-graded
- **Not a supported assessment question kind** — cannot be used in assessment lessons
- For auto-scorable alternatives: use `quiz` (C), `multipleresponse` (AP), or `branching` (EV)

**`multipleresponse`**
- Maximum 6 options — more fails validation
- Minimum 2 correct indices required
- All correct answers must be specified via `correctIndices` (0-based)
- `feedbackMessage` (single field) — optional

**`fillinblank`**
- Template uses `{{1}}`, `{{2}}`, etc. gap markers — IDs injected server-side
- `acceptable` array per gap for auto-scoring
- Gaps should have enough surrounding context to make cued recall meaningful

**`matching`**
- MCP input uses `leftIndex`/`rightIndex` — IDs injected server-side
- 3–8 pairs; ensure each left item maps unambiguously to one right item

**`sorting`**
- Define the correct order explicitly
- Steps should be at roughly equal granularity
- Sequence should be unambiguous — if two steps could validly swap, redesign

**`hotspot`**
- Requires coordinate setup in the editor — flag this for human author completion
- Write surrounding text explaining what the learner is identifying and why

**`branching`**
- Each choice needs: choice text + consequence text
- Three choice types: best / acceptable-but-not-ideal / poor
- Consequence text must reflect what would actually happen in the real situation
- Do not write binary right/wrong choices — the nuance is what makes branching instructive

---

## Knowledge check selection

Select by instructional goal:

| Goal | Use | Bloom | Notes |
|---|---|---|---|
| Factual recall | `quiz`, `fillinblank`, `matching` | K | `fillinblank` stronger for vocabulary retention |
| Binary fact check | `truefalse` | K | 50% guessing chance — use sparingly |
| Concept recognition | `quiz`, `multipleresponse` | K, C | `multipleresponse` for multi-attribute concepts |
| Conceptual understanding | `quiz` (C), `multipleresponse` (AP) | C–AP | `shortanswer` also works but is not auto-scorable ⚠️ |
| Procedure sequencing | `sorting` | K, UN | Tests full sequence; use after `process` |
| Procedure application | `sorting` (UN), `quiz` with scenario stem | UN | `shortanswer` also works but is not auto-scorable ⚠️ |
| Cued recall | `fillinblank` | K, C | Use `acceptable` array for auto-scoring |
| Paired-associate recall | `matching` | K | 3–8 pairs; term ↔ definition |
| Visual identification | `hotspot` | K, UN | High authoring cost; flag for human |
| Elaborative interrogation | `quiz` with "why" stem, `multipleresponse` | C–AP | `shortanswer` also works but is not auto-scorable ⚠️ |
| Open application | `branching` | UN–EV | `shortanswer` also works but is not auto-scorable ⚠️ |
| Principles and judgement | `branching` | AP–EV | Only block that reliably reaches EV |
| Prior knowledge activation | `quiz` | K | Low stakes — lesson opener |
| Hinge point checkpoint | `quiz` (diagnostic MCQ) | K, C | Each distractor = a known misconception |

### Bloom ceiling by block — alignment check

If the objective requires a Bloom level above the block's ceiling, add a higher-order block alongside it.

| Block | Bloom ceiling |
|---|---|
| `truefalse` | K |
| `quiz` | C |
| `fillinblank` | C |
| `matching` | K |
| `sorting` | UN |
| `hotspot` | UN |
| `multipleresponse` | AP |
| `shortanswer` | AN |
| `branching` | EV |

---

## Feedback quality rules

Apply to: `feedbackMessage`, `feedbackCorrect`, `feedbackIncorrect` on all knowledge check blocks.

**Use Task or Process level — never ego level:**

| Level | Use? | Example |
|---|---|---|
| Task — correctness of this answer | ✅ Yes | "Correct — the pressure differential causes X because Y." |
| Process — strategy or what to do differently | ✅ Yes (preferred for skills) | "You may have confused X with Y. Check whether condition Z applies before choosing this option." |
| Ego — praise or blame of the person | ❌ Never | "Well done!" / "That's wrong." |

**Checklist — before finalising any knowledge check:**
- [ ] `feedbackCorrect` explains *why* the answer is correct (not just "Correct!")
- [ ] `feedbackIncorrect` explains *why* the correct answer is right and what the error reveals
- [ ] For MCQ: explains why *each distractor* is wrong (or the most likely wrong choice)
- [ ] Feedback operates at Task or Process level — not ego level
- [ ] For `branching`: each consequence explains what the decision would produce in the real situation

---

## Development hard rules

**D1: process blocks must be followed by practice**
Always add `sorting`, `shortanswer`, or `quiz` after a `process` block. Demonstration without retrieval activates passive processing only.

**D2: flashcard requires explicit recall instruction**
Add a text block before any flashcard set: "Try to recall the answer before flipping the card." Without this, learners read passively — which is re-study, not retrieval practice.

**D3: feedback is mandatory on all knowledge check blocks that support it**
- `quiz`, `truefalse`, `shortanswer`, `multipleresponse`: must have feedback text (`feedbackMessage` or `feedbackCorrect`/`feedbackIncorrect`)
- `fillinblank`, `matching`, `sorting`: set `showFeedback: true` (these blocks have no feedback text field — the platform shows correct/incorrect automatically)
- `branching`: consequence `content` on each choice serves as feedback — make it substantive

**D4: quiz alone is insufficient for objectives above C level**
If the lesson objective is UN or higher, the lesson needs `shortanswer`, `multipleresponse`, or `branching` in the knowledge check set.

**D5: images must complement text, not duplicate it**
If the adjacent text already conveys everything the image shows, remove the image. Decorative or redundant images increase extraneous cognitive load.

**D6: alt text is always required on image blocks**
Write what the image conveys for a non-sighted learner. "Diagram" is not alt text.

**D7: branching choices must be nuanced**
Three types: best / acceptable-but-not-ideal / poor. Binary right/wrong choices do not develop professional judgement.

**D8: document block field is `src`, not `url`**
Audio field accepts `audio/mpeg` or `audio/wav` — not `audio/mp3`.

---

## Assessment question types

Assessment lessons support 5 question kinds. `shortanswer` is NOT supported in assessment lessons.

| Kind | Bloom ceiling | Best for |
|---|---|---|
| `mcq` | C | Factual recall, concept recognition, hinge-point diagnostic |
| `multipleresponse` | AP | Multi-attribute concepts, procedure checklists |
| `fillinblank` | C | Vocabulary, key terms, cued recall |
| `matching` | K | Paired-associate recall (term ↔ definition) |
| `sorting` | UN | Procedure sequencing, categorisation |

For detailed field schemas, see `step7-mcp-reference.md`.

**Key differences from content blocks:**
- Question stem field is `text` (not `question`)
- Feedback is a single `feedback` field (not `feedbackMessage` or split correct/incorrect)
- FIB uses `text` (not `template`)
- Sorting uses `bucketIndex` (not `bucketId`)

**Learning targets that require Bloom levels above the assessment ceiling (AN, EV) cannot be formally assessed** in the assessment lesson. Flag these for content-block-only assessment using `branching` or `shortanswer` blocks within content lessons.
