---
title: Set appropriate browser targets
impact: MEDIUM-HIGH
impactDescription: Balances modern syntax with browser coverage
tags: config, target, compatibility
---

## Set appropriate browser targets

**Impact: MEDIUM-HIGH (balances modern syntax with browser coverage)**

Vite defaults to targeting browsers that support native ESM (`<script type="module">`). For wider compatibility or to leverage newer syntax, explicitly set the target.

**Incorrect (no explicit target — may include unnecessary polyfills):**

```typescript
export default defineConfig({
  // Default: 'modules' — targets ESM-supporting browsers
  // May be too broad or too narrow for your users
})
```

**Correct (explicit target for your audience):**

```typescript
export default defineConfig({
  build: {
    // For modern browsers (most e-learning platforms)
    target: 'es2020',

    // Or for specific browser versions
    // target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
  },
})
```

For esbuild in dev mode, Vite uses `esbuild.target` (defaults to `esnext`). Ensure dev and prod targets are reasonably close to avoid "works in dev, breaks in prod" scenarios.

**TideLearn note:** Since learners access courses via LMS platforms (often with older embedded browsers), consider targeting `es2018` or `es2020` rather than `esnext`.

Reference: [Vite build.target](https://vite.dev/config/build-options.html#build-target)
