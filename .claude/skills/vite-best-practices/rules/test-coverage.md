---
title: Configure coverage thresholds and reporters
impact: MEDIUM
impactDescription: Prevents coverage regression over time
tags: test, vitest, coverage
---

## Configure coverage thresholds and reporters

**Impact: MEDIUM (prevents coverage regression over time)**

Without thresholds, coverage silently drops as new code ships without tests. Set minimum thresholds to fail CI when coverage regresses.

**Incorrect (no coverage enforcement):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // No coverage config — coverage is opt-in and unmonitored
  },
})
```

**Correct (thresholds + reporters):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',                 // Fast, native coverage
      reporter: ['text', 'lcov'],     // Terminal + CI-friendly
      include: ['src/**/*.{ts,tsx}'],  // Only app code
      exclude: [
        'src/components/ui/**',        // shadcn/ui primitives
        'src/**/*.test.{ts,tsx}',      // Test files
        'src/test/**',                 // Test utilities
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
})
```

```bash
# Run with coverage
npx vitest run --coverage

# Or add a script
# package.json: "test:coverage": "vitest run --coverage"
```

**Start low, ratchet up:** Set thresholds at your current coverage level. As you add tests, increase them. Never lower thresholds.

Reference: [Vitest Coverage](https://vitest.dev/guide/coverage.html)
