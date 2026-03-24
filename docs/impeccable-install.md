# Installing the Impeccable Plugin

**Plugin**: [pbakaus/impeccable](https://github.com/pbakaus/impeccable) v1.5.1
**Author**: Paul Bakaus
**What it does**: Design fluency for AI harnesses. 1 enhanced frontend-design skill, 20 slash commands (`/polish`, `/distill`, `/audit`, `/typeset`, `/overdrive`, etc.), and curated anti-patterns for impeccable frontend design.

## How it was installed

Claude Code plugins from GitHub repos use the **marketplace** system. Two changes were made to `~/.claude/settings.json` (global user settings):

### 1. Registered the marketplace source

Added an entry under `extraKnownMarketplaces` pointing to the GitHub repo:

```json
"impeccable": {
  "source": {
    "source": "github",
    "repo": "pbakaus/impeccable"
  },
  "autoUpdate": true
}
```

This tells Claude Code where to find the plugin's `marketplace.json` (at `.claude-plugin/marketplace.json` in the repo). The `autoUpdate: true` flag means Claude Code will pull the latest version on startup.

### 2. Enabled the plugin

Added the plugin to `enabledPlugins`:

```json
"impeccable@impeccable": true
```

The format is `plugin-name@marketplace-id`. The marketplace ID matches the key we used in `extraKnownMarketplaces`.

### Full diff

```diff
  "enabledPlugins": {
    ...existing plugins...
+   "impeccable@impeccable": true
  },
  "extraKnownMarketplaces": {
    ...existing marketplaces...
+   "impeccable": {
+     "source": {
+       "source": "github",
+       "repo": "pbakaus/impeccable"
+     },
+     "autoUpdate": true
+   }
  }
```

## To verify

Restart Claude Code (or start a new session). The plugin's 20 commands should appear in `/help` and the enhanced `frontend-design` skill will be active.

## To uninstall

Remove the `"impeccable@impeccable": true` line from `enabledPlugins` and the `"impeccable"` block from `extraKnownMarketplaces` in `~/.claude/settings.json`.
