---
title: Use import for assets that need content hashing
impact: MEDIUM
impactDescription: Ensures cache busting on asset changes
tags: asset, import, hashing
---

## Use import for assets that need content hashing

**Impact: MEDIUM (ensures cache busting on asset changes)**

When you `import` an asset, Vite adds a content hash to the filename in production (`logo-abc123.png`). This enables aggressive caching — browsers cache the file forever and automatically fetch a new one when the content changes.

**Incorrect (string path — no hashing):**

```typescript
// No content hash — browser may serve stale cached version
<img src="/images/logo.png" alt="TideLearn" />
```

**Correct (import — content-hashed):**

```typescript
import logo from '@/assets/logo.png'

// In production: /assets/logo-a1b2c3d4.png
<img src={logo} alt="TideLearn" />
```

**Also works with:**

```typescript
// CSS url() references are also processed
.hero { background-image: url('@/assets/hero.jpg'); }

// Dynamic imports for conditional assets
const flag = await import(`@/assets/flags/${country}.svg`)
```

**When to use `public/` instead:** See `asset-public-dir` rule for files that must keep their original filename (favicons, robots.txt, SCORM manifests).

Reference: [Vite Static Asset Handling](https://vite.dev/guide/assets.html)
