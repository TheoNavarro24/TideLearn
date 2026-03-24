# TideLearn

E-learning course authoring platform. React frontend + MCP server for Claude integration + Supabase backend.

## Quick Reference

```bash
# Frontend (root)
npm run dev          # Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint

# MCP server (mcp/)
cd mcp && npm test   # 173+ Vitest tests
cd mcp && npm run build
```

## Architecture

```
src/           → React 18 + TypeScript + Vite + Tailwind + shadcn/ui
mcp/           → MCP server (Node, stdio transport, strict TS)
supabase/      → Migrations & config
```

- **19 block types** registered in `src/components/blocks/registry.ts` — each has a factory, editor form, and view renderer
- **Discriminated union lessons**: `kind: "content"` (has blocks) or `kind: "assessment"` (has questions)
- **Dual storage**: localStorage (fast) + Supabase (sync via Google OAuth)
- **SCORM 1.2 export** via jszip

### Key Files

| File | What it does |
|------|-------------|
| `src/types/course.ts` | Core types, Zod schemas, block factories |
| `src/components/blocks/registry.ts` | Block type → editor/viewer mapping |
| `mcp/src/index.ts` | MCP server entry, tool registration |
| `mcp/src/lib/types.ts` | MCP-side Zod schemas (mirrors src/types) |
| `mcp/src/resources/instructions.ts` | Full MCP documentation resource |
| `src/lib/courses.ts` | Course CRUD & localStorage |
| `src/lib/assessment.ts` | Leitner spaced repetition algorithm |

## Critical Rules

- `"schemaVersion": 1` is **required** in all course JSON
- Never include `id` fields in blocks/lessons — auto-generated
- Always `get_course` before editing — never guess IDs
- `save_course` is the correct tool (not `generate_course`)
- Quiz `correctIndex` is 0-based; factory default is `-1` (must set before publish)
- Assessment lessons use `add_assessment_lesson` — NOT `add_lesson`
- Block ops error on assessment lessons — use question tools instead
- Text fields accept HTML; callout `text` should use HTML
- Audio accepts `audio/mpeg` and `audio/wav` — not `audio/mp3`
- Document block field is `src` not `url`

## AI Strategy

No baked-in AI features in the product UI. TideLearn targets users who already have AI workflows. Integration surface = MCP server + Claude Skills. Never propose adding in-product "generate with AI" buttons.

## MCP Design Principle

Keep MCP tools dumb and structural (CRUD/persistence). Instructional design logic belongs in skills, not tools. Skills = thinking, MCP = doing.

## TypeScript

- **Frontend** (`src/`): `strict: false`, path alias `@/*` → `./src/*`
- **MCP** (`mcp/`): `strict: true`, ES2022, NodeNext modules

## Environment

Supabase project: `rljldeobjtgoqttuxhsf`. Google OAuth configured (Cloud project: `tidelearn`). Media uploads go to `course_media` bucket.

## Design System (Rockpool)

- **Body font**: DM Sans (swapped from Inter — H-6 audit fix)
- **Display font**: Lora (serif)
- **Muted text**: `--text-muted: #6a7a90` (5.1:1 contrast, WCAG AA)
- **Layout CSS vars**: `--sidebar-w-editor`, `--sidebar-w-viewer`, `--topbar-h`, `--canvas-max-w`, `--reading-max-w`, `--content-px` — defined in `:root`, use these instead of magic numbers
- **Skip-to-content link**: in `App.tsx`, targets `#main-content` (target IDs added per-page in A.2–A.5)
- **No dark mode**: `darkMode` config removed; `dark:` utilities in shadcn `ui/` are inert and left alone
- **Removed utilities**: `.card-surface`, `.text-gradient` — do not recreate

## Audit Progress

- [x] **A.1 — Cross-cutting Foundations** (merged to main)
- [x] **A.2 — Editor Overhaul** (merged to main)
- [x] **A.3 — Viewer Overhaul** (merged to main)
- [x] **A.4 — Landing Page Overhaul** (merged to main)
- [x] **A.5 — Courses Overhaul** (merged to main)

## Design Context

### Users
Course authors (educators, instructional designers) who build e-learning content and learners who consume it. Authors already have AI workflows — TideLearn is the structural layer.

### Brand Personality
**Calm, clear, professional.** Reduces cognitive load — interface stays out of the way so content shines.

### Design Principles
1. **Content is king** — Minimize chrome, maximize reading area. Typography and whitespace do the heavy lifting.
2. **Quiet confidence** — Teal palette sparingly for wayfinding. Ocean palette as accent, not flood.
3. **Accessible by default** — WCAG AA minimum. Semantic HTML, keyboard nav, proper ARIA.
4. **System consistency** — Use Rockpool tokens, Tailwind utilities, shadcn/ui. Never hard-code token values.
5. **Progressive disclosure** — Show what's needed, when it's needed. Each element earns its space.

## Hosting (planned)

Cloudflare Pages (frontend) + Fly.io (MCP server) + Supabase (stays). Domain via Porkbun, DNS via Cloudflare.
