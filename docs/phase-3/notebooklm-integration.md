# NotebookLM Integration Spec

## Overview

NotebookLM (via `notebooklm-mcp-cli`) becomes an optional but powerful enhancement to the Phase 3A workflow. It provides:

1. **Source notebook** — grounded Q&A over uploaded course materials
2. **Memory notebook** — persistent session state that survives context compaction
3. **Studio artifacts** — AI-generated audio, video, slides, infographics scoped to specific sources

This is skill-layer only. No changes to the TideLearn app or MCP server are required (with the exception of the M4A audio format gap noted below).

---

## Architecture Decisions

### User's own Google account
Cookie-based auth (no official API) rules out a shared server-side account. Aligns with TideLearn's philosophy: connect the user's existing tools, don't replace them.

### Not bundled into TideLearn MCP
- Language mismatch: TideLearn MCP is TypeScript/Node; the best NotebookLM MCP (`notebooklm-mcp-cli` by jacob-bd) is Python
- Maintenance burden: the unofficial API breaks periodically; the open-source community fixes it fast — we shouldn't own that
- A setup script gives the same one-step install UX without forking the codebase

### notebooklm-mcp-cli (jacob-bd) is the right package
- 35 tools including Studio generation (audio, video, slides, infographics, reports, quizzes, flashcards, mind maps, data tables)
- `studio_create` supports `source_ids` to scope generation to specific sources — critical for lesson-level targeting
- Active maintenance, ~3000+ stars
- The TypeScript alternative has 5-16 tools with no Studio — not viable

### Claude as orchestrator
MCPs cannot call each other. Claude coordinates between NotebookLM MCP and TideLearn MCP. The skill instructions define when and how to use each tool. No middleware layer is needed.

---

## Dual Notebook Architecture

| | Source Notebook | Memory Notebook |
|---|---|---|
| **Purpose** | Materials + research | Session state + build artifacts |
| **Contains** | PDFs, URLs, articles, web research | Course brief, objectives, plan, lesson drafts, build log |
| **Primary use** | `notebook_query` — grounded Q&A | `note_get` (or equivalent) — exact content retrieval |
| **Storage type** | Sources | Notes (not sources — notes have full CRUD) |
| **Shared with learners** | Yes (after cleanup — see below) | No |
| **Created** | Step 3 (when user accepts NotebookLM) | Step 3 (same moment — see timing note below) |

**Why notes for Memory notebook, not sources:**
Sources have `source_add` and `source_delete` but no update operation. Notes have full CRUD. Since we're constantly revising the course plan, lesson drafts, and build log throughout the workflow, notes are the correct storage primitive. Both sources and notes return exact content — no AI processing on retrieval.

**Memory notebook creation timing:**
Both notebooks are created at the moment the user accepts NotebookLM enhancement (Step 3 for Entry B users; immediately for Entry C users). At that point, Claude retroactively adds the course brief and learning objectives (already captured in local files) as the first notes in the Memory notebook, then continues from Step 3 onwards.

**Note tool names:**
The exact tool names for the Notes API (`note_create`, `note_update`, `note_delete`, `note_get`, etc.) should be confirmed against the actual `notebooklm-mcp-cli` tool list during Phase 3 validation. The spec uses intuitive names — verify before implementation.

**Why upload_all_sources_upfront:**
`studio_create` accepts a `source_ids` parameter to scope generation to specific sources. This eliminates any need to stagger uploads — all materials can be uploaded in Step 3, and each generation call is scoped to the appropriate subset.

---

## User Entry Points

### Entry A — No NotebookLM MCP installed
First turn: Claude detects NotebookLM tools are unavailable.

```
I can significantly enhance this course with NotebookLM — grounded research
from your source materials, plus auto-generated audio overviews, video
explainers, slide decks, and infographics for your learners.

To enable this, run the setup script:
  ./scripts/setup-notebooklm.sh

This installs notebooklm-mcp-cli, wires it into your Claude Code MCP
config, and walks you through Google authentication. It takes about 2 minutes.

We can proceed without it — or you can run the script and restart Claude Code.
```

**After install and restart (Entry A → B):** On the next session, Claude will detect NotebookLM tools as available. The workflow picks up normally from wherever it left off. If a course brief was already captured, Claude offers to create the notebooks and retroactively adds prior artifacts as notes.

### Entry B — NotebookLM MCP installed, fresh course
As soon as the user provides materials, offer:

```
I can create a NotebookLM notebook for this course and upload your materials
as sources. This gives you grounded content generation and auto-generated
learning assets (audio, video, slides, infographic) for each lesson.

Ready to create the notebook — shall we proceed?
```

**Auth timing:** If auth is needed (`nlm login`), prompt the user to authenticate while Claude begins its own analysis (reading materials, building coverage matrix) — the NotebookLM upload waits for auth, but Claude's analysis doesn't.

### Entry C — Power user with existing notebook
If the user provides a notebook name or ID:
```
notebook_list → confirm it exists → notebook_get → proceed from Step 3
```
No upload prompt. Sources already present.

---

## Workflow Integration (Phase 3A Steps)

### Step 1: Discovery
- Local file `docs/phase-3/source-notes-<slug>.md` created as normal
- If Entry C (existing notebook): create Memory notebook now and add course brief note immediately
- Otherwise: NotebookLM notebooks created at Step 3 when user provides materials and accepts

### Step 2: Learning Objectives
- Local file updated as normal
- NotebookLM not yet active (unless Entry C)

### Step 3: Content Gathering
- **Entry B:** User provides materials → offer NotebookLM enhancement → on acceptance, create both notebooks, retroactively add brief + objectives as notes in Memory notebook
- Create Source notebook: `notebook_create("[Course Title] Sources")`
- `source_add` all uploaded materials (accepts local file paths: `source_type="file", file_path="/path/to/doc.pdf"`)
- `source_add` any URLs
- `notebook_query` to build coverage matrix
- For gaps: `research_start` → `research_import` → `source_add` new sources
- `note_create(title="Coverage Matrix", content=<matrix>)` in Memory notebook
- `note_create(title="Media Inventory", content=<inventory>)` in Memory notebook

### Step 4: Plan and Structure
- `notebook_query` to validate lesson depth and sequencing against sources
- `note_create(title="Course Plan", content=<full plan with block skeletons>)` in Memory notebook
- Local file updated

### Step 5: SME Approval (unchanged)
- `note_update(title="Course Plan", content=<approved plan + feedback>)` after approval
- **Asset generation kicks off here** — see Studio Generation section

### Step 6: Content Development
- Per lesson: draft → author approves → `note_create(title="Lesson [N] Draft", content=<draft>)` → build
- If a lesson is revised: `note_update` the note immediately
- **Check studio status** periodically: `studio_status`
- As artifacts complete: `download_artifact` → `upload_media` → map to blocks

### Step 7: Build in TideLearn
- `note_update(title="Build Log")` with each block/lesson ID as built
- When Source notebook is ready to share: clean it up (remove internal research notes, rough drafts) → `notebook_share_public` → add Button block with notebook URL
- Remind user: if they later delete this course, they may also want to delete both notebooks from NotebookLM

### Step 8: Audit (unchanged)
- `note_update(title="Audit Notes")` with findings + modifications

### Step 9: Publish (unchanged)

---

## Studio Generation

### When to trigger
**At the end of Step 5 (plan approved).** By this point we have:
- All source materials in the notebook
- Full course plan with lesson sequence, block skeletons, audience profile
- Learning objectives with Bloom levels

This is early enough to generate in parallel with Step 6 content writing, and late enough to write precise focus prompts.

### Generation prompts
Use `focus_prompt` to target each lesson's objectives and audience:

```
Audio deep-dive for Lesson 3: "Focus on [lesson 3 objectives].
Target audience: [audience from Step 1]. This is lesson 3 of 7 —
assume learners have already covered [lesson 1-2 topics].
Emphasise [key concepts from block skeleton]."
```

### Scoping with source_ids
```
studio_create(
  notebook_id=source_notebook_id,
  artifact_type="audio",
  audio_format="deep_dive",
  focus_prompt="...",
  source_ids=[lesson_1_source_id, lesson_2_source_id, lesson_3_source_id]
)
```

### Available artifact types and formats
| Artifact | type | Key options |
|---|---|---|
| Podcast | `audio` | `audio_format`: deep_dive / brief / critique / debate; `audio_length`: short / default / long |
| Video | `video` | `video_format` + `visual_style` (11 styles: whiteboard, classic, anime, etc.) |
| Infographic | `infographic` | `orientation`, `detail_level`, `infographic_style` (11 styles) |
| Slide deck | `slide_deck` | `slide_format`: detailed_deck / presenter_slides |
| Study guide | `report` | `report_format`: briefing_doc / study_guide / blog_post |
| Quiz | `quiz` | — |
| Flashcards | `flashcards` | — |
| Mind map | `mind_map` | — |
| Data table | `data_table` | — |

Revision: `studio_revise` works for slide decks only (per-slide instructions).

### Per-lesson pipelining
Generation takes 2-8 min per artifact. Kick off all lesson generations at Step 5, then check `studio_status` between lessons during Step 6. By the time content writing is done, most artifacts will be ready.

---

## Asset → Block Mapping

All outputs map to existing block types. **Zero new block types required.**

| NotebookLM artifact | File format | TideLearn block | Notes |
|---|---|---|---|
| Audio overview | M4A | Audio | ⚠️ M4A format gap — see below |
| Video explainer | MP4 | Video | Works as-is |
| Slide deck | PPTX | Document | Request PPTX format in studio_create |
| Infographic | PNG | Image | Works as-is |
| Study guide | Markdown | Text (HTML) | Render MD as HTML in Text block |
| Data table | Various | Embed | Host as page, embed via Embed block |
| Mind map | PNG/SVG | Image | Works as-is |
| Quiz | JSON/MD | Assessment questions | Claude parses and creates via add_question |
| Flashcards | JSON/MD | Flashcard block | Claude parses and creates |
| Notebook link | URL | Button | NotebookLM notebooks are not embeddable in iframes — Button block only |

### M4A audio format gap
NotebookLM exports audio as `.m4a`. TideLearn's Audio block currently accepts `audio/mpeg` and `audio/wav` only.

**Required code change (minor):** Add `audio/m4a` and `audio/x-m4a` to `AudioForm`'s accepted MIME types, and add `.m4a` to the extension whitelist in `upload_media`.

This is the only required change to the TideLearn codebase for this integration.

---

## Source Notebook: Learner Cleanup

Before sharing the Source notebook with learners (`notebook_share_public`), remove anything internal:

**Remove:** rough draft notes, gap analysis notes, internal planning content added during research
**Keep:** source materials (PDFs, articles, URLs), web research findings

The skill should explicitly prompt the author to review the notebook before sharing, and offer to remove internal notes.

---

## Content Creation Tools (Step 6)

| Tool | What it contributes |
|---|---|
| NotebookLM Studio | Audio, video, slides, infographics, study guides — all grounded in sources |
| Manning MCP skills (`dual-coding-designer`, etc.) | Decide *what* visual type is needed per concept |
| Google Image Search skill ([agentskills.so](https://agentskills.so/skills/glebis-claude-skills-google-image-search)) | Find images for Image blocks where studio doesn't generate |
| Mermaid diagrams | Process flows, timelines — Claude generates as code, rendered as Image block |
| External: Napkin.ai / Gamma | Manual visual creation for complex diagrams (out-of-skill step) |

---

## Persistence: Dual-path Strategy

The workflow saves artifacts in two places at all times:

| | Active | NotebookLM not active |
|---|---|---|
| Memory notebook notes | ✓ | — |
| Local markdown files (`source-notes-*.md`, `course-build-*.md`) | ✓ | ✓ |

Both are always written when NotebookLM is active. Local files remain the primary persistence path when it isn't. This belt-and-suspenders approach ensures no work is lost regardless of context compaction or session breaks.

**After compaction with NotebookLM active:**
- Local files recoverable via `read_file`
- Memory notebook notes recoverable via `note_read` (exact content, no AI processing)
- Source notebook still available for grounded queries

---

## Memory Sync Discipline

Every mutation to the course must be mirrored to the Memory notebook in the same step. The skill enforces this — it's not a separate cleanup pass.

| Action | Memory notebook update |
|---|---|
| Course plan approved | `note_update("Course Plan", <approved plan>)` |
| Lesson draft approved | `note_create("Lesson [N] Draft", <draft>)` |
| Lesson revised | `note_update("Lesson [N] Draft", <revised>)` |
| Lesson deleted | `note_delete("Lesson [N] Draft")` |
| Block revised | Update lesson draft note |
| Build log | `note_update("Build Log", <add entry>)` |

---

## File Transfer Pipeline

Source material upload:
```
Local file → source_add(file_path="/path/to/doc.pdf") → NotebookLM source
```

Generated artifact download and upload:
```
studio_create → studio_status (poll) → download_artifact(output_path="/tmp/audio.m4a")
→ upload_media(file_path="/tmp/audio.m4a", course_id="...") → public URL
→ add_block(type="audio", src=<url>) → Audio block in course
```

Both pipelines are file-path based. No base64 encoding or format conversion required.

---

## Hosted Deployment (Future Consideration)

This spec is designed for **localhost via Claude Code**. The hosted future (Fly.io MCP + web chat) will require architectural changes:

| Concern | Localhost | Hosted |
|---|---|---|
| Auth | `nlm login` browser flow | No mechanism — Google hasn't shipped official API |
| Filesystem | Shared between MCPs | Not shared — need S3/blob intermediary for artifact handoff |
| Setup | User runs script | Not applicable — server-side config |

**Implication:** The hosted deployment may not be able to support NotebookLM integration until Google ships an official API. This is acceptable — the integration is an optional enhancement, not a core feature. It will work for Claude Code users from day one and become available to hosted users if/when the API exists.

Do not make architectural decisions now that over-engineer for hosted. Build for Claude Code today.

---

## Setup Script

`scripts/setup-notebooklm.sh` (to be written during implementation):

1. Check Python ≥ 3.9 installed
2. `pip install notebooklm-mcp-cli`
3. Add MCP entry to `~/.claude/claude_desktop_config.json` (or `.mcp.json`)
4. Prompt: "Restart Claude Code, then run `nlm login` to authenticate with your Google account"
5. Print verification command

One command. User runs it once, all future courses benefit automatically.

---

## Notebook Lifecycle

| Event | Action |
|---|---|
| Course created | Create Source notebook + Memory notebook |
| Course published | Clean Source notebook → share publicly → Button block |
| Course deleted from TideLearn | Remind user: both notebooks remain in their Google account and can be deleted from NotebookLM if no longer needed |
| Power user: existing notebook | `notebook_list` → user selects → proceed from Step 3, skip upload |

---

## Implementation Plan

### Phase 1 (enabling)
1. Write `scripts/setup-notebooklm.sh`
2. Fix M4A audio format in `AudioForm` and `upload_media`
3. Document MCP config for `notebooklm-mcp-cli` in setup guide

### Phase 2 (workflow)
4. Update `docs/phase-3/phase-3-workflow.md` — conditional NotebookLM steps, detection logic, dual persistence
5. Add NotebookLM-aware generation calls with `focus_prompt` and `source_ids` guidance

### Phase 3 (validation)
6. Test with a real course on MacBook (MCP already installed)
7. Verify file transfer pipeline end-to-end (upload → generate → download → upload_media → block)
8. Confirm M4A format fix works
