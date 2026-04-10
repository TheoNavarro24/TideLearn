---
title: Use server.proxy for API calls instead of CORS hacks
impact: HIGH
impactDescription: Eliminates CORS issues in development
tags: dev, proxy, cors
---

## Use server.proxy for API calls instead of CORS hacks

**Impact: HIGH (eliminates CORS issues in development)**

During development, the Vite dev server and your API are on different origins. Instead of enabling CORS on the API (which introduces security risks and diverges from production), proxy API requests through Vite.

**Incorrect (CORS headers on the API):**

```typescript
// API server — adding CORS just for dev
app.use(cors({ origin: 'http://localhost:8080' }))

// Client — full URL required
fetch('http://localhost:3000/api/courses')
```

**Correct (Vite proxy):**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

```typescript
// Client — relative URL, proxied by Vite
fetch('/api/courses')
```

The proxy is dev-only. In production, your reverse proxy (Cloudflare, Nginx) handles routing. This keeps dev and prod behavior aligned.

Reference: [Vite Server Proxy](https://vite.dev/config/server-options.html#server-proxy)
