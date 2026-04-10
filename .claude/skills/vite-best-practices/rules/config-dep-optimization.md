---
title: Pre-bundle heavy CJS dependencies
impact: HIGH
impactDescription: Eliminates slow cold starts and CJS/ESM issues
tags: config, dependencies, pre-bundling
---

## Pre-bundle heavy CJS dependencies

**Impact: HIGH (eliminates slow cold starts and CJS/ESM issues)**

Vite's dev server uses native ESM. CJS dependencies must be pre-bundled by esbuild during the first run. If a CJS dependency isn't detected automatically, you'll see slow page loads or runtime errors.

**Incorrect (missing pre-bundle — slow first load):**

```typescript
// A CJS library that Vite's auto-detection misses
import { something } from 'legacy-cjs-lib'
// Dev server: slow, may show "Optimized dependencies changed" reloads
```

**Correct (explicit pre-bundling):**

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      'legacy-cjs-lib',
      // Libraries with many internal modules (reduces HTTP requests in dev)
      'recharts',
      'dompurify',
      'lz-string',
    ],
    // Exclude packages that are already ESM and lightweight
    exclude: ['@vite/client'],
  },
})
```

**Signs you need to add a dependency to `include`:**
- "Optimized dependencies changed, reloading" messages in terminal
- Slow initial page load in dev
- `require is not defined` errors in browser console
- Module resolution errors with `.default` access

Reference: [Vite Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling.html)
