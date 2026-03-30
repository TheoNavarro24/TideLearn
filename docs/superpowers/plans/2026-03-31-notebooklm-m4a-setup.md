# NotebookLM Integration — Phase 1 + 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable NotebookLM integration by fixing audio M4A support across the stack, patching a pre-existing OGG gap in the MCP, providing a one-command setup script for `notebooklm-mcp-cli`, a user-facing setup guide, and updating the workflow doc with conditional NotebookLM steps.

**Architecture:** Three layers need updating for M4A: the MCP MIME map (`mcp/src/lib/mime.ts`), the frontend upload allowlist (`src/lib/upload.ts`), and the AudioForm file picker accept string. The MCP MIME map uses the formally registered IANA type `audio/mp4` for `.m4a` files; the frontend allowlist accepts both `audio/m4a` and `audio/x-m4a` since that is what browsers and macOS actually report. The setup script and docs have no code dependencies.

**Tech Stack:** TypeScript (strict, MCP), TypeScript (frontend, non-strict), Vitest (both test suites), React Testing Library (frontend), Bash (setup script).

---

## Scope Note

Phase 1 = code changes (Tasks 1–3) + setup script (Task 4) + setup guide doc (Task 5).
Phase 2 = workflow doc updates (Task 6).
TDD applies to Tasks 1–3. Tasks 4–6 are shell/documentation — TDD exception applies.

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `mcp/src/lib/mime.ts` | Modify | Add `.m4a` → `audio/mp4` and `.ogg` → `audio/ogg` (pre-existing gap) |
| `mcp/src/lib/__tests__/mime.test.ts` | Modify | TDD tests for new extensions |
| `src/lib/upload.ts` | Modify | Export `ALLOWED_TYPES`; add `audio/m4a`, `audio/x-m4a` to audio list |
| `src/__tests__/lib/upload.test.ts` | Create | TDD tests for `ALLOWED_TYPES` |
| `src/components/blocks/editor/AudioForm.tsx` | Modify | Add `audio/m4a,audio/x-m4a` to `accept` attribute |
| `src/__tests__/components/AudioForm.test.tsx` | Create | TDD test for accept attribute |
| `scripts/setup-notebooklm.sh` | Create | One-command NotebookLM MCP setup |
| `docs/notebooklm-setup.md` | Create | User-facing setup guide |
| `CLAUDE.md` | Modify | Update audio format list |
| `docs/phase-3/phase-3-workflow.md` | Modify | Add conditional NotebookLM steps per spec |

---

## Task 1: MCP MIME map — M4A and OGG support

**Files:**
- Modify: `mcp/src/lib/__tests__/mime.test.ts`
- Modify: `mcp/src/lib/mime.ts`

**Note on MIME type choice:** `.m4a` is an MPEG-4 audio container. The formally registered IANA MIME type is `audio/mp4`. `audio/m4a` is not a registered type. The MCP MIME map is used server-side to derive the MIME type for Supabase uploads — always use the registered type here. The frontend allowlist (Task 2) accepts the additional informal types that browsers and macOS actually report.

- [ ] **Step 1: Write failing tests**

Add to `mcp/src/lib/__tests__/mime.test.ts` inside the `describe("getMimeType", ...)` block:

```typescript
it("returns audio/mp4 for .m4a", () => {
  expect(getMimeType("/path/to/file.m4a")).toBe("audio/mp4");
});
it("returns audio/mp4 for .M4A (case-insensitive)", () => {
  expect(getMimeType("/path/to/file.M4A")).toBe("audio/mp4");
});
it("returns audio/ogg for .ogg", () => {
  expect(getMimeType("/path/to/file.ogg")).toBe("audio/ogg");
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd mcp && npm test src/lib/__tests__/mime.test.ts
```

Expected: 3 failures — `expected null to be "audio/mp4"` and `expected null to be "audio/ogg"`.

- [ ] **Step 3: Add entries to MIME_MAP**

In `mcp/src/lib/mime.ts`, add after the `.wav` line (currently line 15):

```typescript
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
cd mcp && npm test src/lib/__tests__/mime.test.ts
```

Expected: all tests pass, including the 3 new ones.

- [ ] **Step 5: Run full MCP test suite for regressions**

```bash
cd mcp && npm test
```

Expected: all tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/lib/mime.ts mcp/src/lib/__tests__/mime.test.ts
git commit -m "fix: add m4a (audio/mp4) and ogg to MCP MIME map"
```

---

## Task 2: Frontend upload allowlist — M4A support

**Files:**
- Create: `src/__tests__/lib/upload.test.ts`
- Modify: `src/lib/upload.ts`

**Note:** `upload.ts` already contains `audio/ogg` and `audio/mp3` — do not remove them. The audio array currently is:
`["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"]`
Add `audio/m4a` and `audio/x-m4a` to this list. The frontend allowlist uses the informal types (`audio/m4a`, `audio/x-m4a`) because these are what macOS and browsers report when a user picks an M4A file — `audio/mp4` is rarely reported by browsers for M4A files.

- [ ] **Step 1: Write failing test**

Create `src/__tests__/lib/upload.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ALLOWED_TYPES } from "@/lib/upload";

describe("ALLOWED_TYPES", () => {
  it("includes audio/m4a in audio category", () => {
    expect(ALLOWED_TYPES.audio).toContain("audio/m4a");
  });
  it("includes audio/x-m4a in audio category", () => {
    expect(ALLOWED_TYPES.audio).toContain("audio/x-m4a");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test src/__tests__/lib/upload.test.ts
```

Expected: compile error — `ALLOWED_TYPES` is not exported from `@/lib/upload`.

- [ ] **Step 3: Export ALLOWED_TYPES and add M4A entries**

In `src/lib/upload.ts`, make two changes:

Change line 3 from:
```typescript
const ALLOWED_TYPES: Record<string, string[]> = {
```
to:
```typescript
export const ALLOWED_TYPES: Record<string, string[]> = {
```

Change the `audio` line (line 6) from:
```typescript
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"],
```
to:
```typescript
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/m4a", "audio/x-m4a"],
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test src/__tests__/lib/upload.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Run full frontend test suite**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/upload.ts src/__tests__/lib/upload.test.ts
git commit -m "fix: export ALLOWED_TYPES and add audio/m4a support to frontend upload"
```

---

## Task 3: AudioForm file picker — M4A accept attribute

**Files:**
- Create: `src/__tests__/components/AudioForm.test.tsx`
- Modify: `src/components/blocks/editor/AudioForm.tsx`

**Mock pattern:** `AudioForm` calls `useAuth()` (returns `{ user, session, loading, signOut }`) and reads `window.location.search`. Only `user` is destructured in the component — a partial mock is fine since the frontend is non-strict TypeScript. Look at `src/__tests__/components/QuizView.test.tsx` for a more representative component test to understand the overall pattern before writing.

- [ ] **Step 1: Write failing test**

Create `src/__tests__/components/AudioForm.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AudioForm } from "@/components/blocks/editor/AudioForm";
import type { AudioBlock } from "@/types/course";
import "react/jsx-runtime";

Object.defineProperty(window, "location", {
  value: { search: "?courseId=test" },
  writable: true,
});

vi.mock("@/components/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, session: null, loading: false, signOut: vi.fn() }),
}));

const BASE_AUDIO: AudioBlock = {
  id: "a1",
  type: "audio",
  src: "",
};

describe("AudioForm", () => {
  it("file input accept attribute includes audio/m4a", () => {
    render(<AudioForm block={BASE_AUDIO} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toContain("audio/m4a");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test src/__tests__/components/AudioForm.test.tsx
```

Expected: test fails — `audio/m4a` not found in the accept string (currently `audio/mpeg,audio/wav,audio/ogg`).

- [ ] **Step 3: Update AudioForm accept attribute**

In `src/components/blocks/editor/AudioForm.tsx`, the file input spans two lines (36–37):

```tsx
<input ref={inputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
```

Replace the `accept` value only — keep the rest of the element intact:

```tsx
<input ref={inputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/x-m4a" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test src/__tests__/components/AudioForm.test.tsx
```

Expected: test passes.

- [ ] **Step 5: Run full frontend test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/editor/AudioForm.tsx src/__tests__/components/AudioForm.test.tsx
git commit -m "fix: add m4a support to AudioForm file picker accept attribute"
```

---

## Task 4: Setup script

**Files:**
- Create: `scripts/setup-notebooklm.sh`

TDD exception: shell script / configuration file.

**Note on config file selection:** This project has a `.mcp.json` at the repo root — that is the correct Claude Code MCP config for this project. The script prefers `.mcp.json` when present, and falls back to `~/.claude/claude_desktop_config.json` otherwise.

**Note on Python path handling:** Config file paths are passed to the Python subprocess via an environment variable (`NLM_CONFIG_PATH`) to avoid shell interpolation issues with paths that might contain spaces or special characters.

- [ ] **Step 1: Create the script**

Create `scripts/setup-notebooklm.sh`:

```bash
#!/usr/bin/env bash
set -e

echo ""
echo "=== NotebookLM MCP Setup ==="
echo ""

# 1. Check Python 3.9+
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 is required but not found."
  echo "    Install from https://www.python.org/downloads/ then re-run this script."
  exit 1
fi

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)"; then
  PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
  echo "❌  Python 3.9+ is required. Found: $PYTHON_VERSION"
  exit 1
fi
echo "✅  Python $(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')") found."

# 2. Install notebooklm-mcp-cli
echo ""
echo "Installing notebooklm-mcp-cli..."
pip3 install --quiet --upgrade notebooklm-mcp-cli
echo "✅  notebooklm-mcp-cli installed."

# 3. Add to Claude Code MCP config
# Prefer the project-local .mcp.json (standard for Claude Code projects).
# Falls back to the global Claude Desktop config.
if [ -f ".mcp.json" ]; then
  TARGET_CONFIG=".mcp.json"
else
  TARGET_CONFIG="$HOME/.claude/claude_desktop_config.json"
fi

if [ ! -f "$TARGET_CONFIG" ]; then
  echo '{"mcpServers":{}}' > "$TARGET_CONFIG"
fi

# Check if already configured — pass path safely via env var
if NLM_CONFIG_PATH="$TARGET_CONFIG" python3 -c "
import json, os, sys
with open(os.environ['NLM_CONFIG_PATH']) as f:
    d = json.load(f)
sys.exit(0 if 'notebooklm' in d.get('mcpServers', {}) else 1)
" 2>/dev/null; then
  echo "✅  notebooklm already present in $TARGET_CONFIG — skipping."
else
  # Add it — pass path safely via env var
  NLM_CONFIG_PATH="$TARGET_CONFIG" python3 -c "
import json, os
config_path = os.environ['NLM_CONFIG_PATH']
with open(config_path) as f:
    config = json.load(f)
config.setdefault('mcpServers', {})['notebooklm'] = {
    'command': 'nlm',
    'args': ['serve']
}
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
"
  echo "✅  Added notebooklm to $TARGET_CONFIG"
fi

# 4. Authenticate
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next: authenticate with Google"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run:  nlm login"
echo ""
echo "This opens a browser to sign in with your Google account."
echo "Once authenticated, restart Claude Code. NotebookLM will be"
echo "available automatically when you start your next course build."
echo ""
echo "For full setup details see: docs/notebooklm-setup.md"
echo ""
```

- [ ] **Step 2: Make executable and verify syntax**

```bash
chmod +x scripts/setup-notebooklm.sh
bash -n scripts/setup-notebooklm.sh
```

Expected: no output (no syntax errors).

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-notebooklm.sh
git commit -m "feat: add NotebookLM MCP setup script"
```

---

## Task 5: Setup guide doc

**Files:**
- Create: `docs/notebooklm-setup.md`

TDD exception: documentation.

This is the "Document MCP config for `notebooklm-mcp-cli`" deliverable from Phase 1 of the spec.

- [ ] **Step 1: Create the setup guide**

Create `docs/notebooklm-setup.md`:

```markdown
# NotebookLM MCP Setup Guide

NotebookLM integration is an optional enhancement to the TideLearn course build workflow. When active, it provides:

- **Grounded research** — course content is generated from your uploaded source materials
- **Auto-generated assets** — audio podcast overviews, video explainers, slide decks, and infographics per lesson
- **Persistent memory** — a Memory notebook that survives Claude context resets, storing your course plan, lesson drafts, and build log
- **Learner resource** — a shared Source notebook linked from the course via a Button block

## Requirements

- macOS or Linux (Windows support untested)
- Python 3.9 or later
- A Google account with NotebookLM access (free at notebooklm.google.com)
- Claude Code desktop app

## One-Command Setup

From the TideLearn project root:

```bash
./scripts/setup-notebooklm.sh
```

This script will:
1. Check Python version
2. Install `notebooklm-mcp-cli` via pip
3. Add the `notebooklm` server to `.mcp.json` (project-local MCP config)
4. Print instructions for Google authentication

After the script completes, run `nlm login` to authenticate, then restart Claude Code.

## Manual Setup (if you prefer)

### 1. Install

```bash
pip3 install notebooklm-mcp-cli
```

### 2. Add to MCP config

In `.mcp.json` at the project root, add to `mcpServers`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "nlm",
      "args": ["serve"]
    }
  }
}
```

### 3. Authenticate

```bash
nlm login
```

A browser window opens to sign in with Google. Once complete, restart Claude Code.

## Verifying the Setup

After restarting Claude Code, start a new conversation and say:
> "List my NotebookLM notebooks"

Claude should respond with your notebook list (or "no notebooks yet" if your account is new). If it cannot access NotebookLM tools, check that `.mcp.json` is saved and Claude Code was restarted.

## How It Works in the Workflow

When Claude Code detects NotebookLM tools on the first turn of a course build, it will offer the NotebookLM enhancement. If you accept:

1. A **Memory notebook** is created immediately to store your course plan and session state
2. A **Source notebook** is created at Step 3 when you upload your materials
3. Studio artifacts (audio, video, slides, infographics) are generated automatically at Step 5
4. All artifacts are downloaded and uploaded to TideLearn as blocks
5. The Source notebook is shared with learners via a Button block at the end

See `docs/phase-3/notebooklm-integration.md` for the full technical spec.

## Notebook Tool Names

The Notes API tool names used in the workflow (`note_create`, `note_update`, `note_get`, `note_delete`) are illustrative. Verify the exact names against the installed version:

```bash
nlm --help
```

Or check the tool list that appears in Claude Code when the MCP is active.

## Important Limitations

- Uses unofficial NotebookLM API (no official Google API exists yet) — may break when Google changes internals
- Auth is session-cookie based — requires a real browser login, cannot be automated headlessly
- ~50 sources / ~500K words per notebook
- Studio generation takes 2–8 minutes per artifact
- This integration works with Claude Code only. A hosted version (web chat via Fly.io MCP) is not yet supported.
```

- [ ] **Step 2: Commit**

```bash
git add docs/notebooklm-setup.md
git commit -m "docs: add NotebookLM MCP setup guide"
```

---

## Task 6: CLAUDE.md + Workflow doc updates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/phase-3/phase-3-workflow.md`

TDD exception: documentation.

**Read `docs/phase-3/phase-3-workflow.md` in full before editing.** The workflow is long — understand the existing structure before inserting NotebookLM sections.

- [ ] **Step 1: Update CLAUDE.md audio format line**

Find:
```
- Audio accepts `audio/mpeg` and `audio/wav` — not `audio/mp3`
```

Replace with:
```
- Audio accepts `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/m4a`, `audio/x-m4a` — not `audio/mp3` (use `audio/mpeg`)
```

- [ ] **Step 2: Add NotebookLM detection block to workflow (before Step 1)**

```markdown
## Before Starting: NotebookLM Check (if MCP installed)

If `notebooklm-mcp-cli` tools are available in this Claude Code session:

**First turn — offer the enhancement:**
> "I can use NotebookLM to make this course build much more powerful — grounded research from your source materials, auto-generated audio overviews, video explainers, slide decks, and infographics for each lesson, plus a persistent Memory notebook that survives context resets.
> Shall I set this up now? (I'll create the Memory notebook immediately, and the Sources notebook once you share your materials.)"

**If user accepts:**
- `notebook_create("Course Memory: [title]")` — create Memory notebook now, before Step 1
- Proceed through all steps writing to Memory notebook notes alongside local files (dual persistence)
- Source notebook created at Step 3 when materials are uploaded

**If not installed or user declines:** proceed with local files only — no degradation.

**If auth is needed:** `nlm login` — prompt user to authenticate while Claude begins Step 1 analysis. The Memory notebook creation waits for auth; analysis does not.
```

- [ ] **Step 3: Add NotebookLM annotations to Steps 1–8**

Add these after each step's existing instructions (do not replace existing content):

**Step 1:**
```markdown
*NotebookLM (if active):* `note_create(title="Course Brief", content=<brief>)` in Memory notebook.
```

**Step 2:**
```markdown
*NotebookLM (if active):* `note_create(title="Learning Objectives", content=<objectives + Bloom levels + knowledge types>)` in Memory notebook.
```

**Step 3 — after coverage matrix:**
```markdown
*NotebookLM (if active):*
- `notebook_create("[Course Title] Sources")` — create Source notebook
- `source_add` all uploaded materials (`source_type="file", file_path=<path>`) and URLs
- `notebook_query` to validate coverage matrix against sources
- For gaps: `research_start` → `research_import` → `source_add` new sources
- `note_create(title="Coverage Matrix", content=<matrix>)` in Memory notebook
- `note_create(title="Media Inventory", content=<inventory>)` in Memory notebook
```

**Step 4:**
```markdown
*NotebookLM (if active):*
- `notebook_query` Source notebook to validate lesson depth and sequencing
- `note_create(title="Course Plan", content=<full plan with block skeletons>)` in Memory notebook
```

**Step 5 (Approval):**
```markdown
*NotebookLM (if active):*
- `note_update(title="Course Plan", content=<approved plan + feedback>)` in Memory notebook
- **Kick off Studio generation now** — plan is approved, sources are uploaded:
  - Per lesson: `studio_create(notebook_id=<source_nb_id>, artifact_type="audio", audio_format="deep_dive", focus_prompt="Focus on [lesson N objectives]. Audience: [audience]. Lesson N of [total] — learners have covered [prior topics].", source_ids=[<ids relevant to this lesson>])`
  - Repeat for `artifact_type="video"`, `"infographic"`, `"slide_deck"` per lesson as appropriate
  - Generation takes 2–8 min per artifact — runs in parallel with Step 6
```

**Step 6 (Content Development):**
```markdown
*NotebookLM (if active):*
- After each lesson is approved: `note_create(title="Lesson [N] Draft", content=<draft>)` in Memory notebook
- Check `studio_status` periodically between lessons
- As artifacts complete: `download_artifact(output_path="/tmp/<file>")` → `upload_media(file_path=...)` → `add_block` with correct type and src URL
- Mapping: audio (M4A) → Audio block, video (MP4) → Video block, slide deck (PPTX) → Document block, infographic (PNG) → Image block, study guide (Markdown) → Text block (render as HTML)
```

**Step 7 (Build):**
```markdown
*NotebookLM (if active):*
- `note_update(title="Build Log")` after each lesson/block is built
- Before sharing: remove internal notes from Source notebook (gap analysis, rough drafts) — keep source materials and web research only
- `notebook_share_public(notebook_id=<source_nb_id>)` → add Button block with the returned URL
- ⚠️ NotebookLM notebooks are not embeddable — Button block only, not Embed
- Remind author: if this course is later deleted, both notebooks remain in their Google account
```

**Step 8 (Audit):**
```markdown
*NotebookLM (if active):* `note_update(title="Audit Notes")` with findings and modifications.
```

- [ ] **Step 4: Add Memory Sync Rules section at the bottom of the workflow**

```markdown
## Memory Notebook Sync Rules (NotebookLM active only)

Every mutation to the course must be mirrored to the Memory notebook in the same step — not as a cleanup pass.

| Action | Memory notebook update |
|--------|----------------------|
| Course plan approved | `note_update("Course Plan", <approved plan>)` |
| Lesson draft approved | `note_create("Lesson [N] Draft", <draft>)` |
| Lesson revised | `note_update("Lesson [N] Draft", <revised>)` |
| Lesson deleted | `note_delete("Lesson [N] Draft")` |
| Block revised | Update the relevant lesson draft note |
| Build log entry | `note_update("Build Log", <append entry>)` |

**After context compaction:** retrieve Memory notebook notes by exact title. Source notebook is still available for `notebook_query`. Local markdown files are the backup.

⚠️ Verify the actual tool names (`note_create`, `note_update`, `note_get`, `note_delete`) against the installed `notebooklm-mcp-cli` before use — see `docs/notebooklm-setup.md`.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/phase-3/phase-3-workflow.md
git commit -m "docs: add NotebookLM workflow steps and update audio format list"
```

---

## Final Verification

- [ ] Run full MCP test suite: `cd mcp && npm test` — all pass
- [ ] Run full frontend test suite: `npm test` — all pass
- [ ] Verify setup script syntax: `bash -n scripts/setup-notebooklm.sh` — no output
- [ ] Read `docs/phase-3/phase-3-workflow.md` — NotebookLM additions sit naturally alongside existing steps, clearly conditional
- [ ] Read `docs/notebooklm-setup.md` — a new user could follow it without additional context
