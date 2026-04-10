---
title: Use public/ for assets that must keep their filename
impact: MEDIUM
impactDescription: Correct handling of special-case static files
tags: asset, public, static
---

## Use public/ for assets that must keep their filename

**Impact: MEDIUM (correct handling of special-case static files)**

Files in `public/` are served as-is at the root path, without content hashing or processing. Use this for files that external systems reference by exact name.

**Correct use of public/:**

```
public/
├── favicon.ico           # Browser looks for /favicon.ico
├── robots.txt            # Search engines look for /robots.txt
├── manifest.json         # PWA manifest at /manifest.json
└── og-image.png          # Social media crawlers need stable URLs
```

```typescript
// Reference with absolute path (no import needed)
<link rel="icon" href="/favicon.ico" />
<meta property="og:image" content="/og-image.png" />
```

**When to use `public/`:**
- Favicons, robots.txt, manifest.json
- Open Graph / social media images (need stable URLs)
- Files referenced by name in `index.html`
- SCORM manifest files (LMS expects exact filenames)

**When NOT to use `public/`:**
- Component images, icons, illustrations → use `import` for hashing
- CSS backgrounds → use `url()` in CSS for hashing
- Anything that changes frequently → import for cache busting

**Warning:** Files in `public/` are NOT processed by Vite — no minification, no TypeScript, no PostCSS. They are copied verbatim to `dist/`.

Reference: [Vite public Directory](https://vite.dev/guide/assets.html#the-public-directory)
