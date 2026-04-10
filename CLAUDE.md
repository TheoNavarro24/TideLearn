# TideLearn

E-learning course authoring platform. React frontend + MCP server for Claude integration + Supabase backend.

## Quick Reference

```bash
npm run dev          # Vite dev server on port 8080
npm run build        # Production build
cd mcp && npm test   # 238 Vitest tests
```

## Architecture

```
src/           → React 18 + TypeScript + Vite + Tailwind + shadcn/ui
mcp/           → MCP server (Node, stdio transport, strict TS)
supabase/      → Migrations & config
docs/TideLearn → Full documentation (architecture, data model, conventions, etc.)
```

- **29 block types** in `src/components/blocks/registry.ts` — factory, editor form, view renderer each
- **Discriminated union lessons**: `kind: "content"` (blocks) or `kind: "assessment"` (questions)
- **Dual storage**: localStorage + Supabase (Google OAuth)
- **SCORM 1.2 export** via jszip

### Key Files

| File | Purpose |
|------|---------|
| `src/types/course.ts` | Core types, Zod schemas, block factories |
| `src/components/blocks/registry.ts` | Block type → editor/viewer mapping |
| `mcp/src/index.ts` | MCP server entry, tool registration |
| `mcp/src/lib/types.ts` | MCP-side Zod schemas (mirrors src/types) |
| `src/lib/courses.ts` | Course CRUD & localStorage |
| `src/lib/assessment.ts` | Leitner spaced repetition algorithm |

## Critical Rules

- Adding a block type → update **both** `courseSchema` AND `courseSchemaPermissive` in `src/types/course.ts` (stale permissive = viewer shows "Course not found")
- Adding a block with nested items → update `injectSubItemIds` in `mcp/src/tools/semantic.ts` + `renderBlock` in `mcp/src/tools/preview.ts`
- Adding a block/question type → update `docs/phase-3/step7-mcp-reference.md`
- `schemaVersion: 1` required in all course JSON; never include `id` fields (auto-generated)
- Always `get_course` before editing; use `save_course` (not `generate_course`)
- Quiz `correctIndex` is 0-based; factory default `-1` (must set before publish)
- Assessment lessons: `add_assessment_lesson` (not `add_lesson`); block ops error — use question tools
- Text fields accept HTML; audio MIME: `audio/mpeg` (not `audio/mp3`); document field: `src` (not `url`)
- `fillinblank`: `{{n}}` gap markers; `matching`: MCP uses `leftIndex`/`rightIndex`, IDs injected server-side
- `AssessmentQuestion` is a discriminated union — always check `kind`

## AI Strategy

No baked-in AI in UI. Integration surface = MCP server + Claude Skills. Never add in-product "generate with AI" buttons.
MCP tools = dumb CRUD. Instructional design logic = skills/workflow docs. Skills = thinking, MCP = doing.

## TypeScript

- **Frontend** (`src/`): `strict: false`, path alias `@/*` → `./src/*`
- **MCP** (`mcp/`): `strict: true`, ES2022, NodeNext

## Environment

Supabase: **Frontend** `wlevkqlsabvmfdkphnza` (hardcoded in `src/integrations/supabase/client.ts`); **MCP** `rljldeobjtgoqttuxhsf` (env var). Google OAuth (Cloud project: `tidelearn`). Media → `course_media` bucket.

## Design System (Rockpool)

- **Accent**: `var(--accent-hex)` (#40c8a0) — `--color-teal-*` removed
- **Fonts**: DM Sans (body), Lora (display/serif)
- **Muted text**: `--text-muted: #6a7a90` (5.1:1 WCAG AA)
- **Layout vars**: `--sidebar-w-editor`, `--sidebar-w-viewer`, `--topbar-h`, `--canvas-max-w`, `--reading-max-w`, `--content-px`
- **No dark mode**; `.card-surface`, `.text-gradient` removed — do not recreate
- Brand: calm, clear, professional. Content > chrome. WCAG AA minimum.

## Visual Verification

App is auth-gated. Use **Control Chrome MCP** (already logged in as Theo):
- `mcp__Control_Chrome__get_page_content` — read DOM
- `mcp__Control_Chrome__execute_javascript` — query elements/styles
- `mcp__Control_Chrome__reload_tab` — reload after changes
- Dev server: `http://localhost:8080`

## Available Tools & MCPs

| MCP | Use for |
|-----|---------|
| `mcp__tidelearn__*` | Course/lesson/block CRUD |
| `mcp__Control_Chrome__*` | Visual verification |
| `mcp__Claude_Preview__*` | **Not useful** — hits login wall |

## Completed Phases

All audits and feature phases merged to main (A.1–A.5, Gunmetal, Phase 2A/2A+/2B, RC1–RC4, Phase 3A). See `docs/TideLearn/00-INDEX.md` for full documentation.
