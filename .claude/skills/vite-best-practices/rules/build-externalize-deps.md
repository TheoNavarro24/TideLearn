---
title: Externalize large non-tree-shakeable dependencies
impact: HIGH
impactDescription: Reduces bundle size by offloading to CDN
tags: build, externals, cdn
---

## Externalize large non-tree-shakeable dependencies

**Impact: HIGH (reduces bundle size by offloading to CDN)**

Some libraries are too large to tree-shake effectively (e.g., PDF renderers, mapping libraries). Externalize them and load from a CDN or separate chunk.

**Incorrect (bundling a massive library):**

```typescript
// Entire library ends up in the bundle
import pdf from 'pdfjs-dist'
```

**Correct (externalize or dynamic import):**

```typescript
// Option 1: Dynamic import — only loaded when needed
const renderPdf = async (url: string) => {
  const { getDocument } = await import('pdfjs-dist')
  return getDocument(url).promise
}

// Option 2: Externalize in vite.config.ts (load from CDN in index.html)
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['pdfjs-dist'],
      output: {
        globals: {
          'pdfjs-dist': 'pdfjsLib',
        },
      },
    },
  },
})
```

Prefer dynamic imports over externals — they're simpler and don't require CDN setup. Use externals only when the library doesn't support ESM dynamic imports.

Reference: [Rollup External](https://rollupjs.org/configuration-options/#external)
