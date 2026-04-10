---
title: Enable globals mode for cleaner test syntax
impact: LOW
impactDescription: Removes repetitive imports in every test file
tags: test, vitest, globals
---

## Enable globals mode for cleaner test syntax

**Impact: LOW (removes repetitive imports in every test file)**

By default, Vitest requires explicit imports of `describe`, `it`, `expect`, etc. Enabling `globals: true` makes them available without imports, matching Jest's behavior.

**Without globals (verbose):**

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('createBlock', () => {
  it('should create a heading block', () => {
    expect(createBlock('heading')).toBeDefined()
  })
})
```

**With globals (clean):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
  },
})
```

```json
// tsconfig.json — add types for IDE support
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

```typescript
// Test file — no imports needed
describe('createBlock', () => {
  it('should create a heading block', () => {
    expect(createBlock('heading')).toBeDefined()
  })
})
```

**Tradeoff:** Globals pollute the namespace and make it less explicit where `describe`/`expect` come from. Some teams prefer explicit imports for clarity. Either approach is fine — just be consistent.

Reference: [Vitest Globals](https://vitest.dev/config/#globals)
