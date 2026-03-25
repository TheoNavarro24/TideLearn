# Comparative Feature Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a `.docx` report benchmarking TideLearn's feature set against 6 competitors across 12 capability categories, with a product roadmap that distinguishes table-stakes gaps from deliberate non-features.

**Architecture:** Research-first, structured-collection approach — each competitor visit captures a feature checklist (presence + depth) alongside raw observations. Phase A (Haiku) fills in the binary checklist mechanically; Phase B (Sonnet) assesses depth and nuance. Synthesis (Opus) interprets gaps through TideLearn's MCP-first strategy to produce a prioritised product roadmap. **Designed to share Phase A/B research with the UI Analysis plan** (`2026-03-21-comparative-ui-analysis.md`) — when running both plans together, combine Phase A and Phase B per competitor into a single visit rather than two. When running this plan alone, Phase A still collects screenshots for evidence.

**Tech Stack:** Browser tools (Claude in Chrome), TideLearn dev server (Vite), `docx` skill for Word document generation.

**Related plan:** `docs/superpowers/plans/2026-03-21-comparative-ui-analysis.md`

---

## Model Assignment

| Task | Model | Rationale |
|------|-------|-----------|
| Task 1 — scaffold | **Haiku** | Pure file/bash ops, no judgment |
| Task 2 — TideLearn feature audit | **Sonnet** | Calibration baseline; requires reading codebase + app to know what actually exists vs what's aspirational |
| Tasks 3–8 Phase A — feature checklist collection | **Haiku** | Structured binary checklist: navigate, click, record yes/no/partial per feature. Low ambiguity, mechanical |
| Tasks 3–8 Phase B — depth scoring | **Sonnet** | Assesses quality/depth of features that exist, not just presence. "Does it have branching?" is Haiku. "Is the branching meaningful?" is Sonnet |
| Task 9 — feature matrix + product roadmap | **Opus** | Strategic synthesis: which gaps are existential vs deliberate vs deferred, given TideLearn's MCP-first positioning. This is the crown jewel |
| Task 10 — assemble .docx | **Sonnet** | Execution task; all content already structured in features.json from Task 9 |

**Handoff pattern for Tasks 3–8:** Haiku (Phase A) fills `{tool}-features.json` with presence data. Sonnet (Phase B) reads that file and adds depth scores, writing to `feature-scores-{tool}.json`. This preserves analytical quality at the depth-scoring step while using Haiku for the mechanical checklist pass.

---

## File Structure

```
docs/analysis/
├── assets/                                  # Screenshots (shared with UI plan)
│   ├── tidelearn-feature-{category}-{n}.png
│   └── {tool}-feature-{category}-{n}.png
├── feature-checklist-template.json         # Created in Task 1 — Haiku copies this per competitor
├── tidelearn-features.json                 # TideLearn feature inventory (Task 2)
├── {tool}-features.json                    # Per-competitor presence data (Phase A)
├── feature-scores-{tool}.json             # Per-competitor depth scores (Phase B)
├── features.json                           # Merged matrix (assembled in Task 9)
└── comparative-feature-analysis.docx       # Final deliverable (Task 10)
```

---

## Feature Categories Reference

| # | Key | Category |
|---|-----|----------|
| 1 | `blocks` | Content Block Types |
| 2 | `assessment` | Assessment & Question Types |
| 3 | `ai` | AI-Powered Features |
| 4 | `compliance` | Compliance Standards (SCORM/LTI/xAPI) |
| 5 | `analytics` | Analytics & Reporting |
| 6 | `collaboration` | Collaboration & Workflow |
| 7 | `templates` | Templates & Theming |
| 8 | `branching` | Branching & Adaptive Learning |
| 9 | `media` | Media & Assets |
| 10 | `accessibility` | Accessibility |
| 11 | `publishing` | Publishing & Distribution |
| 12 | `extensibility` | Extensibility (API / Webhooks / MCP) |

## Feature Scoring Rubric

### Presence (Phase A — Haiku)

| Value | Meaning |
|-------|---------|
| `"yes"` | Feature clearly present and functional |
| `"partial"` | Feature exists but is incomplete, limited, or in beta |
| `"no"` | Feature is absent |
| `"unknown"` | Could not determine from available access |

### Depth (Phase B — Sonnet)

| Score | Meaning |
|-------|---------|
| 0 | Missing — not present |
| 1 | Basic — exists but rudimentary / token implementation |
| 2 | Competitive — meets market standard |
| 3 | Advanced — notably strong, above average |
| 4 | Best-in-class — industry-leading implementation |

---

## Feature Checklist Template

This is the full checklist Haiku fills in during Phase A. Haiku should answer as many as possible from direct product use; mark `"unknown"` if the feature genuinely cannot be confirmed from available access.

```json
{
  "tool": "{tool-name}",
  "evidence_source": "[direct|marketing|docs|review]",
  "accessed_via": "free_trial|free_tier|marketing_only|mixed",
  "blocks": {
    "rich_text": {"presence": "yes|partial|no|unknown", "notes": ""},
    "image": {"presence": "yes|partial|no|unknown", "notes": ""},
    "video_embed": {"presence": "yes|partial|no|unknown", "notes": ""},
    "video_upload": {"presence": "yes|partial|no|unknown", "notes": ""},
    "audio": {"presence": "yes|partial|no|unknown", "notes": ""},
    "quote_callout": {"presence": "yes|partial|no|unknown", "notes": ""},
    "accordion": {"presence": "yes|partial|no|unknown", "notes": ""},
    "tabs": {"presence": "yes|partial|no|unknown", "notes": ""},
    "table": {"presence": "yes|partial|no|unknown", "notes": ""},
    "timeline": {"presence": "yes|partial|no|unknown", "notes": ""},
    "embed_iframe": {"presence": "yes|partial|no|unknown", "notes": ""},
    "code_block": {"presence": "yes|partial|no|unknown", "notes": ""},
    "interactive_hotspot": {"presence": "yes|partial|no|unknown", "notes": ""},
    "flashcard": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "assessment": {
    "mcq": {"presence": "yes|partial|no|unknown", "notes": ""},
    "true_false": {"presence": "yes|partial|no|unknown", "notes": ""},
    "fill_blank": {"presence": "yes|partial|no|unknown", "notes": ""},
    "matching": {"presence": "yes|partial|no|unknown", "notes": ""},
    "hotspot_image": {"presence": "yes|partial|no|unknown", "notes": ""},
    "drag_drop": {"presence": "yes|partial|no|unknown", "notes": ""},
    "essay_open": {"presence": "yes|partial|no|unknown", "notes": ""},
    "knowledge_check_unscored": {"presence": "yes|partial|no|unknown", "notes": ""},
    "question_banks": {"presence": "yes|partial|no|unknown", "notes": ""},
    "randomisation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "passing_score": {"presence": "yes|partial|no|unknown", "notes": ""},
    "multiple_attempts": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "ai": {
    "ai_course_generation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_content_rewrite": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_quiz_generation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_translation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_image_generation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_learner_feedback": {"presence": "yes|partial|no|unknown", "notes": ""},
    "ai_tutor_chat": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "compliance": {
    "scorm_12": {"presence": "yes|partial|no|unknown", "notes": ""},
    "scorm_2004": {"presence": "yes|partial|no|unknown", "notes": ""},
    "xapi_tin_can": {"presence": "yes|partial|no|unknown", "notes": ""},
    "lti_consumer": {"presence": "yes|partial|no|unknown", "notes": ""},
    "lti_provider": {"presence": "yes|partial|no|unknown", "notes": ""},
    "pdf_export": {"presence": "yes|partial|no|unknown", "notes": ""},
    "video_export": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "analytics": {
    "completion_tracking": {"presence": "yes|partial|no|unknown", "notes": ""},
    "quiz_score_analytics": {"presence": "yes|partial|no|unknown", "notes": ""},
    "time_on_task": {"presence": "yes|partial|no|unknown", "notes": ""},
    "learner_progress_view": {"presence": "yes|partial|no|unknown", "notes": ""},
    "cohort_analytics": {"presence": "yes|partial|no|unknown", "notes": ""},
    "analytics_dashboard": {"presence": "yes|partial|no|unknown", "notes": ""},
    "report_export": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "collaboration": {
    "multi_author": {"presence": "yes|partial|no|unknown", "notes": ""},
    "inline_commenting": {"presence": "yes|partial|no|unknown", "notes": ""},
    "review_approval_workflow": {"presence": "yes|partial|no|unknown", "notes": ""},
    "version_history": {"presence": "yes|partial|no|unknown", "notes": ""},
    "roles_permissions": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "templates": {
    "course_templates": {"presence": "yes|partial|no|unknown", "notes": ""},
    "lesson_templates": {"presence": "yes|partial|no|unknown", "notes": ""},
    "theme_customisation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "white_label": {"presence": "yes|partial|no|unknown", "notes": ""},
    "custom_domain": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "branching": {
    "conditional_navigation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "prerequisites": {"presence": "yes|partial|no|unknown", "notes": ""},
    "personalised_paths": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "media": {
    "direct_video_upload": {"presence": "yes|partial|no|unknown", "notes": ""},
    "cdn_hosting": {"presence": "yes|partial|no|unknown", "notes": ""},
    "stock_media_library": {"presence": "yes|partial|no|unknown", "notes": ""},
    "in_product_image_editing": {"presence": "yes|partial|no|unknown", "notes": ""},
    "subtitle_caption_support": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "accessibility": {
    "wcag_21_aa": {"presence": "yes|partial|no|unknown", "notes": ""},
    "keyboard_navigation": {"presence": "yes|partial|no|unknown", "notes": ""},
    "screen_reader_support": {"presence": "yes|partial|no|unknown", "notes": ""},
    "alt_text_support": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "publishing": {
    "shareable_link_no_lms": {"presence": "yes|partial|no|unknown", "notes": ""},
    "password_protection": {"presence": "yes|partial|no|unknown", "notes": ""},
    "sso_learner_access": {"presence": "yes|partial|no|unknown", "notes": ""},
    "embed_in_external_site": {"presence": "yes|partial|no|unknown", "notes": ""}
  },
  "extensibility": {
    "rest_api": {"presence": "yes|partial|no|unknown", "notes": ""},
    "webhooks": {"presence": "yes|partial|no|unknown", "notes": ""},
    "zapier_make": {"presence": "yes|partial|no|unknown", "notes": ""},
    "mcp_server": {"presence": "yes|partial|no|unknown", "notes": ""},
    "sso_author_access": {"presence": "yes|partial|no|unknown", "notes": ""}
  }
}
```

---

### Task 1: Scaffold Project Structure `[Haiku]`

**Files:**
- Create: `docs/analysis/feature-checklist-template.json`
- Create: `docs/analysis/features.json` (empty scaffold)

- [ ] **Step 1: Create the feature checklist template file**

Save the full checklist template above as `docs/analysis/feature-checklist-template.json`. This is the canonical template Haiku will copy and fill in for every competitor in Tasks 3–8.

- [ ] **Step 2: Create the features scaffold**

Create `docs/analysis/features.json` with this structure:

```json
{
  "tools": ["tidelearn", "rise", "easygenerator", "elucidat", "sana", "courseau", "mindsmith"],
  "categories": ["blocks", "assessment", "ai", "compliance", "analytics", "collaboration", "templates", "branching", "media", "accessibility", "publishing", "extensibility"],
  "feature_scores": {},
  "strategic_tiers": {},
  "methodology": {}
}
```

- [ ] **Step 3: Commit**

```bash
git add docs/analysis/feature-checklist-template.json docs/analysis/features.json
git commit -m "chore: scaffold comparative feature analysis structure"
```

---

### Task 2: Audit TideLearn — Feature Inventory `[Sonnet]`

**Files:**
- Create: `docs/analysis/tidelearn-features.json`
- Create: `docs/analysis/feature-scores-tidelearn.json`
- Create: `docs/analysis/assets/tidelearn-feature-*.png`

**Prerequisites:** TideLearn dev server running locally at `http://localhost:5173`.

**Important:** This is the baseline that all competitor scores are measured against. Be precise — TideLearn is being scored from first-hand product access, so `"direct"` evidence is expected throughout. Do not score features as present unless they demonstrably work.

- [ ] **Step 1: Start TideLearn dev server**

```bash
cd /Users/theonavarro/TideLearn && npm run dev
```

- [ ] **Step 2: Copy the checklist template**

```bash
cp docs/analysis/feature-checklist-template.json docs/analysis/tidelearn-features.json
```

Set `"tool": "tidelearn"` and `"evidence_source": "[direct]"` and `"accessed_via": "local_dev"`.

- [ ] **Step 3: Audit content blocks**

Navigate to the editor and open an existing course (the "Your Financial Future" course). Open the block picker. For each block type in the checklist: confirm it exists, attempt to add it, confirm it works. Screenshot the block picker with all available blocks visible → `tidelearn-feature-blocks-1.png`.

Fill in the `blocks` section of `tidelearn-features.json`.

- [ ] **Step 4: Audit assessment types**

Navigate to a lesson with quiz blocks. Check which question types exist. Try creating a new quiz block. Screenshot available question types → `tidelearn-feature-assessment-1.png`.

Fill in the `assessment` section.

- [ ] **Step 5: Audit AI features**

Check what AI-powered generation exists in the editor (generate lesson, generate quiz, rewrite block). Screenshot any AI UI visible → `tidelearn-feature-ai-1.png`.

Fill in the `ai` section.

- [ ] **Step 6: Audit compliance, analytics, collaboration, templates, branching**

For each: check the publish modal, settings, and any sharing or analytics views. Screenshot relevant screens.
- Compliance exports → `tidelearn-feature-compliance-1.png`
- Analytics or reporting view → `tidelearn-feature-analytics-1.png`
- Any multi-author or collaboration UI → `tidelearn-feature-collaboration-1.png`
- Template library (if any) → `tidelearn-feature-templates-1.png`
- Any conditional navigation or prerequisite settings → `tidelearn-feature-branching-1.png`

Fill in `compliance`, `analytics`, `collaboration`, `templates`, `branching` sections.

- [ ] **Step 7: Audit media, accessibility, publishing, extensibility**

- Media upload: try uploading a video and an image. Note hosting behaviour → `tidelearn-feature-media-1.png`
- Publish modal: check share link, access controls → `tidelearn-feature-publishing-1.png`
- **Extensibility:** TideLearn's MCP server lives in the codebase, not the UI. Read `src/mcp/` (or equivalent) in the repo directly to determine REST API, webhook, and MCP capabilities rather than navigating the app. Screenshot any relevant MCP tool definitions or API surface → `tidelearn-feature-extensibility-1.png`

Fill in `media`, `accessibility`, `publishing`, `extensibility` sections.

- [ ] **Step 8: Write feature depth scores**

Create `docs/analysis/feature-scores-tidelearn.json`. For each category, for each feature marked `"yes"` or `"partial"`, assign a depth score (0–4) and a 1–2 sentence narrative explaining the score. For features marked `"no"`, depth score is 0, narrative is "Not present."

Format:

```json
{
  "tool": "tidelearn",
  "blocks": {
    "rich_text": {
      "presence": "yes",
      "depth": 3,
      "evidence": "[direct]",
      "narrative": "Rich text editing is solid with bold, italic, headers, bullets, and links. Missing inline code and table support within text blocks.",
      "screenshots": ["tidelearn-feature-blocks-1.png"]
    }
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add docs/analysis/tidelearn-features.json docs/analysis/feature-scores-tidelearn.json docs/analysis/assets/tidelearn-feature-*.png
git commit -m "research: audit TideLearn feature inventory across 12 categories"
```

---

### Task 3: Research Competitor — Articulate Rise `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/rise-features.json` (Haiku Phase A)
- Create: `docs/analysis/feature-scores-rise.json` (Sonnet Phase B)
- Create: `docs/analysis/assets/rise-feature-*.png`

**Access:** Free 30-day trial. Sign up with `theo.ai.agent+rise@gmail.com` / `theo.ai.agent.1`.

**Note:** If this task is running alongside the UI Analysis plan, Phase A can be combined with the UI plan's Phase A competitor visit. Haiku fills in both `rise-observations.json` (UI plan) and `rise-features.json` (this plan) in a single visit.

#### Phase A — `[Haiku]`: Fill feature checklist

- [ ] **Step 1: Copy checklist template**

```bash
cp docs/analysis/feature-checklist-template.json docs/analysis/rise-features.json
```

Set `"tool": "rise"`.

- [ ] **Step 2: Navigate and sign up**

Go to Articulate Rise. Sign up. Screenshot sign-up → `rise-feature-onboarding-1.png`.

- [ ] **Step 3: Audit content blocks**

Create a new course and add a lesson. Open the block inserter. Screenshot available blocks → `rise-feature-blocks-1.png`. Try adding: text, image, video, accordion, tabs, timeline. Note which are present.

- [ ] **Step 4: Audit assessment types**

Add a quiz/knowledge check block. Screenshot all question type options available → `rise-feature-assessment-1.png`.

- [ ] **Step 5: Audit AI, templates, branching**

Look for AI features in the interface (generate button, AI content tools). Check template library. Look for any branching or conditional navigation. Screenshots → `rise-feature-ai-1.png`, `rise-feature-templates-1.png`.

- [ ] **Step 6: Audit publish modal for compliance and publishing features**

Open the publish flow. Screenshot SCORM/xAPI export options → `rise-feature-compliance-1.png`. Note access control options.

- [ ] **Step 7: Fill all sections of `rise-features.json`**

Record `"yes"`, `"partial"`, `"no"`, or `"unknown"` for every field. Add a brief `notes` string for any non-obvious answers. Set `evidence_source` per field if mixed.

#### Phase B — `[Sonnet]`: Depth scoring + extensibility research

- [ ] **Step 8: Research Rise extensibility**

Check Rise's API documentation, webhook support, Zapier integration, and any MCP or LTI capabilities. Use help docs or integrations page. Screenshot → `rise-feature-extensibility-1.png`. Update the `extensibility` section of `rise-features.json`.

- [ ] **Step 9: Write feature depth scores**

Read `rise-features.json` and all screenshots. Create `docs/analysis/feature-scores-rise.json` using the same format as `feature-scores-tidelearn.json`. For every `"yes"` or `"partial"` feature, assign a depth score (0–4) and a narrative. Be calibrated against TideLearn's scores.

- [ ] **Step 10: Commit**

```bash
git add docs/analysis/rise-features.json docs/analysis/feature-scores-rise.json docs/analysis/assets/rise-feature-*.png
git commit -m "research: audit Articulate Rise feature inventory across 12 categories"
```

---

### Task 4: Research Competitor — Easygenerator `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/easygenerator-features.json`
- Create: `docs/analysis/feature-scores-easygenerator.json`
- Create: `docs/analysis/assets/easygenerator-feature-*.png`

**Access:** Free plan. Sign up with `theo.ai.agent+easygenerator@gmail.com` / `theo.ai.agent.1`.

#### Phase A — `[Haiku]`

- [ ] **Step 1:** `cp docs/analysis/feature-checklist-template.json docs/analysis/easygenerator-features.json`
- [ ] **Step 2: Navigate and sign up** → `easygenerator-feature-onboarding-1.png`
- [ ] **Step 3: Audit content blocks** → `easygenerator-feature-blocks-1.png`
- [ ] **Step 4: Audit assessment types** → `easygenerator-feature-assessment-1.png`
- [ ] **Step 5: Audit AI, templates, branching** → `easygenerator-feature-ai-1.png`, `easygenerator-feature-templates-1.png`
- [ ] **Step 6: Audit publish modal** → `easygenerator-feature-compliance-1.png`
- [ ] **Step 7: Fill all sections of `easygenerator-features.json`**

#### Phase B — `[Sonnet]`

- [ ] **Step 8: Research Easygenerator extensibility** → `easygenerator-feature-extensibility-1.png`. Update `extensibility` section.
- [ ] **Step 9: Write `docs/analysis/feature-scores-easygenerator.json`**
- [ ] **Step 10: Commit**

```bash
git add docs/analysis/easygenerator-features.json docs/analysis/feature-scores-easygenerator.json docs/analysis/assets/easygenerator-feature-*.png
git commit -m "research: audit Easygenerator feature inventory across 12 categories"
```

---

### Task 5: Research Competitor — Elucidat `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/elucidat-features.json`
- Create: `docs/analysis/feature-scores-elucidat.json`
- Create: `docs/analysis/assets/elucidat-feature-*.png`

**Access:** Enterprise-only (no free trial). Use public sources: marketing site, YouTube demos, G2/Capterra, help docs. All evidence will be `[marketing]`, `[review]`, or `[docs]`. Mark genuinely unknown fields `"unknown"` rather than guessing.

#### Phase A — `[Haiku]`

- [ ] **Step 1:** `cp docs/analysis/feature-checklist-template.json docs/analysis/elucidat-features.json`
- [ ] **Step 2: Screenshot marketing/landing page** → `elucidat-feature-onboarding-1.png`
- [ ] **Step 3: Search marketing site and pricing page for feature list** — screenshot features/pricing page → `elucidat-feature-blocks-1.png`
- [ ] **Step 4: Search YouTube for "Elucidat tutorial" — screenshot or note evidence from video thumbnails/articles** → `elucidat-feature-assessment-1.png`
- [ ] **Step 5: Search G2/Capterra for Elucidat — note reviewer-mentioned features** → `elucidat-feature-ai-1.png`
- [ ] **Step 6: Check Elucidat help documentation** — screenshot any feature-confirming pages → `elucidat-feature-compliance-1.png`
- [ ] **Step 7: Fill all sections of `elucidat-features.json`** — set evidence source accurately per field

#### Phase B — `[Sonnet]`

- [ ] **Step 8: Research Elucidat extensibility from public sources** → `elucidat-feature-extensibility-1.png`. Update `extensibility` section.
- [ ] **Step 9: Write `docs/analysis/feature-scores-elucidat.json`** — note evidence limitations in narratives where data is indirect
- [ ] **Step 10: Commit**

```bash
git add docs/analysis/elucidat-features.json docs/analysis/feature-scores-elucidat.json docs/analysis/assets/elucidat-feature-*.png
git commit -m "research: audit Elucidat feature inventory (public sources) across 12 categories"
```

---

### Task 6: Research Competitor — Sana `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/sana-features.json`
- Create: `docs/analysis/feature-scores-sana.json`
- Create: `docs/analysis/assets/sana-feature-*.png`

**Access:** Attempt sign-up with `theo.ai.agent+sana@gmail.com`. If enterprise-gated, fall back to public sources and tag evidence accordingly.

#### Phase A — `[Haiku]`

- [ ] **Step 1:** `cp docs/analysis/feature-checklist-template.json docs/analysis/sana-features.json`
- [ ] **Step 2: Navigate and attempt sign-up** → `sana-feature-onboarding-1.png`
- [ ] **Step 3: If direct access — audit blocks, assessment, AI, templates** → `sana-feature-blocks-1.png`, `sana-feature-assessment-1.png`, `sana-feature-ai-1.png`
- [ ] **Step 4: If no direct access — use marketing site, YouTube, G2** — tag evidence source accurately
- [ ] **Step 5: Check compliance and publish flow** → `sana-feature-compliance-1.png`
- [ ] **Step 6: Fill all sections of `sana-features.json`**

#### Phase B — `[Sonnet]`

- [ ] **Step 7: Research Sana extensibility (API docs, integrations page)** → `sana-feature-extensibility-1.png`
- [ ] **Step 8: Write `docs/analysis/feature-scores-sana.json`**
- [ ] **Step 9: Commit**

```bash
git add docs/analysis/sana-features.json docs/analysis/feature-scores-sana.json docs/analysis/assets/sana-feature-*.png
git commit -m "research: audit Sana feature inventory across 12 categories"
```

---

### Task 7: Research Competitor — Courseau `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/courseau-features.json`
- Create: `docs/analysis/feature-scores-courseau.json`
- Create: `docs/analysis/assets/courseau-feature-*.png`

**Access:** Free tier. Sign up with `theo.ai.agent+courseau@gmail.com` / `theo.ai.agent.1`.

#### Phase A — `[Haiku]`

- [ ] **Step 1:** `cp docs/analysis/feature-checklist-template.json docs/analysis/courseau-features.json`
- [ ] **Step 2: Navigate and sign up** → `courseau-feature-onboarding-1.png`
- [ ] **Step 3: Audit blocks** → `courseau-feature-blocks-1.png`
- [ ] **Step 4: Audit assessment types** → `courseau-feature-assessment-1.png`
- [ ] **Step 5: Audit AI features** → `courseau-feature-ai-1.png`
- [ ] **Step 6: Audit templates, branching, compliance** → `courseau-feature-templates-1.png`, `courseau-feature-compliance-1.png`
- [ ] **Step 7: Fill all sections of `courseau-features.json`**

#### Phase B — `[Sonnet]`

- [ ] **Step 8: Research Courseau extensibility** → `courseau-feature-extensibility-1.png`
- [ ] **Step 9: Write `docs/analysis/feature-scores-courseau.json`**
- [ ] **Step 10: Commit**

```bash
git add docs/analysis/courseau-features.json docs/analysis/feature-scores-courseau.json docs/analysis/assets/courseau-feature-*.png
git commit -m "research: audit Courseau feature inventory across 12 categories"
```

---

### Task 8: Research Competitor — Mindsmith `[Haiku → Sonnet]`

**Files:**
- Create: `docs/analysis/mindsmith-features.json`
- Create: `docs/analysis/feature-scores-mindsmith.json`
- Create: `docs/analysis/assets/mindsmith-feature-*.png`

**Access:** Free tier. Sign up with `theo.ai.agent+mindsmith@gmail.com` / `theo.ai.agent.1`.

#### Phase A — `[Haiku]`

- [ ] **Step 1:** `cp docs/analysis/feature-checklist-template.json docs/analysis/mindsmith-features.json`
- [ ] **Step 2: Navigate and sign up** → `mindsmith-feature-onboarding-1.png`
- [ ] **Step 3: Audit blocks** → `mindsmith-feature-blocks-1.png`
- [ ] **Step 4: Audit assessment types** → `mindsmith-feature-assessment-1.png`
- [ ] **Step 5: Audit AI features** — Mindsmith is AI-native, so be thorough here → `mindsmith-feature-ai-1.png`
- [ ] **Step 6: Audit templates, branching, compliance** → `mindsmith-feature-templates-1.png`, `mindsmith-feature-compliance-1.png`
- [ ] **Step 7: Fill all sections of `mindsmith-features.json`**

#### Phase B — `[Sonnet]`

- [ ] **Step 8: Research Mindsmith extensibility** → `mindsmith-feature-extensibility-1.png`
- [ ] **Step 9: Write `docs/analysis/feature-scores-mindsmith.json`**
- [ ] **Step 10: Commit**

```bash
git add docs/analysis/mindsmith-features.json docs/analysis/feature-scores-mindsmith.json docs/analysis/assets/mindsmith-feature-*.png
git commit -m "research: audit Mindsmith feature inventory across 12 categories"
```

---

### Task 9: Build Feature Matrix & Strategic Product Roadmap `[Opus]`

**Files:**
- Modify: `docs/analysis/features.json` (merge all data + add strategic tiers + roadmap)

This is the crown jewel task. The feature matrix is mechanical; the strategic layer is what makes this document valuable.

- [ ] **Step 1: Merge all per-tool feature scores into `features.json`**

Read all 7 `feature-scores-{tool}.json` files. Populate `features.json` under `"feature_scores"` with a nested structure:

```json
{
  "feature_scores": {
    "blocks": {
      "rich_text": {
        "tidelearn": {"presence": "yes", "depth": 3},
        "rise":      {"presence": "yes", "depth": 4},
        "easygenerator": {"presence": "yes", "depth": 2}
      }
    }
  }
}
```

- [ ] **Step 2: Identify TideLearn's position per category**

For each of the 12 categories, compute:
- TideLearn's average depth score
- The field average — **exclude `"unknown"` presence entries from all averages** (Elucidat especially will have many unknowns due to enterprise-only access; including them would drag down field averages with missing data rather than true absences)
- The best-in-class tool and its score (among tools with confirmed direct access where possible)
- The delta between TideLearn and best-in-class

Add as `"category_summary"` in `features.json`.

- [ ] **Step 3: Apply the MCP-first strategic lens**

This is the critical step. TideLearn's strategy (memory: `project_ai_strategy.md`) is:
- **No baked-in AI** — AI lives in the MCP/Skills layer, not inside the product
- **MCP-first extensibility** — TideLearn is designed to be operated by AI agents
- **Targets existing AI users** — users already have Claude; TideLearn is the execution layer

For each feature gap (where TideLearn scores below the field average), classify it as one of:

| Tier | Label | Meaning |
|------|-------|---------|
| 1 | **Table stakes** | Absence would block early users from adopting TideLearn — must build |
| 2 | **Competitive parity** | Should build within 6 months to remain credible |
| 3 | **Differentiator** | TideLearn can build a moat here by going deeper than competitors |
| 4 | **Deliberately excluded** | Conflicts with MCP-first strategy or out of scope — don't build, explain why |

**Key strategic tension to reason through:** Features like "AI course generation" (built-in) may be Tier 4 (deliberately excluded, because this is Claude's job via MCP) even though competitors score highly. The roadmap must make TideLearn's strategic choices explicit, not just list gaps as "to build."

Add tier classifications to `features.json` under `"strategic_tiers"`.

- [ ] **Step 4: Write the prioritised product roadmap**

For each Tier 1 and 2 feature, add:
- Effort estimate: `quick_win` (< 1 day) or `larger_effort` (multi-day)
- Priority order (numbered sequence)
- Which competitor best demonstrates the pattern to emulate

For each Tier 4 (deliberately excluded) feature, add:
- The strategic rationale (1–2 sentences) that can be cited in documentation or investor discussions

Add to `features.json` under `"roadmap"`.

- [ ] **Step 5: Commit**

```bash
git add docs/analysis/features.json
git commit -m "research: complete feature matrix, strategic tiers, and product roadmap"
```

---

### Task 10: Assemble the .docx Report `[Sonnet]`

**Files:**
- Create: `docs/analysis/comparative-feature-analysis.docx`

**Approach:** Use the `docx` skill (`anthropic-skills:docx`) to generate a formatted Word document.

- [ ] **Step 1: Read `features.json`**

Load the complete feature scores, category summaries, strategic tiers, and roadmap.

- [ ] **Step 2: Generate the .docx using the docx skill**

Document structure:

**Part 1 — Executive Summary**
- Title page: "TideLearn Comparative Feature Analysis", date, "Internal Working Document"
- Feature presence matrix: 7 tools as columns, 12 categories as rows. Cell values = average depth score (0–4). Colour-code: 0 = red, 1 = amber, 2 = green, 3 = teal, 4 = blue
- "TideLearn's position" paragraph: overall completeness relative to the field
- Bulleted list: Top 5 table-stakes gaps (Tier 1) to close before sharing with testers
- Bulleted list: Top 3 deliberate non-features with strategic rationale

**Part 2 — Per-Category Deep Dives** (12 sections, one per category)

Each section:
- Heading: category name
- Feature-level presence table for this category: feature | TideLearn | Rise | Easygenerator | Elucidat | Sana | Courseau | Mindsmith. Values: ✓ Full / ◑ Partial / ✗ Missing
- "Best in class" paragraph: which tool leads in this category and what makes it stand out
- "TideLearn today" paragraph: honest assessment with depth score context
- "Strategic recommendation" paragraph: Tier classification and rationale
- Key screenshots where available (captioned with evidence source tag)

**Part 3 — Prioritised Product Roadmap**
- Tier 1 table: Feature | Gap description | Effort | Priority order | Pattern to emulate
- Tier 2 table: same structure
- Tier 3 table: Feature | Why this is a differentiator | Suggested approach
- Tier 4 table: Feature | Strategic rationale for exclusion

**Methodology Section**
- How each tool was accessed
- Evidence source distribution (% direct vs marketing vs docs vs review)
- Limitations (enterprise tools with no trial access, marketing vs real feature depth)
- Relationship to the companion UI Analysis report (if applicable)

- [ ] **Step 3: Verify the .docx opens correctly**

Check the file exists and is well-formed.

- [ ] **Step 4: Commit**

```bash
git add docs/analysis/comparative-feature-analysis.docx
git commit -m "deliverable: comparative feature analysis report (.docx)"
```

---

## Task Dependency Graph

```
Task 1 (scaffold)
  ↓
Task 2 (TideLearn feature audit)
  ↓
Tasks 3-8 (competitor research — can run in parallel)
  ↓
Task 9 (feature matrix + strategic roadmap)
  ↓
Task 10 (assemble .docx)
```

**Parallelisation note:** Tasks 3–8 are fully independent of each other. Each task runs Phase A (Haiku) then Phase B (Sonnet) internally. All six can be dispatched simultaneously as subagents. Each writes to its own `{tool}-features.json` and `feature-scores-{tool}.json` with no conflicts. Task 9 Step 1 merges all per-tool files before analysis begins.

**Combined-plan note:** If running alongside the UI Analysis plan, dispatch Tasks 3–8 as combined subagents — each subagent handles both the UI plan's Phase A/B AND this plan's Phase A/B for its competitor in a single visit. The subagent writes to four files: `{tool}-observations.json`, `scores-{tool}.json`, `{tool}-features.json`, `feature-scores-{tool}.json`.
