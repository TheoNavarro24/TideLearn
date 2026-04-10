---
title: Configure assetsInlineLimit for small assets
impact: LOW-MEDIUM
impactDescription: Reduces HTTP requests for tiny files
tags: asset, inline, base64
---

## Configure assetsInlineLimit for small assets

**Impact: LOW-MEDIUM (reduces HTTP requests for tiny files)**

Vite inlines assets smaller than `assetsInlineLimit` (default: 4 KB) as base64 data URLs. This saves an HTTP request per file but increases the JavaScript bundle size.

**Default behavior:**

```typescript
// vite.config.ts — default is 4096 bytes (4 KB)
export default defineConfig({
  build: {
    assetsInlineLimit: 4096,
  },
})
```

**Adjust based on your needs:**

```typescript
export default defineConfig({
  build: {
    // Inline more aggressively — good for icon-heavy UIs
    assetsInlineLimit: 8192,  // 8 KB

    // Or disable inlining entirely — every asset is a file
    // assetsInlineLimit: 0,
  },
})
```

**Tradeoffs:**
- **Higher limit** → fewer HTTP requests, larger JS bundle, no separate caching for small assets
- **Lower limit** → more HTTP requests, smaller JS bundle, assets cached independently
- **Default (4 KB)** is a reasonable middle ground for most apps

**Note:** SVG files imported as React components (via vite-plugin-svgr) are NOT subject to inlining — they become JSX, not data URLs.

Reference: [Vite assetsInlineLimit](https://vite.dev/config/build-options.html#build-assetsinlinelimit)
