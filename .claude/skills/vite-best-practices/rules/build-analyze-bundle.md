---
title: Analyze bundle size with rollup-plugin-visualizer
impact: HIGH
impactDescription: Identifies bloat before it ships
tags: build, analysis, debugging
---

## Analyze bundle size with rollup-plugin-visualizer

**Impact: HIGH (identifies bloat before it ships)**

Without visibility into what's in the bundle, large dependencies sneak in unnoticed. The visualizer generates a treemap showing every module's contribution to bundle size.

**Incorrect (blind to bundle contents):**

```typescript
// vite.config.ts
export default defineConfig({
  // No analysis — you won't know that moment.js added 300KB
})
```

**Correct (visualize on demand):**

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    // Only in analysis mode — not in every build
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
    }),
  ].filter(Boolean),
})
```

```bash
# Run analysis
ANALYZE=true npm run build
```

Look for: unexpectedly large modules, duplicated dependencies, CJS libraries that should be replaced with ESM alternatives.

Reference: [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
