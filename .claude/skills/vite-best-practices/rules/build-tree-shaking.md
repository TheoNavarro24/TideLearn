---
title: Ensure proper tree-shaking with ES module imports
impact: CRITICAL
impactDescription: Up to 50% bundle reduction for large libraries
tags: build, tree-shaking, imports
---

## Ensure proper tree-shaking with ES module imports

**Impact: CRITICAL (up to 50% bundle reduction for large libraries)**

Vite uses Rollup for production builds, which only tree-shakes ES module (ESM) imports. CJS `require()` calls and namespace imports (`import * as`) prevent dead-code elimination.

**Incorrect (prevents tree-shaking):**

```typescript
// Imports the entire library
import * as Icons from 'lucide-react'
const icon = Icons.ChevronDown

// CJS require — no tree-shaking at all
const _ = require('lodash')
```

**Correct (enables tree-shaking):**

```typescript
// Named imports — Rollup drops unused exports
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

// Direct path import for libraries without proper ESM exports
import debounce from 'lodash-es/debounce'
```

Check if a dependency ships ESM by looking for `"module"` or `"exports"` in its `package.json`. If it only ships CJS, consider alternatives or add it to `optimizeDeps.include` for pre-bundling.

Reference: [Rollup Tree-Shaking](https://rollupjs.org/introduction/#tree-shaking)
