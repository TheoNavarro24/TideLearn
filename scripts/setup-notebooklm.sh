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
