---
title: Avoid barrel files that slow down HMR
impact: MEDIUM-HIGH
impactDescription: Barrel re-exports can 10x HMR update time
tags: dev, hmr, barrel, imports
---

## Avoid barrel files that slow down HMR

**Impact: MEDIUM-HIGH (barrel re-exports can 10x HMR update time)**

A barrel file (`index.ts` that re-exports from many modules) creates a dependency hub. When any re-exported module changes, Vite must re-evaluate the entire barrel and all its importers.

**Incorrect (barrel re-exports):**

```typescript
// src/components/blocks/editors/index.ts — barrel file
export { HeadingForm } from './HeadingForm'
export { TextForm } from './TextForm'
export { QuizForm } from './QuizForm'
// ... 26 more exports

// Consumer — imports through barrel
import { HeadingForm } from '@/components/blocks/editors'
```

**Correct (direct imports):**

```typescript
// Consumer — imports directly from the source file
import { HeadingForm } from '@/components/blocks/editors/HeadingForm'
```

**When barrels are acceptable:**
- External package APIs (consumers don't control imports)
- Small utility collections (< 5 exports, rarely change)
- Type-only barrels (`export type { ... }` — no runtime cost)

**When barrels hurt:**
- Component directories with 10+ files
- Files that change frequently during development
- Deep import chains (barrel → barrel → barrel)

Reference: [Vite Performance — Avoid Barrel Files](https://vite.dev/guide/performance.html#avoid-barrel-files)
