---
title: Keep resolve.alias in sync with tsconfig paths
impact: HIGH
impactDescription: Prevents build failures and IDE confusion
tags: config, aliases, typescript
---

## Keep resolve.alias in sync with tsconfig paths

**Impact: HIGH (prevents build failures and IDE confusion)**

Vite and TypeScript each have their own path alias system. If they're out of sync, imports work in the IDE but fail at build time (or vice versa).

**Incorrect (aliases only in one place):**

```json
// tsconfig.json — IDE resolves @/ but Vite doesn't
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

```typescript
// vite.config.ts — no matching alias
export default defineConfig({})
```

**Correct (both in sync):**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

```typescript
// vite.config.ts
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Alternatively, use `vite-tsconfig-paths` plugin to auto-read tsconfig paths:

```typescript
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
})
```

Reference: [Vite resolve.alias](https://vite.dev/config/shared-options.html#resolve-alias)
