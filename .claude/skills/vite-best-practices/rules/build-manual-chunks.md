---
title: Split vendor code into manual chunks
impact: CRITICAL
impactDescription: 30-60% cache hit improvement on redeploys
tags: build, chunking, caching
---

## Split vendor code into manual chunks

**Impact: CRITICAL (30-60% cache hit improvement on redeploys)**

By default, Vite bundles all vendor code into a single chunk. When any dependency updates, the entire vendor chunk is invalidated. Manual chunks let you split stable libraries (React, Radix) from frequently-changing ones, so browsers cache them independently.

**Incorrect (all vendors in one chunk):**

```typescript
// vite.config.ts
export default defineConfig({
  // No build.rollupOptions — everything lands in one vendor chunk
})
```

**Correct (split by stability):**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-editor': ['@tiptap/core', '@tiptap/starter-kit'],
        },
      },
    },
  },
})
```

Keep each chunk under ~150 KB gzipped. Group by update frequency — React updates rarely, so it gets its own long-lived chunk.

Reference: [Vite Build Options](https://vite.dev/config/build-options.html#build-rollupoptions)
