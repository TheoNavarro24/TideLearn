# Comparative UI Analysis: TideLearn vs Rapid eLearning Authoring Tools

**Date:** 2026-03-21
**Status:** Spec
**Author:** Theo Navarro + Claude Code

## Purpose

An internal working document comparing TideLearn's UI/UX against 6 competitors across 7 dimensions. The analysis serves two goals:

1. **Identify and prioritise gaps** that prevent TideLearn from feeling market-ready
2. **Produce a prioritised roadmap** of UI/UX improvements to execute before sharing with testers

Secondary: the document should be rigorous enough to cite in Theo's MA research if needed.

### Audiences for TideLearn (not the analysis itself)

- **L&D professionals / early users** — evaluating TideLearn's UX and giving feedback
- **MA cohort / academic supervisors** — reviewing TideLearn as part of Theo's research
- **Investors / stakeholders** (future) — evaluating market readiness

## Competitor Set

### Established Rapid Authoring Tools (3)

| Tool | Why included |
|------|-------------|
| **Articulate Rise** | Market leader for block-based rapid authoring. The tool TideLearn will be most frequently compared to. |
| **Easygenerator** | Targets SMEs and non-instructional designers — mirrors TideLearn's "anyone can build a course" positioning. |
| **Elucidat** | Enterprise-grade with strong design quality. Represents the "high polish" end of the market. |

### AI-Native Course Builders (3)

| Tool | Why included |
|------|-------------|
| **Sana** | AI-native learning platform with significant funding and clean, modern UI. Design quality benchmark. |
| **Courseau** | AI-first course creation, recent entrant. Closest to TideLearn's speed-focused angle. |
| **Mindsmith** | AI-powered, focused on speed. Provides pattern-matching across the AI category. |

### Not Included

- **Articulate Storyline / Adobe Captivate** — slide-based, developer-oriented, different category
- **Canvas / Moodle** — LMS platforms, not authoring tools
- **Canva / Genially** — adjacent but not course authoring tools

## Evaluation Framework

### 7 Dimensions, 1-5 Scale

| # | Dimension | What it covers |
|---|-----------|---------------|
| 1 | **First Impression & Onboarding** | Landing page quality, sign-up flow, empty state, time-to-first-course |
| 2 | **Visual Design Quality** | Typography, colour, spacing, consistency, iconography — does it look professional? |
| 3 | **Editor UX** | Adding/editing/reordering content blocks, inline editing feel, cognitive load |
| 4 | **Content Block Richness** | Variety and quality of available block types, customisation options per block |
| 5 | **Learner Experience** | What the published/viewed course looks and feels like to the end learner |
| 6 | **Publishing & Sharing** | Publish flow, shareable links, export options (SCORM, PDF, etc.) |
| 7 | **Extensibility & Workflow Integration** | API access, integrations, ability to work with external tools and workflows (MCP, LTI, webhooks, etc.) |

### Scoring Rubric

| Score | Meaning |
|-------|---------|
| 1 | Missing or broken |
| 2 | Present but noticeably rough |
| 3 | Functional, meets baseline expectations |
| 4 | Polished, competitive with market |
| 5 | Best-in-class, sets the standard |

Each dimension receives: a score per tool, 2-3 annotated screenshots as evidence, and a short narrative on where TideLearn sits relative to the field.

## Deliverable

### Format

`.docx` file (Word document) stored in the repo. Theo uploads to Google Drive where it opens natively as a Google Doc with formatting, tables, and images preserved.

**Location:** `docs/analysis/comparative-ui-analysis.docx`
**Assets:** `docs/analysis/assets/` (screenshots)

### Structure

**Part 1 — Executive Summary**
- Comparison matrix (7 tools × 7 dimensions, colour-coded scores)
- TideLearn's overall position in one paragraph
- Top 5 priority gaps to close before sharing with testers

**Part 2 — Per-Dimension Deep Dives**
For each of the 7 dimensions:
- What "good" looks like (best-in-class example from the set)
- Where TideLearn sits today with evidence
- Specific gaps and what fixing them would look like
- Annotated screenshots where available

**Part 3 — Key Journey Walkthroughs**
Three critical user flows compared across all tools:
1. "Create my first course and add a lesson" (onboarding → editor)
2. "Build a lesson with mixed content" (block variety, editing flow)
3. "Publish and share with a learner" (publish → learner view)

Step counts, friction points, and design quality at each stage.

**Part 4 — Prioritised Roadmap**
- Gaps ranked by impact (what matters most across the three audiences)
- Quick wins vs larger efforts
- Suggested order of work

### Methodology Section

For academic credibility, the report includes a methodology section documenting:
- How each tool was accessed (free trial, free tier, public sources)
- Evidence source tags on every screenshot (direct access vs marketing material vs review site)
- Limitations and potential bias (e.g. TideLearn scored from real product, competitors from best-available access)

## Process

### Step 1 — Audit TideLearn
Run the app locally, navigate all main pages (landing, auth, courses, editor, learner view, assessment view), screenshot every view, and score each dimension honestly against the rubric.

### Step 2 — Research Competitors (one at a time)
For each of the 6 tools:
- Sign up for free tier/trial using throwaway email (theo.ai.agent@gmail.com)
- Where sign-up isn't possible (e.g. Elucidat enterprise gate), use public sources: marketing pages, YouTube walkthroughs, G2/Capterra screenshots, help docs
- Walk through the same 3 key journeys where possible
- Score each dimension, noting evidence source
- Screenshot key screens

### Step 3 — Build the Comparison Matrix
All 7 tools × 7 dimensions, colour-coded, with narrative summaries.

### Step 4 — Write Journey Walkthroughs
Side-by-side the 3 critical flows, annotate friction points and design quality.

### Step 5 — Derive the Prioritised Roadmap
Rank gaps by impact across the three audiences (L&D testers, MA supervisors, future investors).

### Step 6 — Assemble the .docx
Generate the report as a `.docx` file using the `docx` skill (python-docx or equivalent). Inline screenshots, formatted tables with colour-coded cells, and the roadmap. Saved in repo for upload to Google Drive.

### Screenshot Conventions
- Naming: `{tool}-{dimension}-{n}.png` (e.g., `rise-editor-ux-1.png`)
- "Annotated" means screenshots with descriptive captions in the document text, not visual overlays
- Use email aliases where possible (e.g., `theo.ai.agent+rise@gmail.com`) to avoid sign-up conflicts

## Evidence Transparency

Every screenshot and finding is tagged with its source:
- `[direct]` — firsthand access via free trial/tier
- `[marketing]` — from the tool's public website or demo videos
- `[review]` — from G2, Capterra, or industry review articles
- `[docs]` — from the tool's help documentation

## Out of Scope

- Feature-by-feature comparison (this is UI/UX focused, not a feature matrix)
- Pricing analysis
- Technical architecture comparison
- In-product AI feature evaluation (TideLearn's AI strategy is MCP/Skills-based, not embedded)
