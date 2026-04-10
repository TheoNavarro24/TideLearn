---
name: vite-best-practices
description: Vite configuration, build optimization, and development best practices. This skill should be used when configuring Vite, optimizing builds, managing environment variables, setting up dev server proxies, configuring Vitest, or debugging common Vite issues. Triggers on tasks involving vite.config.ts, build performance, HMR, asset handling, or Vitest setup.
license: MIT
metadata:
  author: TideLearn
  version: "1.0.0"
---

# Vite Best Practices

Comprehensive guide for Vite-powered React applications. Contains 24 rules across 6 categories, prioritized by impact to guide configuration, build optimization, and development workflow.

## When to Apply

Reference these guidelines when:
- Configuring or modifying `vite.config.ts`
- Optimizing production build size or speed
- Setting up environment variables or dev server proxy
- Debugging HMR, module resolution, or build errors
- Configuring Vitest for testing
- Managing static assets and imports
- Troubleshooting CJS/ESM compatibility issues

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Build Optimization | CRITICAL | `build-` |
| 2 | Configuration | HIGH | `config-` |
| 3 | Environment & Security | HIGH | `env-` |
| 4 | Dev Server & HMR | MEDIUM-HIGH | `dev-` |
| 5 | Asset Handling | MEDIUM | `asset-` |
| 6 | Testing with Vitest | MEDIUM | `test-` |

## Quick Reference

### 1. Build Optimization (CRITICAL)

- `build-manual-chunks` — Split vendor code into separate chunks for caching
- `build-tree-shaking` — Ensure proper tree-shaking with ES module imports
- `build-dynamic-imports` — Use dynamic imports for route-level code splitting
- `build-analyze-bundle` — Use rollup-plugin-visualizer to audit bundle size
- `build-externalize-deps` — Externalize large dependencies that aren't tree-shakeable

### 2. Configuration (HIGH)

- `config-path-aliases` — Use resolve.alias consistently with tsconfig paths
- `config-plugins-order` — Register plugins in correct order (React → others)
- `config-target` — Set appropriate browser targets for output
- `config-dep-optimization` — Pre-bundle heavy CJS dependencies with optimizeDeps

### 3. Environment & Security (HIGH)

- `env-prefix` — Only VITE_ prefixed vars are exposed to client code
- `env-validation` — Validate env vars at startup, not at usage
- `env-no-secrets` — Never put secrets in VITE_ variables (they're in the bundle)
- `env-mode-files` — Use .env.development / .env.production for per-mode config

### 4. Dev Server & HMR (MEDIUM-HIGH)

- `dev-proxy` — Use server.proxy for API calls instead of CORS hacks
- `dev-hmr-boundaries` — Keep HMR-accepting modules small for fast updates
- `dev-no-barrel-re-exports` — Avoid barrel files that slow down HMR
- `dev-dependency-pre-bundling` — Add slow CJS deps to optimizeDeps.include

### 5. Asset Handling (MEDIUM)

- `asset-static-import` — Use import for assets that need hashing
- `asset-public-dir` — Use public/ for assets that must keep their filename
- `asset-inline-threshold` — Configure assetsInlineLimit for small assets
- `asset-svg-component` — Use vite-plugin-svgr for SVG React components

### 6. Testing with Vitest (MEDIUM)

- `test-shared-config` — Share Vite config with Vitest via vitest.config.ts
- `test-globals` — Enable globals mode for cleaner test syntax
- `test-coverage` — Configure coverage thresholds and reporters
- `test-happy-dom` — Use happy-dom over jsdom for faster tests
