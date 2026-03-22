# Comparative UI Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a `.docx` report benchmarking TideLearn's UI/UX against 6 competitors across 7 dimensions, with a prioritised roadmap of fixes.

**Architecture:** Research-first approach — audit TideLearn locally, then explore each competitor via browser, collecting screenshots and scores into structured data. Assemble into a formatted Word document at the end.

**Tech Stack:** Browser tools (Claude in Chrome), TideLearn dev server (Vite), `docx` skill for Word document generation, screenshots stored as PNGs.

**Spec:** `docs/superpowers/specs/2026-03-21-comparative-ui-analysis-design.md`

---

## Model Assignment

| Task | Model | Rationale |
|------|-------|-----------|
| Task 1 — scaffold | **Haiku** | Pure file/bash ops, no judgment |
| Task 2 — TideLearn audit | **Sonnet** | Scoring our own product = calibration baseline for all comparisons |
| Tasks 3–8 Phase A, Steps 1–6 — nav/screenshots | **Haiku** | Mechanical browser work: navigate, sign up, take screenshots, record raw observations |
| Tasks 3–8 Step 7 — extensibility research | **Sonnet** | Reading API docs and synthesising capability nuance requires judgment |
| Tasks 3–8 Step 8 — scoring | **Sonnet** | Applies rubric to Haiku's observations + screenshots; feeds Task 9 directly |
| Task 9 — matrix, journeys, roadmap | **Opus** | Single high-value synthesis session; gap analysis across 3 audiences is the crown jewel |
| Task 10 — assemble .docx | **Sonnet** | Execution task; analytical content already exists in scores.json from Task 9 |

**Handoff pattern for Tasks 3–8:** Haiku (Phase A) writes raw observations + screenshot paths to `{tool}-observations.json`. Sonnet (Step 7 + Step 8) reads that file plus the screenshots to score and write `scores-{tool}.json`. This preserves quality at the scoring step while using Haiku for the bulk of browser navigation.

---

## File Structure

```
docs/analysis/
├── assets/                              # All screenshots
│   ├── tidelearn-{dimension}-{n}.png    # TideLearn screenshots
│   ├── rise-{dimension}-{n}.png         # Articulate Rise screenshots
│   ├── easygenerator-{dimension}-{n}.png
│   ├── elucidat-{dimension}-{n}.png
│   ├── sana-{dimension}-{n}.png
│   ├── courseau-{dimension}-{n}.png
│   └── mindsmith-{dimension}-{n}.png
├── {tool}-observations.json             # Haiku handoff: raw notes + screenshot paths per competitor
├── scores-{tool}.json                   # Per-competitor scores (merged in Task 9)
├── scores.json                          # Merged scoring data (assembled in Task 9)
└── comparative-ui-analysis.docx         # Final deliverable
```

## Dimensions Reference

| # | Key | Dimension |
|---|-----|-----------|
| 1 | `onboarding` | First Impression & Onboarding |
| 2 | `visual` | Visual Design Quality |
| 3 | `editor` | Editor UX |
| 4 | `blocks` | Content Block Richness |
| 5 | `learner` | Learner Experience |
| 6 | `publishing` | Publishing & Sharing |
| 7 | `extensibility` | Extensibility & Workflow Integration |

## Scoring Rubric

| Score | Meaning |
|-------|---------|
| 1 | Missing or broken |
| 2 | Present but noticeably rough |
| 3 | Functional, meets baseline expectations |
| 4 | Polished, competitive with market |
| 5 | Best-in-class, sets the standard |

---

### Task 1: Set Up Project Structure `[Haiku]`

**Files:**
- Create: `docs/analysis/assets/` (directory)
- Create: `docs/analysis/scores.json` (empty scaffold)

- [ ] **Step 1: Create the assets directory**

```bash
mkdir -p docs/analysis/assets
```

- [ ] **Step 2: Create the scores scaffold**

Create `docs/analysis/scores.json` with this structure:

```json
{
  "tools": ["tidelearn", "rise", "easygenerator", "elucidat", "sana", "courseau", "mindsmith"],
  "dimensions": ["onboarding", "visual", "editor", "blocks", "learner", "publishing", "extensibility"],
  "scores": {},
  "journeys": {},
  "methodology": {}
}
```

- [ ] **Step 3: Commit**

```bash
git add docs/analysis/
git commit -m "chore: scaffold comparative analysis directory structure"
```

---

### Task 2: Audit TideLearn — Screenshots & Scoring `[Sonnet]`

**Files:**
- Modify: `docs/analysis/scores.json`
- Create: `docs/analysis/assets/tidelearn-*.png` (screenshots)

**Prerequisites:** TideLearn dev server running locally. A test course should already exist (the "Your Financial Future" course or create a quick one).

- [ ] **Step 1: Start TideLearn dev server**

```bash
cd /Users/theonavarro/TideLearn && npm run dev
```

Open the app in the browser at `http://localhost:5173` (or whatever port Vite assigns).

- [ ] **Step 2: Screenshot the landing page**

Navigate to the root URL. Take a screenshot. Save as `docs/analysis/assets/tidelearn-onboarding-1.png`.

- [ ] **Step 3: Screenshot the auth page**

Navigate to `/auth`. Take a screenshot. Save as `docs/analysis/assets/tidelearn-onboarding-2.png`.

- [ ] **Step 4: Screenshot the courses dashboard**

Navigate to `/courses`. Screenshot the empty state (if no courses) and the populated state (with courses). Save as `docs/analysis/assets/tidelearn-onboarding-3.png` and `tidelearn-visual-1.png`.

- [ ] **Step 5: Screenshot the editor**

Open an existing course in the editor. Screenshot:
- The overall editor layout → `tidelearn-editor-1.png`
- The block picker open → `tidelearn-editor-2.png`
- Block hover controls visible → `tidelearn-editor-3.png`
- A lesson with mixed content → `tidelearn-blocks-1.png`

- [ ] **Step 6: Screenshot the learner view**

Open the same course in view mode. Screenshot:
- The learner view with sidebar → `tidelearn-learner-1.png`
- A content lesson rendering → `tidelearn-learner-2.png`
- A quiz block in action → `tidelearn-learner-3.png`

- [ ] **Step 7: Screenshot the assessment view**

Navigate to an assessment lesson view. Screenshot as `tidelearn-learner-4.png`.

- [ ] **Step 8: Screenshot publishing flow**

Open the publish modal in the editor. Screenshot as `tidelearn-publishing-1.png`.

- [ ] **Step 9: Score TideLearn across all 7 dimensions**

Update `docs/analysis/scores.json` with TideLearn's scores. For each dimension, record:
- Score (1-5)
- Evidence source: `[direct]`
- Brief narrative (2-3 sentences) explaining the score
- List of screenshot filenames as evidence

**Note:** The "Visual Design Quality" dimension draws evidence from screenshots captured under all other dimensions — there's no dedicated "visual-only" screenshot pass. Score visual polish (typography, spacing, colour, consistency) based on the full set of TideLearn screenshots.

Be honest — score against the rubric, not against hopes.

- [ ] **Step 10: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit TideLearn UI across 7 dimensions"
```

---

### Task 3: Research Competitor — Articulate Rise

**Files:**
- Create: `docs/analysis/rise-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-rise.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/rise-*.png`

**Approach:** Rise has a 30-day free trial. Sign up using `theo.ai.agent+rise@gmail.com` / password `theo.ai.agent.1`. If sign-up is blocked, fall back to public sources.

#### Phase A — `[Haiku]` Steps 1–6: Navigate, screenshot, record observations

- [ ] **Step 1: Navigate to Articulate Rise website**

Go to the Articulate 360 / Rise website. Screenshot the landing/marketing page as `rise-onboarding-1.png`.

- [ ] **Step 2: Attempt sign-up for free trial**

Sign up using the throwaway email alias. Screenshot the sign-up flow as `rise-onboarding-2.png`. Note evidence source (`[direct]` or `[marketing]`).

- [ ] **Step 3: Explore the dashboard/empty state**

If logged in, screenshot the dashboard as `rise-visual-1.png`. Note the visual design quality.

- [ ] **Step 4: Walk through Journey 1 — "Create first course and add a lesson"**

Create a new course, add a lesson. Screenshot each major step:
- Course creation → `rise-editor-1.png`
- Adding a lesson → `rise-editor-2.png`
- Note step count and friction points.

- [ ] **Step 5: Walk through Journey 2 — "Build a lesson with mixed content"**

Add multiple block types (text, image, quiz, etc.). Screenshot:
- Block picker/inserter → `rise-blocks-1.png`
- A lesson with mixed content → `rise-blocks-2.png`

- [ ] **Step 6: Walk through Journey 3 — "Publish and share"**

Publish the course and get a shareable link. Screenshot:
- Publish flow → `rise-publishing-1.png`
- Learner view of published course → `rise-learner-1.png`

Write all raw observations, screenshot paths, step counts, and friction points to `docs/analysis/rise-observations.json`.

#### Phase B — `[Sonnet]` Steps 7–8: Extensibility research + scoring

- [ ] **Step 7: Check extensibility**

Research Rise's API, integrations, LTI support, webhook capabilities. Use help docs or marketing pages. Screenshot relevant pages as `rise-extensibility-1.png`. Evidence source likely `[docs]` or `[marketing]`.

- [ ] **Step 8: Score Rise across all 7 dimensions**

Read `rise-observations.json` and all screenshots. Write scores to `docs/analysis/scores-rise.json`. Same format as TideLearn: score, evidence source, narrative, screenshot list.

- [ ] **Step 9: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Articulate Rise UI across 7 dimensions"
```

---

### Task 4: Research Competitor — Easygenerator

**Files:**
- Create: `docs/analysis/easygenerator-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-easygenerator.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/easygenerator-*.png`

**Approach:** Easygenerator has a free plan. Sign up using `theo.ai.agent+easygenerator@gmail.com` / password `theo.ai.agent.1`. Follow the same process as Task 3.

#### Phase A — `[Haiku]` Steps 1–6: Navigate, screenshot, record observations

- [ ] **Step 1: Navigate to Easygenerator website, screenshot landing page** → `easygenerator-onboarding-1.png`
- [ ] **Step 2: Sign up for free plan, screenshot sign-up flow** → `easygenerator-onboarding-2.png`
- [ ] **Step 3: Screenshot dashboard/empty state** → `easygenerator-visual-1.png`
- [ ] **Step 4: Journey 1 — Create course, add lesson** → `easygenerator-editor-1.png`, `easygenerator-editor-2.png`
- [ ] **Step 5: Journey 2 — Build mixed content lesson** → `easygenerator-blocks-1.png`, `easygenerator-blocks-2.png`
- [ ] **Step 6: Journey 3 — Publish and share** → `easygenerator-publishing-1.png`, `easygenerator-learner-1.png`

Write all raw observations, screenshot paths, step counts, and friction points to `docs/analysis/easygenerator-observations.json`.

#### Phase B — `[Sonnet]` Steps 7–8: Extensibility research + scoring

- [ ] **Step 7: Check extensibility** → `easygenerator-extensibility-1.png`
- [ ] **Step 8: Score Easygenerator across all 7 dimensions** — read `easygenerator-observations.json` and screenshots, write to `scores-easygenerator.json`
- [ ] **Step 9: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Easygenerator UI across 7 dimensions"
```

---

### Task 5: Research Competitor — Elucidat

**Files:**
- Create: `docs/analysis/elucidat-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-elucidat.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/elucidat-*.png`

**Approach:** Elucidat is enterprise-only (no free trial). Evidence will come from public sources: marketing site, YouTube demos, G2/Capterra reviews, help documentation. Tag all evidence as `[marketing]`, `[review]`, or `[docs]`.

**Note:** Because there's no direct access, Steps 1–4 are all public-source research. The Phase A/B split still applies — Haiku collects the raw material, Sonnet synthesises and scores.

#### Phase A — `[Haiku]` Steps 1–4: Public-source research, screenshots

- [ ] **Step 1: Navigate to Elucidat website, screenshot landing page** → `elucidat-onboarding-1.png` `[marketing]`
- [ ] **Step 2: Search YouTube for "Elucidat tutorial" or "Elucidat demo"** — screenshot key frames from articles/thumbnails or review sites → `elucidat-editor-1.png`
- [ ] **Step 3: Search G2/Capterra for Elucidat reviews with screenshots** → `elucidat-visual-1.png`, `elucidat-blocks-1.png`
- [ ] **Step 4: Check Elucidat help docs for UI screenshots** → `elucidat-learner-1.png`, `elucidat-publishing-1.png`

Write all raw observations, screenshot paths, and evidence source tags to `docs/analysis/elucidat-observations.json`.

#### Phase B — `[Sonnet]` Steps 5–6: Extensibility research + scoring

- [ ] **Step 5: Research extensibility** (API docs, integrations page) → `elucidat-extensibility-1.png`
- [ ] **Step 6: Score Elucidat across all 7 dimensions** — read `elucidat-observations.json` and screenshots, write to `scores-elucidat.json`. Note evidence limitations in narrative.
- [ ] **Step 7: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Elucidat UI across 7 dimensions (public sources)"
```

---

### Task 6: Research Competitor — Sana

**Files:**
- Create: `docs/analysis/sana-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-sana.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/sana-*.png`

**Approach:** Sana may have a free trial or demo. Attempt sign-up with `theo.ai.agent+sana@gmail.com`. If gated, use public sources.

#### Phase A — `[Haiku]` Steps 1–4: Navigate, screenshot, record observations

- [ ] **Step 1: Navigate to Sana website, screenshot landing page** → `sana-onboarding-1.png`
- [ ] **Step 2: Attempt sign-up or request demo, screenshot flow** → `sana-onboarding-2.png`
- [ ] **Step 3: If accessible — walk through all 3 journeys, screenshot key screens** → `sana-editor-1.png`, `sana-blocks-1.png`, `sana-learner-1.png`, `sana-publishing-1.png`
- [ ] **Step 4: If NOT accessible — gather from marketing site, YouTube, G2** → tag as `[marketing]`/`[review]`

Write all raw observations, screenshot paths, step counts, and friction points to `docs/analysis/sana-observations.json`.

#### Phase B — `[Sonnet]` Steps 5–6: Extensibility research + scoring

- [ ] **Step 5: Research extensibility** (API, integrations) → `sana-extensibility-1.png`
- [ ] **Step 6: Score Sana across all 7 dimensions** — read `sana-observations.json` and screenshots, write to `scores-sana.json`
- [ ] **Step 7: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Sana UI across 7 dimensions"
```

---

### Task 7: Research Competitor — Courseau

**Files:**
- Create: `docs/analysis/courseau-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-courseau.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/courseau-*.png`

**Approach:** Courseau has a free tier. Sign up with `theo.ai.agent+courseau@gmail.com` / password `theo.ai.agent.1`.

#### Phase A — `[Haiku]` Steps 1–5: Navigate, screenshot, record observations

- [ ] **Step 1: Navigate to Courseau website, screenshot landing page** → `courseau-onboarding-1.png`
- [ ] **Step 2: Sign up for free tier** → `courseau-onboarding-2.png`
- [ ] **Step 3: Journey 1 — Create course, add lesson** → `courseau-editor-1.png`, `courseau-editor-2.png`
- [ ] **Step 4: Journey 2 — Build mixed content lesson** → `courseau-blocks-1.png`, `courseau-blocks-2.png`
- [ ] **Step 5: Journey 3 — Publish and share** → `courseau-publishing-1.png`, `courseau-learner-1.png`

Write all raw observations, screenshot paths, step counts, and friction points to `docs/analysis/courseau-observations.json`.

#### Phase B — `[Sonnet]` Steps 6–7: Extensibility research + scoring

- [ ] **Step 6: Check extensibility** → `courseau-extensibility-1.png`
- [ ] **Step 7: Score Courseau across all 7 dimensions** — read `courseau-observations.json` and screenshots, write to `scores-courseau.json`
- [ ] **Step 8: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Courseau UI across 7 dimensions"
```

---

### Task 8: Research Competitor — Mindsmith

**Files:**
- Create: `docs/analysis/mindsmith-observations.json` (Haiku handoff)
- Create: `docs/analysis/scores-mindsmith.json` (Sonnet scoring output)
- Create: `docs/analysis/assets/mindsmith-*.png`

**Approach:** Mindsmith has a free tier. Sign up with `theo.ai.agent+mindsmith@gmail.com` / password `theo.ai.agent.1`.

#### Phase A — `[Haiku]` Steps 1–5: Navigate, screenshot, record observations

- [ ] **Step 1: Navigate to Mindsmith website, screenshot landing page** → `mindsmith-onboarding-1.png`
- [ ] **Step 2: Sign up for free tier** → `mindsmith-onboarding-2.png`
- [ ] **Step 3: Journey 1 — Create course, add lesson** → `mindsmith-editor-1.png`, `mindsmith-editor-2.png`
- [ ] **Step 4: Journey 2 — Build mixed content lesson** → `mindsmith-blocks-1.png`, `mindsmith-blocks-2.png`
- [ ] **Step 5: Journey 3 — Publish and share** → `mindsmith-publishing-1.png`, `mindsmith-learner-1.png`

Write all raw observations, screenshot paths, step counts, and friction points to `docs/analysis/mindsmith-observations.json`.

#### Phase B — `[Sonnet]` Steps 6–7: Extensibility research + scoring

- [ ] **Step 6: Check extensibility** → `mindsmith-extensibility-1.png`
- [ ] **Step 7: Score Mindsmith across all 7 dimensions** — read `mindsmith-observations.json` and screenshots, write to `scores-mindsmith.json`
- [ ] **Step 8: Commit**

```bash
git add docs/analysis/
git commit -m "research: audit Mindsmith UI across 7 dimensions"
```

---

### Task 9: Build Comparison Matrix & Journey Walkthroughs `[Opus]`

**Files:**
- Modify: `docs/analysis/scores.json` (add journey data)
- Create: internal notes for document assembly

- [ ] **Step 1: Review all scores in `scores.json`**

Read through all 7 tools × 7 dimensions. Identify:
- Best-in-class per dimension (who scored highest)
- TideLearn's relative position per dimension
- Top 5 priority gaps (biggest delta between TideLearn and the best)

- [ ] **Step 2: Write journey comparison notes**

For each of the 3 journeys, compile:
- Step count per tool
- Friction points per tool
- Design quality observations
- Side-by-side screenshot references

Add this data to `scores.json` under the `journeys` key.

- [ ] **Step 3: Derive prioritised roadmap**

Rank TideLearn's gaps by impact across the three audiences:
- L&D testers: what would make them say "this isn't ready"?
- MA supervisors: what undermines credibility?
- Investors: what screams "not market-ready"?

Categorise each gap as "quick win" (< 1 day) or "larger effort" (multi-day).

Add to `scores.json` under a `roadmap` key.

- [ ] **Step 4: Commit**

```bash
git add docs/analysis/scores.json
git commit -m "research: complete comparison matrix, journeys, and roadmap"
```

---

### Task 10: Assemble the .docx Report `[Sonnet]`

**Files:**
- Create: `docs/analysis/comparative-ui-analysis.docx`

**Approach:** Use the `docx` skill (anthropic-skills:docx) to generate a formatted Word document.

- [ ] **Step 1: Read all data from `scores.json`**

Load the complete scoring data, journey walkthroughs, and roadmap.

- [ ] **Step 2: Generate the .docx using the docx skill**

The document structure must follow the spec:

**Part 1 — Executive Summary**
- Title page with date, author, "Internal Working Document"
- Comparison matrix table: 7 tools as columns, 7 dimensions as rows
- Colour-code cells: 1-2 = red, 3 = amber, 4-5 = green
- One paragraph on TideLearn's overall position
- Bulleted list of top 5 priority gaps

**Part 2 — Per-Dimension Deep Dives** (7 sections)
Each section:
- Heading: dimension name
- "Best in class" paragraph identifying the top scorer and why
- "TideLearn today" paragraph with honest assessment
- "Gaps and recommendations" paragraph
- Inline screenshots with captions (referencing evidence source tag)

**Part 3 — Key Journey Walkthroughs** (3 sections)
Each journey:
- Heading: journey name
- Table: tool name | step count | friction points | design quality note
- Screenshots from key moments in each tool's journey
- Summary paragraph

**Part 4 — Prioritised Roadmap**
- Table: gap | impact (high/medium/low) | effort (quick win / larger) | suggested order
- Grouped by priority tier

**Methodology Section**
- How each tool was accessed
- Evidence source distribution
- Limitations and bias acknowledgment

- [ ] **Step 3: Verify the .docx opens correctly**

Check the file exists and is well-formed.

- [ ] **Step 4: Commit**

```bash
git add docs/analysis/comparative-ui-analysis.docx
git commit -m "deliverable: comparative UI analysis report (.docx)"
```

---

## Task Dependency Graph

```
Task 1 (scaffold)
  ↓
Task 2 (TideLearn audit)
  ↓
Tasks 3-8 (competitor research — can run in parallel)
  ↓
Task 9 (matrix + journeys + roadmap)
  ↓
Task 10 (assemble .docx)
```

**Parallelisation note:** Tasks 3–8 are independent of each other. Each task runs in two sequential phases — Phase A (Haiku) then Phase B (Sonnet) — but all six tasks can run in parallel with each other. If using subagent-driven-development, dispatch 6 subagents simultaneously: each subagent runs its own Phase A → Phase B sequence internally using the appropriate model for each phase. Each writes to its own `{tool}-observations.json` and `scores-{tool}.json` to avoid conflicts. Task 9 Step 1 must begin by merging all `scores-{tool}.json` files into the main `scores.json` before analysis.
