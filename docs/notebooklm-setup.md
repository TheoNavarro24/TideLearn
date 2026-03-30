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
