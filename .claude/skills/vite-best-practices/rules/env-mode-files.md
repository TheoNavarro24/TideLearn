---
title: Use .env.development and .env.production for per-mode config
impact: MEDIUM
impactDescription: Clean separation between dev and prod environments
tags: env, modes, configuration
---

## Use .env.development and .env.production for per-mode config

**Impact: MEDIUM (clean separation between dev and prod environments)**

Vite loads env files based on the current mode. Use mode-specific files to avoid manually toggling variables between environments.

**Incorrect (commenting out variables):**

```bash
# .env — manually toggle between dev and prod
VITE_API_URL=http://localhost:3000
# VITE_API_URL=https://api.tidelearn.com
```

**Correct (mode-specific files):**

```bash
# .env                    — shared defaults (always loaded)
VITE_APP_NAME=TideLearn

# .env.development        — loaded in `vite dev`
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true

# .env.production         — loaded in `vite build`
VITE_API_URL=https://api.tidelearn.com
VITE_DEBUG=false

# .env.local              — local overrides (gitignored)
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Loading priority (last wins):**
1. `.env` — always loaded
2. `.env.local` — always loaded, gitignored
3. `.env.[mode]` — loaded for specific mode
4. `.env.[mode].local` — loaded for specific mode, gitignored

**Rule:** Commit `.env`, `.env.development`, `.env.production`. Gitignore `.env.local` and `.env.*.local`.

Reference: [Vite Env Files](https://vite.dev/guide/env-and-mode.html#env-files)
