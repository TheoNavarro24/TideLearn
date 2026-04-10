---
title: Keep HMR-accepting modules small for fast updates
impact: MEDIUM-HIGH
impactDescription: Sub-100ms HMR updates vs multi-second reloads
tags: dev, hmr, performance
---

## Keep HMR-accepting modules small for fast updates

**Impact: MEDIUM-HIGH (sub-100ms HMR updates vs multi-second reloads)**

Vite's HMR works by invalidating the changed module and its importers up to the nearest HMR boundary (typically a React component file). Large files with many exports create wide invalidation — more modules re-execute.

**Incorrect (mega-file that invalidates everything):**

```typescript
// src/types/course.ts — 800 lines, every component imports this
export type Course = { ... }
export type Block = { ... }
export const factories = { ... }
export const schemas = { ... }
// Change any line → every importer re-executes
```

**Correct (split by concern):**

```
src/types/
├── course.ts      → Core Course/Lesson types
├── blocks.ts      → Block type union and interfaces
├── factories.ts   → Block factory functions
└── schemas.ts     → Zod schemas
```

Each file is a smaller HMR boundary. Changing a factory only re-executes importers of `factories.ts`, not the entire type system.

**Guidelines:**
- Keep component files under 200 lines
- Split large type files by domain
- Extract constants and config into separate files
- Use the RC4 pattern: thin orchestrator page + extracted hooks + sub-components

Reference: [Vite HMR](https://vite.dev/guide/api-hmr.html)
