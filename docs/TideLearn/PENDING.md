# TideLearn — Pending Decisions

> Last updated: 2026-04-10

Open decisions, unplanned areas, and items that need resolution before production.

---

## Infrastructure

- [ ] **Domain selection** — Final domain name (tidelearn.com or alternative)
- [ ] **Cloudflare Pages setup** — Account, project, build pipeline
- [ ] **Fly.io setup** — App creation, region selection, scaling config
- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, build, deploy

## MCP Server

- [ ] **Plan D implementation** — SSE transport, OAuth 2.0 PKCE, mcp_sessions table
- [ ] **Two Supabase projects consolidation** — Currently frontend and MCP use different projects; evaluate merging

## Authentication

- [ ] **Production OAuth redirect URIs** — Update when domain is live
- [ ] **Additional auth providers** — Email/password? GitHub? (currently Google-only)

## Features

- [ ] **Collaboration** — Multi-author course editing (real-time or async)
- [ ] **Versioning** — Course version history and rollback
- [ ] **Templates** — Pre-built course templates for common use cases
- [ ] **SCORM 2004 / xAPI** — Modern e-learning standards support
- [ ] **Offline mode** — Full offline capability with sync on reconnect

## Legal

- [ ] **Terms of Service** — Required before public launch
- [ ] **Privacy Policy** — GDPR compliance for user data
- [ ] **Cookie Policy** — Minimal (Supabase session cookies)

## Documentation

- [ ] **API documentation** — If/when a public REST API is exposed
- [ ] **User guide** — End-user documentation for course authors
- [ ] **Contributing guide** — For open-source contributors
