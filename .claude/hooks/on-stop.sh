#!/bin/bash
# on-stop.sh — runs at end of every Claude Code turn.
# Exits silently (no tokens) if nothing meaningful changed.
# Only invokes Claude when source files were actually modified.

# Exclude CLAUDE.md and Changelog.tsx themselves to prevent recursion:
# if the only changed files are the ones this hook writes, don't re-run.
MEANINGFUL_CHANGED=$(git status --porcelain 2>/dev/null \
  | awk '{print $2}' \
  | grep -E '\.(ts|tsx|md)$' \
  | grep -v 'CLAUDE\.md' \
  | grep -v 'src/pages/Changelog\.tsx' \
  | head -20)

if [ -z "$MEANINGFUL_CHANGED" ]; then
  exit 0
fi

CHANGED_LIST=$(echo "$MEANINGFUL_CHANGED" | tr '\n' ' ')

claude --dangerously-skip-permissions -p "The following files were changed in this session: ${CHANGED_LIST}

1. Update CLAUDE.md to reflect the current project state — Key Files, Critical Rules, or any relevant sections that changed.
2. Add an entry to src/pages/Changelog.tsx under today's date (2026-04-10). Choose the appropriate type (feat, fix, refactor, design, test, docs). Write concise bullet points describing what was delivered."
