---
title: Share Vite config with Vitest
impact: HIGH
impactDescription: Ensures test and dev environments match
tags: test, vitest, config
---

## Share Vite config with Vitest

**Impact: HIGH (ensures test and dev environments match)**

Vitest uses Vite's transform pipeline. If your test config diverges from your app config (different aliases, plugins, or env), tests pass but the app breaks — or vice versa.

**Incorrect (separate configs that drift):**

```typescript
// vitest.config.ts — duplicated and potentially stale
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': './src' },  // May drift from vite.config.ts
  },
  test: {
    environment: 'jsdom',
  },
})
```

**Correct (extend from vite.config.ts):**

```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}))
```

**Or inline in vite.config.ts:**

```typescript
// vite.config.ts — single source of truth
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

Both approaches ensure aliases, plugins, and transforms are identical in dev and test.

Reference: [Vitest Configuration](https://vitest.dev/config/)
