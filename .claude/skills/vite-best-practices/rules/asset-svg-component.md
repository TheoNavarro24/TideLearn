---
title: Use vite-plugin-svgr for SVG React components
impact: MEDIUM
impactDescription: SVGs as components enable styling, animation, and a11y
tags: asset, svg, react, components
---

## Use vite-plugin-svgr for SVG React components

**Impact: MEDIUM (SVGs as components enable styling, animation, and a11y)**

Raw SVG imports give you a URL string. If you need to style, animate, or add ARIA attributes to an SVG, you need it as a React component. `vite-plugin-svgr` transforms `.svg` imports into React components.

**Without svgr (URL only):**

```typescript
import logo from '@/assets/logo.svg'
// logo = "/assets/logo-abc123.svg" (string URL)
<img src={logo} alt="Logo" />  // Can't style internals
```

**With svgr (React component):**

```typescript
// vite.config.ts
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
})
```

```typescript
// Import as component (with ?react suffix)
import LogoIcon from '@/assets/logo.svg?react'

// Full control: styling, animation, ARIA
<LogoIcon
  className="h-8 w-8 text-accent"
  aria-label="TideLearn logo"
  role="img"
/>
```

**Both imports available:**

```typescript
import logoUrl from '@/assets/logo.svg'          // URL string
import LogoIcon from '@/assets/logo.svg?react'    // React component
```

**Note:** TideLearn primarily uses `lucide-react` for icons. Use svgr only for custom SVGs (brand logo, illustrations) that need component-level control.

Reference: [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr)
