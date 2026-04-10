---
title: Register plugins in correct order
impact: HIGH
impactDescription: Prevents subtle transform bugs
tags: config, plugins, order
---

## Register plugins in correct order

**Impact: HIGH (prevents subtle transform bugs)**

Vite plugins execute in registration order. The React plugin (SWC or Babel) must run before other transform plugins so JSX is processed first.

**Incorrect (React plugin after other transforms):**

```typescript
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    svgr(),      // Runs first — may see untransformed JSX
    react(),     // Runs second — too late for some transforms
  ],
})
```

**Correct (React plugin first):**

```typescript
export default defineConfig({
  plugins: [
    react(),     // Always first — handles JSX transform
    svgr(),      // After React — operates on transformed output
    // Analysis/reporting plugins last
    process.env.ANALYZE && visualizer(),
  ].filter(Boolean),
})
```

**Recommended order:**
1. Framework plugin (`@vitejs/plugin-react-swc`)
2. Asset plugins (svgr, images)
3. Utility plugins (tsconfigPaths, env validation)
4. Analysis/reporting plugins (visualizer) — last, conditional

Reference: [Vite Plugin API](https://vite.dev/guide/api-plugin.html#plugin-ordering)
