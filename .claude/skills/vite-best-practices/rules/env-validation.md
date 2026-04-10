---
title: Validate env vars at startup, not at usage
impact: HIGH
impactDescription: Fails fast instead of crashing at runtime
tags: env, validation, zod
---

## Validate env vars at startup, not at usage

**Impact: HIGH (fails fast instead of crashing at runtime)**

Missing or malformed env vars cause cryptic runtime errors deep in the app. Validate all required vars once at startup with Zod, so the app fails immediately with a clear message.

**Incorrect (undefined env var crashes later):**

```typescript
// Deep in a component — crashes with "TypeError: Cannot read property of undefined"
const response = await fetch(import.meta.env.VITE_API_URL + '/courses')
```

**Correct (validate at startup):**

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

// Validates on import — app won't start if vars are missing
export const env = envSchema.parse(import.meta.env)
```

```typescript
// Usage — guaranteed to be valid
import { env } from '@/lib/env'
const response = await fetch(env.VITE_SUPABASE_URL + '/rest/v1/courses')
```

This pattern works well with Vite's `import.meta.env` because all `VITE_` vars are statically replaced at build time.

Reference: [Vite Env Variables](https://vite.dev/guide/env-and-mode.html#intellisense-for-typescript)
