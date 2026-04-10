# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Build Optimization (build)

**Impact:** CRITICAL  
**Description:** Production build size and splitting strategy directly affect load times, caching efficiency, and Time to Interactive. Vite uses Rollup under the hood — understanding chunking and tree-shaking is essential.

## 2. Configuration (config)

**Impact:** HIGH  
**Description:** Correct vite.config.ts setup prevents subtle bugs (broken aliases, wrong targets, slow cold starts) and ensures consistency between dev and production.

## 3. Environment & Security (env)

**Impact:** HIGH  
**Description:** Mishandled environment variables leak secrets into the client bundle or cause runtime errors. Vite's VITE_ prefix system is the critical boundary.

## 4. Dev Server & HMR (dev)

**Impact:** MEDIUM-HIGH  
**Description:** Fast HMR is Vite's core value proposition. Barrel re-exports, large modules, and missing pre-bundling configs degrade the dev experience.

## 5. Asset Handling (asset)

**Impact:** MEDIUM  
**Description:** Correct asset strategy ensures proper cache busting, optimal inlining of small assets, and avoids broken paths in production.

## 6. Testing with Vitest (test)

**Impact:** MEDIUM  
**Description:** Vitest shares Vite's transform pipeline. Proper configuration avoids duplicated config, improves test speed, and ensures parity between dev and test environments.
