# TideLearn — Deployment

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Testing](11-TESTING.md) | [Index](00-INDEX.md)*

---

## Current State

TideLearn currently runs **locally** in development mode:

```bash
npm run dev    # Vite dev server on localhost:8080
```

The Supabase backend is already hosted (cloud projects). Only the frontend and MCP server need deployment infrastructure.

---

## Planned Architecture

| Component | Platform | Status |
|-----------|----------|--------|
| **Frontend** | Cloudflare Pages | Planned |
| **MCP Server** | Fly.io | Planned |
| **Database** | Supabase | Active (hosted) |
| **Storage** | Supabase Storage | Active (hosted) |
| **Domain** | Porkbun | Planned |
| **DNS** | Cloudflare | Planned |

---

## Frontend — Cloudflare Pages

### Build Configuration

```yaml
Build command: npm run build
Build output: dist/
Node version: 18+
```

### Environment Variables

None required — Supabase credentials are hardcoded in `src/integrations/supabase/client.ts` (publishable keys only).

### Deployment Flow

```
git push to main → Cloudflare Pages auto-build → Deploy to edge
```

---

## MCP Server — Fly.io

### Current: Stdio Transport (Local)

The MCP server runs as a subprocess of Claude Code. No deployment needed for local use.

### Future: SSE Transport (Hosted)

Plan D (`docs/superpowers/plans/post-domain-plan-d-mcp-hosted-auth.md`) outlines the migration:

1. **Hono web framework** for HTTP endpoints
2. **SSE transport** replacing stdio for remote connections
3. **OAuth 2.0 PKCE** authentication flow
4. **`mcp_sessions` table** in Supabase for session storage
5. **AsyncLocalStorage** for request-scoped user context
6. **Stdio preserved** for local development

### Fly.io Configuration (Planned)

```toml
# fly.toml
app = "tidelearn-mcp"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

---

## Supabase (Active)

### Two Projects

| Project | ID | Purpose |
|---------|-----|---------|
| Frontend | `wlevkqlsabvmfdkphnza` | User auth, course storage, media |
| MCP | `rljldeobjtgoqttuxhsf` | Claude-driven operations |

### Migrations

Managed via Supabase CLI:

```bash
supabase db push          # Apply migrations
supabase db diff          # Generate migration from changes
supabase gen types        # Regenerate TypeScript types
```

Current migrations:
1. Initial schema (profiles + courses + RLS + triggers)
2. Course media bucket (public, 50 MB limit)
3. Cover image URL column

---

## DNS — Cloudflare

### Planned Records

```
tidelearn.com        → Cloudflare Pages (frontend)
mcp.tidelearn.com    → Fly.io (MCP server, future)
```

### SSL

- Cloudflare provides free SSL for all domains
- Fly.io provides automatic TLS certificates

---

## Build & CI

### Local Build

```bash
npm run build    # Production build (Vite)
npm run lint     # ESLint
npm test         # Vitest (frontend)
cd mcp && npm test  # Vitest (MCP)
```

### CI/CD (Planned)

GitHub Actions for:
- Lint on PR
- Test on PR (frontend + MCP)
- Build verification
- Auto-deploy to Cloudflare Pages on merge to main

---

## Pre-Deployment Checklist

- [ ] Domain registered (Porkbun)
- [ ] DNS configured (Cloudflare)
- [ ] Cloudflare Pages project created
- [ ] Fly.io app created (for MCP server)
- [ ] OAuth redirect URIs updated for production domain
- [ ] Supabase auth settings updated for production domain
- [ ] Environment variables set in Fly.io
- [ ] SSL certificates active
- [ ] SCORM export tested in production build
- [ ] Supabase RLS policies verified
