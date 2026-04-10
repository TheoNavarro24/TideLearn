---
title: Add slow CJS deps to optimizeDeps.include
impact: MEDIUM
impactDescription: Eliminates "optimized dependencies changed" reloads
tags: dev, dependencies, cjs
---

## Add slow CJS deps to optimizeDeps.include

**Impact: MEDIUM (eliminates "optimized dependencies changed" reloads)**

Vite auto-discovers dependencies during the first dev server start and pre-bundles them with esbuild. When a dependency is discovered late (e.g., dynamically imported or deeply nested), Vite must re-optimize and reload the page.

**Incorrect (late discovery causes reload):**

```
[vite] ✨ optimized dependencies changed. reloading
[vite] ✨ new dependencies optimized: recharts, dompurify
```

**Correct (explicit include):**

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      // CJS libraries that Vite might discover late
      'recharts',
      'dompurify',
      'lz-string',
      'jszip',
      // Deeply nested dependencies
      'recharts/lib/chart/BarChart',
    ],
  },
})
```

**When to add a dependency:**
- You see "optimized dependencies changed, reloading" in the terminal
- A CJS library causes `require is not defined` errors
- A large library with many internal modules causes slow page loads
- You import a dependency conditionally or dynamically

**Note:** Pre-bundled dependencies are cached in `node_modules/.vite`. Delete this folder to force re-optimization after dependency changes.

Reference: [Vite Dep Pre-Bundling](https://vite.dev/guide/dep-pre-bundling.html#customizing-the-behavior)
