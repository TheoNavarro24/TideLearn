---
title: Use dynamic imports for route-level code splitting
impact: CRITICAL
impactDescription: 40-70% reduction in initial bundle size
tags: build, code-splitting, lazy-loading
---

## Use dynamic imports for route-level code splitting

**Impact: CRITICAL (40-70% reduction in initial bundle size)**

Static imports include all page code in the main bundle. Dynamic `import()` creates separate chunks loaded on demand. In a React SPA, every route should be a lazy-loaded chunk.

**Incorrect (all pages in main bundle):**

```typescript
import Editor from './pages/Editor'
import Courses from './pages/Courses'
import Settings from './pages/Settings'

<Route path="/editor" element={<Editor />} />
```

**Correct (lazy-loaded route chunks):**

```typescript
import { lazy, Suspense } from 'react'

const Editor = lazy(() => import('./pages/Editor'))
const Courses = lazy(() => import('./pages/Courses'))
const Settings = lazy(() => import('./pages/Settings'))

<Route path="/editor" element={
  <Suspense fallback={<LoadingSpinner />}>
    <Editor />
  </Suspense>
} />
```

Each `import()` call becomes a separate chunk in the build output. Vite automatically handles chunk naming and loading.

Reference: [Vite Code Splitting](https://vite.dev/guide/build.html#chunking-strategy)
