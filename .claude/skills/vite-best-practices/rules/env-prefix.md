---
title: Only VITE_ prefixed vars are exposed to client code
impact: CRITICAL
impactDescription: Security boundary — prevents secret leakage
tags: env, security, variables
---

## Only VITE_ prefixed vars are exposed to client code

**Impact: CRITICAL (security boundary — prevents secret leakage)**

Vite replaces `import.meta.env.VITE_*` variables at build time with their string values. Variables WITHOUT the `VITE_` prefix are NOT available in client code — this is a security feature, not a bug.

**Incorrect (expecting non-prefixed vars in client):**

```bash
# .env
DATABASE_URL=postgres://...
API_SECRET=sk_live_...
VITE_API_URL=https://api.example.com
```

```typescript
// Client code — DATABASE_URL is undefined (correctly blocked!)
console.log(import.meta.env.DATABASE_URL)       // undefined
console.log(import.meta.env.API_SECRET)          // undefined
console.log(import.meta.env.VITE_API_URL)        // "https://api.example.com"
```

**Correct (clear prefix separation):**

```bash
# .env — only VITE_ vars reach the browser
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-only vars (MCP server, scripts) — no VITE_ prefix
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

```typescript
// Access in client code via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
```

**Rule:** If a variable contains a secret (API keys, service role keys, database URLs), it must NEVER have the `VITE_` prefix.

Reference: [Vite Env Variables](https://vite.dev/guide/env-and-mode.html)
