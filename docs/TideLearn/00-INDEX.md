# TideLearn — Documentation Index

> Version: 0.1.0 | Last updated: 2026-04-10

---

## Reading Order

| # | Document | Description |
|---|----------|-------------|
| 00 | [Index](00-INDEX.md) | This file — reading order, glossary, conventions |
| 00 | [Guidelines](00-GUIDELINES.md) | Project discovery: why TideLearn exists, founding decisions |
| 01 | [General Vision](01-GENERAL-VISION.md) | Product identity, target users, business model |
| 02 | [Architecture](02-ARCHITECTURE.md) | Tech stack, project structure, data flow, deployment |
| 03 | [Data Model](03-DATA-MODEL.md) | Supabase schema, Zod types, JSON course structure |
| 04 | [Authentication & Authorization](04-AUTHENTICATION-AUTHORIZATION.md) | Google OAuth, RLS policies, protected routes |
| 05 | [Code Conventions](05-CODE-CONVENTIONS.md) | Naming, patterns, TypeScript rules, file structure |
| 06 | [Block System](06-BLOCK-SYSTEM.md) | 29 block types, registry, factories, editor/viewer pipeline |
| 07 | [Assessment Engine](07-ASSESSMENT-ENGINE.md) | Question types, Leitner algorithm, scoring |
| 08 | [MCP Server](08-MCP-SERVER.md) | Tool registration, transport, design principles |
| 09 | [Design System](09-DESIGN-SYSTEM.md) | Rockpool tokens, typography, layout, accessibility |
| 10 | [SCORM Export](10-SCORM-EXPORT.md) | SCORM 1.2 packaging, LMS compatibility |
| 11 | [Testing](11-TESTING.md) | Vitest strategy, coverage, MCP stress playbook |
| 12 | [Deployment](12-DEPLOYMENT.md) | Cloudflare Pages, Fly.io, Supabase, DNS |
| — | [Changelog](CHANGELOG.md) | Documentation change log |
| — | [Pending](PENDING.md) | Open decisions and unplanned areas |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Block** | Atomic content unit inside a lesson (heading, image, quiz, timeline, etc.). 29 types registered in the block registry. |
| **Lesson** | Discriminated union: `kind: "content"` (has blocks) or `kind: "assessment"` (has questions). |
| **Course** | Top-level entity. Contains `schemaVersion: 1`, `title`, and an ordered array of lessons. |
| **Block Registry** | Central mapping in `src/components/blocks/registry.ts` — each block type maps to an icon, label, factory, editor form, and viewer component. |
| **MCP** | Model Context Protocol. TideLearn exposes a stdio-based MCP server so Claude can create/edit courses programmatically. |
| **Rockpool** | TideLearn's design system. Defines CSS custom properties, typography, spacing, and colour tokens. |
| **SCORM** | Sharable Content Object Reference Model (v1.2). Standard for packaging e-learning content for LMS platforms. |
| **RLS** | Row Level Security — PostgreSQL policies that restrict data access per user at the database level. |
| **Leitner** | Spaced repetition algorithm used in assessment lessons. Classifies questions into boxes by mastery. |
| **Factory** | Function in `src/types/course.ts` that creates a default block/question instance with correct shape and defaults. |
| **Discriminated Union** | TypeScript pattern where a `kind` field determines the type. Used for lessons (`"content"` / `"assessment"`) and assessment questions (`"mcq"` / `"fillinblank"` / etc.). |
| **SME** | Subject Matter Expert — the person who reviews and approves course content before publishing. |

---

## Conventions Used in This Documentation

- **Code/DB/commits**: English
- **Documentation**: English
- **File references**: Relative paths from project root
- **Version bumps**: Semantic versioning per document
- All documentation changes must be recorded in [CHANGELOG.md](CHANGELOG.md)
