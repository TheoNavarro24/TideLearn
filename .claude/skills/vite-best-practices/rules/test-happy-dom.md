---
title: Use happy-dom over jsdom for faster tests
impact: MEDIUM
impactDescription: 2-5x faster test execution
tags: test, vitest, environment, performance
---

## Use happy-dom over jsdom for faster tests

**Impact: MEDIUM (2-5x faster test execution)**

`happy-dom` is a lightweight DOM implementation that's significantly faster than `jsdom`. For most React component tests, it provides the same APIs with better performance.

**Incorrect (jsdom — slower):**

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',  // Full W3C spec compliance, but slower
  },
})
```

**Correct (happy-dom — faster):**

```bash
npm install -D happy-dom
```

```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom',  // 2-5x faster for most tests
  },
})
```

**When to use jsdom instead:**
- Tests that depend on precise layout calculations (`getBoundingClientRect`)
- Tests involving complex CSS parsing
- Tests that need full `fetch` / `AbortController` spec compliance
- If a test passes with jsdom but fails with happy-dom (rare)

**Per-file override** when specific tests need jsdom:

```typescript
// @vitest-environment jsdom
import { render } from '@testing-library/react'

// This file uses jsdom, rest of suite uses happy-dom
```

Reference: [Vitest Test Environment](https://vitest.dev/config/#environment)
