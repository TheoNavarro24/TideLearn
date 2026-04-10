---
title: Never put secrets in VITE_ variables
impact: CRITICAL
impactDescription: Secrets in VITE_ vars are in the production bundle
tags: env, security, secrets
---

## Never put secrets in VITE_ variables

**Impact: CRITICAL (secrets in VITE_ vars are in the production bundle)**

`VITE_` variables are statically replaced in the built JavaScript. Anyone can open DevTools and read them. This includes API keys, service role keys, and any credential that grants elevated access.

**Incorrect (secret exposed in bundle):**

```bash
# .env — DANGER: this key bypasses RLS!
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

```typescript
// This secret is now in your dist/assets/index-abc123.js
const supabase = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
```

**Correct (only publishable keys in VITE_):**

```bash
# .env — safe: anon key has RLS restrictions
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...    # Publishable, RLS-protected

# Server-only (no VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...   # Never reaches the browser
```

**Safe to expose via VITE_:**
- Supabase anon/publishable key (RLS enforced)
- Public API URLs
- Feature flags
- Analytics IDs

**Never expose via VITE_:**
- Service role keys
- Database connection strings
- OAuth client secrets
- Stripe secret keys
- Any key that bypasses access control

Reference: [Vite Env Security](https://vite.dev/guide/env-and-mode.html#env-files)
