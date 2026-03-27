# NotebookLM Integration Spec

> **Status**: Proposal
> **Depends on**: Phase 3A Workflow, NotebookLM MCP (`notebooklm-mcp-cli`)
> **Code changes required**: None (workflow/skill layer only)

---

## 1. Overview

Integrate NotebookLM as an optional enhancement to the Phase 3A course authoring workflow. Two capabilities:

1. **Source-grounded research** — upload author materials to a NotebookLM notebook, query them for citation-backed answers throughout the build
2. **Auto-generated learning assets** — use NotebookLM Studio to produce audio overviews, video explainers, slide decks, and infographics mapped to existing TideLearn block types

A second notebook serves as **persistent session memory**, storing all plans, drafts, and decisions for exact retrieval after context compaction or across session breaks.

### Design principles

- **Optional enhancement** — workflow works without it, upgrades when detected
- **User-owned** — all notebooks live in the user's Google account
- **Skill-layer only** — no changes to TideLearn app code, MCP server, or block types
- **No in-product AI** — consistent with TideLearn's AI strategy

---

## 2. Prerequisites

### MCP server

- **Package**: `notebooklm-mcp-cli` (Python, pip install)
- **Auth**: Cookie-based via `nlm login` (launches browser, user signs in with Google)
- **Tools used**: 35 tools — notebooks, sources, querying, studio, downloads, research, notes, sharing

### No official API

All NotebookLM MCP servers use undocumented internal APIs. This integration could break if Google changes their internal endpoints. The workflow degrades gracefully — without the MCP, everything works as it does today.

---

## 3. Dual Notebook Architecture

| | Source Notebook | Memory Notebook |
|---|---|---|
| **Purpose** | Source materials + research | Session state + build artifacts |
| **Contains** | PDFs, articles, URLs, web research findings | Course brief, objectives, coverage matrix, course plan, lesson drafts, build log, audit notes |
| **Access pattern** | `notebook_query` — AI-grounded Q&A over full source documents | `source_get_content` — exact retrieval of stored notes, no AI mediation |
| **Created** | Step 3 (Content Gathering) | Step 1 (Discovery) — immediately |
| **Updated** | Steps 3–6 as research grows | Every step — running log of all decisions and outputs |
| **Shared with learner** | Yes (Button block link) | No (internal only) |

### Why two notebooks

- **Source notebook** is optimised for AI-grounded Q&A — "what does the research say about X?" returns cited answers from the full original documents
- **Memory notebook** is dumb storage for exact retrieval — "give me the course plan" returns the exact markdown, not a summary
- Clean separation prevents session artifacts from polluting source Q&A results

### Compaction and session resilience

After context compaction or a new session, Claude retains the notebook IDs and can:
- Pull back any plan, draft, or decision verbatim from the Memory notebook
- Query source materials as if they were never lost
- Resume the workflow from exactly where it left off

This replaces the current `source-notes-*.md` and `course-build-*.md` file workarounds entirely.

### Sync discipline

> **Rule: Every mutation to the course must be mirrored to the Memory notebook in the same step.**

- Delete a lesson → delete or archive the corresponding note
- Update a block → update the note content
- Revise the course plan → replace the plan note
- Author gives feedback → store the feedback and resulting decision

The skill instructions enforce this as part of each operation, not as a separate cleanup pass. The user never has to think about it.

---

## 4. User Entry Points

### Entry A: No MCP installed (new user)

**Trigger**: First turn of Phase 3A workflow — skill checks for NotebookLM tools.

**Prompt to user**:

> I can enhance this course build with NotebookLM — grounded research from your source materials, plus auto-generated audio overviews, video explainers, slide decks, and infographics for your learners.
>
> To enable this, install the NotebookLM MCP:
> ```
> pip install notebooklm-mcp-cli
> nlm login
> ```
> Then add it to your Claude Code MCP config.
>
> This is optional — we can proceed without it and the workflow works the same way it always has.

If the user declines: workflow proceeds as today. No degradation.

### Entry B: MCP installed, fresh materials

**Trigger**: MCP detected + user provides source materials.

**Flow**:
1. Offer NotebookLM enhancement
2. If accepted: create both notebooks, upload materials as sources
3. Have user complete `nlm login` auth (if needed) while Claude begins researching — parallelise setup with work

### Entry C: Power user with existing notebook

**Trigger**: User says "I already have a notebook for this" or "use my notebook [name]".

**Flow**:
1. `notebook_list` — find the user's notebook
2. `notebook_get` — understand what sources are in it
3. Create Memory notebook only
4. Proceed from Step 3 with sources already loaded

This is not prompted — it's handled gracefully if the user volunteers it.

---

## 5. Workflow Integration

### Step 1: Discovery

- Create **Memory notebook** named `[Course Name] — Build Log`
- Store course brief as first note

### Step 2: Learning Objectives

- Store objectives, Bloom levels, knowledge types in Memory notebook
- No Source notebook interaction yet

### Step 3: Content Gathering — **Enhanced**

1. Create **Source notebook** named `[Course Name] — Sources`
2. `source_add` — upload all author materials (PDFs, URLs, text, Google Drive files)
3. `notebook_query` on Source — build coverage matrix grounded in actual sources
4. For content gaps (❌ items): `research_start` → `research_import` — find and add web sources automatically
5. `notebook_query` to synthesise gap-filling content from newly added research
6. Store coverage matrix and media inventory in Memory notebook

**Parallelisation opportunity**: If user needs to complete `nlm login`, have them do it while Claude begins identifying content gaps from already-uploaded materials.

### Step 4: Plan and Structure — **Enhanced**

- `notebook_query` on Source to validate lesson sequencing against source material depth
- Run Manning skills (`backwards-design-unit-planner`, `spaced-practice-scheduler`, etc.) as normal
- Store full course plan in Memory notebook

### Step 5: SME Approval

- Store approval confirmation and any feedback in Memory notebook
- **Trigger first batch of Studio asset generations** (see §6 below)

### Step 6: Development — **Enhanced**

Per lesson, after content is approved:
1. Kick off Studio artifact generation for this lesson (audio, video, slides, infographic) with custom prompts
2. Continue writing next lesson — artifacts cook in the background (2–8 min each)
3. When artifacts are ready: `download_artifact` → `upload_media` → map to blocks
4. Store each lesson draft in Memory notebook as it's approved
5. `dual-coding-designer` (Manning skill) continues to plan visual content type — NotebookLM infographic is one option alongside manually sourced images, Chart blocks, Timeline blocks

**Media sourcing enhancement**: NotebookLM-generated infographics, slides, and other visual artifacts reduce the number of gaps identified in the media inventory that require manual sourcing.

### Step 7: Build in TideLearn

- Build course via TideLearn MCP as normal
- Map NotebookLM artifacts to blocks (see §7)
- `notebook_share_public` on Source notebook → get shareable link
- Add **Button block** linking learners to the Source notebook
- Store build log (course ID, block IDs, media URLs) in Memory notebook

### Step 8: Audit

- Audit proceeds as normal
- Store audit findings and modifications in Memory notebook
- **Sync discipline**: any blocks removed or content revised during audit → update/delete corresponding Memory notebook notes

### Step 9: Publish

- Store final approval notes in Memory notebook
- Source notebook link already in course via Button block

---

## 6. Asset Generation Timing

### Trigger point: End of Step 5 (plan approved)

At this point we have everything needed for well-targeted generation prompts:
- Target audience and context (Step 1)
- Learning objectives with Bloom levels (Step 2)
- All source materials in the notebook (Step 3)
- Full course plan with lesson sequence, block skeletons, assessment strategy (Step 4)
- Author sign-off (Step 5)

### Generation prompt template

Studio artifacts are customised with prompts targeting the specific lesson:

> Generate a [artifact type] focused on [lesson learning objectives]. The audience is [audience from course brief]. Emphasise [key concepts from block skeleton]. This is lesson [N] of [total] — assume learners have already covered [prior lesson topics].

### Per-lesson pipeline during Step 6

```
Lesson 1 content approved → kick off Lesson 1 artifacts (audio, video, slides, infographic)
Start writing Lesson 2   → Lesson 1 artifacts generating (2–8 min)
Lesson 2 content approved → kick off Lesson 2 artifacts
Start writing Lesson 3   → download Lesson 1 artifacts (done by now)
...continue...
```

Each artifact takes 2–8 minutes. Lesson content drafting + approval takes longer. By the time the next lesson is done, the previous lesson's artifacts are ready.

### Course-level assets

Some artifacts make sense at the course level rather than per-lesson:
- **Audio deep dive** covering the whole course → placed in an intro or summary lesson
- **Study guide** covering all objectives → Document block in final lesson

These are generated once after Step 5, not per-lesson.

---

## 7. Asset-to-Block Mapping

No new block types required. All 27 existing block types cover every NotebookLM output.

| NotebookLM artifact | TideLearn block | Format | Notes |
|---------------------|-----------------|--------|-------|
| Audio podcast (deep dive / brief / critique / debate) | **Audio** | MP3 | Direct upload via `upload_media` |
| Video explainer / brief | **Video** | MP4 | Direct upload via `upload_media` |
| Slide deck | **Document** | PPTX | Rendered via Office Online viewer |
| Infographic | **Image** | PNG/JPG | Complements `dual-coding-designer` visual planning |
| Study guide / briefing doc / blog post | **Document** | PDF/DOCX | Good for summary/reference lessons |
| Mind map | **Image** | PNG/SVG | Static export; useful for overview lessons |
| Data table | **Text** (HTML table) | HTML | Text block accepts HTML — no Table block needed |
| Quiz | **Assessment questions** | Parsed | Claude reads NotebookLM quiz, creates native MCQ/fill-in-blank/matching questions |
| Flashcards | **Flashcard** block | Parsed | Claude reads NotebookLM flashcards, creates native Flashcard blocks |
| Notebook link | **Button** | URL | `variant: "primary"`, `openInNewTab: true` |

**Note on infographics**: The `dual-coding-designer` Manning skill decides *what type* of visual to use (diagram, photo, data chart, temporal timeline). NotebookLM's infographic is one generation option. The skill may recommend a Chart block or Timeline block instead — NotebookLM infographic doesn't replace this decision, it provides one more option.

**Note on embeddability**: NotebookLM shared notebooks are not embeddable via iframe. The Button block with an external link is the correct approach.

---

## 8. Content Creation Tools Summary

The full content creation toolkit available during course authoring:

| Tool | What it does | When used |
|------|-------------|-----------|
| **NotebookLM Studio** | Generate audio, video, slides, infographics, study guides | Steps 5–7 (after plan approval) |
| **NotebookLM Query** | Grounded Q&A over source materials | Steps 3–6 (research + content drafting) |
| **NotebookLM Research** | Web research with automatic source addition | Step 3 (filling content gaps) |
| **Manning `dual-coding-designer`** | Plan visual content type per block | Step 6 (decides diagram vs chart vs timeline vs image) |
| **Manning instructional design skills** (18 total) | Learning objectives, sequencing, assessment, feedback quality | Steps 2–8 |
| **Mermaid diagrams** | Inline diagram generation (if Chart block extended) | Step 6 (alternative to sourced images) |
| **External tools** (Napkin.ai, Gamma, etc.) | Manual infographic/presentation generation | Step 6 (manual step, not MCP-automated) |
| **Claude direct authoring** | Write HTML content, structure blocks, draft assessments | Steps 6–7 |

---

## 9. Limitations and Risks

### No official API
All NotebookLM MCP servers use undocumented Google internal APIs. A Google change could break the integration at any time. Mitigation: the workflow degrades gracefully to the current non-NotebookLM flow.

### Cookie-based authentication
Sessions expire periodically. Users may need to re-run `nlm login`. The skill should detect auth failures and prompt the user to re-authenticate.

### Source limits
~50 sources and ~500K words per notebook. For large courses with extensive source materials, this may require curation of which materials are most relevant.

### Generation time
Studio artifacts take 2–8 minutes each. The per-lesson pipeline (§6) mitigates this by parallelising generation with content writing.

### Browser dependency
`nlm login` requires launching a real browser. Headless/server-side deployment is not viable — this is a local-machine integration only.

---

## 10. Implementation Plan

All changes are in the skill/workflow layer. No TideLearn app or MCP server code changes.

### Phase 1: Documentation
1. Write this spec (this document)
2. Write setup guide: `docs/phase-3/notebooklm-setup.md`
3. Update `CLAUDE.md` with NotebookLM integration notes

### Phase 2: Workflow updates
1. Update `phase-3-workflow.md` with conditional NotebookLM steps at each stage
2. Add MCP detection logic to workflow entry
3. Add dual notebook creation/management instructions
4. Add asset generation timing and pipeline instructions
5. Add sync discipline rules for Memory notebook

### Phase 3: Testing
1. Test full flow with a real course on a machine with the MCP installed
2. Test graceful degradation without the MCP
3. Test compaction recovery via Memory notebook retrieval
4. Test power user entry point (existing notebook)
