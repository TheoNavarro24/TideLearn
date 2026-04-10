# TideLearn — Architecture

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← General Vision](01-GENERAL-VISION.md) | [Index](00-INDEX.md) | Next: [Data Model →](03-DATA-MODEL.md)*

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite | SPA with SWC compilation |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui | Utility-first + accessible primitives |
| **State** | React Query (TanStack) | Server state management |
| **Forms** | React Hook Form + Zod | Form handling + runtime validation |
| **Rich Text** | TipTap (ProseMirror) | Block-level text editing |
| **Drag & Drop** | dnd-kit | Block and lesson reordering |
| **Routing** | React Router v6 | Client-side navigation |
| **Charts** | Recharts | Data visualization blocks |
| **Auth** | Supabase Auth (Google OAuth) | Identity management |
| **Database** | Supabase (PostgreSQL) | Cloud persistence + RLS |
| **Storage** | Supabase Storage | Media files (course-media bucket) |
| **MCP Server** | Node.js + TypeScript (strict) | Claude integration layer |
| **Export** | jszip + lz-string | SCORM 1.2 packaging |
| **Testing** | Vitest + Testing Library | Unit, component, integration tests |

---

## Project Structure

```
TideLearn/
├── src/                          → Frontend application
│   ├── App.tsx                   → Route definitions, providers, skip-to-content
│   ├── main.tsx                  → React entry point
│   ├── index.css                 → Global styles, CSS custom properties (Rockpool)
│   ├── types/
│   │   └── course.ts             → Core types, Zod schemas, block factories
│   ├── pages/
│   │   ├── Index.tsx             → Landing page
│   │   ├── Auth.tsx              → Google OAuth login
│   │   ├── Courses.tsx           → Course library (thin orchestrator)
│   │   ├── Editor.tsx            → Course editor (thin orchestrator)
│   │   ├── View.tsx              → Learner viewer
│   │   ├── Settings.tsx          → Account settings
│   │   ├── Changelog.tsx         → Release history
│   │   └── NotFound.tsx          → 404
│   ├── components/
│   │   ├── blocks/
│   │   │   ├── registry.ts       → Block type → editor/viewer mapping
│   │   │   ├── editors/          → Block editor forms (HeadingForm, QuizForm, etc.)
│   │   │   └── viewers/          → Block view renderers (HeadingView, QuizView, etc.)
│   │   ├── editor/               → Editor sub-components (sidebar, topbar, etc.)
│   │   ├── viewer/               → Viewer sub-components (sidebar, bottom nav, etc.)
│   │   ├── courses/              → Course list components (CourseCard, etc.)
│   │   └── ui/                   → shadcn/ui primitives (DO NOT MODIFY)
│   ├── hooks/                    → 11 custom hooks (extracted in RC4)
│   ├── lib/
│   │   ├── courses.ts            → Course CRUD + localStorage + Supabase sync
│   │   ├── assessment.ts         → Leitner spaced repetition algorithm
│   │   ├── progress.ts           → Learner progress tracking
│   │   └── utils.ts              → cn() and shared utilities
│   └── integrations/
│       └── supabase/
│           ├── client.ts         → Supabase JS client (project: wlevkqlsabvmfdkphnza)
│           └── types.ts          → Auto-generated DB types
├── mcp/                          → MCP server (separate TypeScript project)
│   ├── src/
│   │   ├── index.ts              → Server entry, tool registration, stdio transport
│   │   ├── lib/
│   │   │   └── types.ts          → MCP-side Zod schemas (mirrors src/types)
│   │   ├── tools/
│   │   │   ├── semantic.ts       → injectSubItemIds, review_course
│   │   │   └── preview.ts        → renderBlock (HTML generation)
│   │   └── resources/
│   │       └── instructions.ts   → Full MCP documentation resource
│   ├── tests/                    → 238 Vitest tests
│   ├── tsconfig.json             → strict: true, ES2022, NodeNext
│   └── package.json              → Separate dependency tree
├── supabase/
│   ├── config.toml               → Supabase CLI config (project: rljldeobjtgoqttuxhsf)
│   └── migrations/               → SQL migration files
├── docs/                         → Project documentation
│   ├── TideLearn/                → Main documentation (this folder)
│   ├── phase-3/                  → Instructional design workflow
│   ├── superpowers/              → Planning documents (active + archived)
│   └── analysis/                 → Competitive analysis
└── public/                       → Static assets
```

---

## Data Flow

### 1. Author Flow (Editor)

```
User action → React component → Hook (useEditor, useLessons, etc.)
    → courses.ts (CRUD) → localStorage (immediate)
                         → Supabase (async sync)
```

### 2. AI-Assisted Flow (MCP)

```
Claude → MCP Server (stdio) → Tool handler
    → Zod validation → Supabase (direct)
    → Response to Claude
```

### 3. Learner Flow (Viewer)

```
URL with courseId → courses.ts (fetch) → View.tsx
    → Block renderers (registry lookup) → Progress tracking
    → Assessment scoring (Leitner algorithm)
```

### 4. Export Flow (SCORM)

```
Course JSON → SCORM manifest (imsmanifest.xml)
    → HTML wrapper → jszip → ZIP download
```

---

## Route Map

| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/` | Index | Public | Landing page |
| `/auth` | Auth | Public | Google OAuth login |
| `/courses` | Courses | Protected | Course library |
| `/editor` | Editor | Protected | Block-based course editor |
| `/view` | View | Public* | Learner viewer (*auth for own courses) |
| `/settings` | Settings | Protected | Account management |
| `/changelog` | Changelog | Protected | Release history |
| `*` | NotFound | — | 404 catch-all |

---

## Two Supabase Projects

TideLearn uses two separate Supabase projects for separation of concerns:

| Project | ID | Used By | Purpose |
|---------|-----|---------|---------|
| **Frontend** | `wlevkqlsabvmfdkphnza` | React app (`src/integrations/supabase/client.ts`) | User auth, course storage, media uploads |
| **MCP** | `rljldeobjtgoqttuxhsf` | MCP server (env var) | Claude-driven course operations |

---

## Environment Variables

### Frontend

Hardcoded in `src/integrations/supabase/client.ts`:
- `SUPABASE_URL` — `https://wlevkqlsabvmfdkphnza.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` — Public anon key

### MCP Server

Set via environment:
- `SUPABASE_URL` — MCP Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for server-side operations

---

## Deployment (Planned)

| Component | Platform | Status |
|-----------|----------|--------|
| Frontend | Cloudflare Pages | Planned |
| MCP Server | Fly.io | Planned |
| Database | Supabase (stays) | Active |
| Domain | Porkbun | Planned |
| DNS | Cloudflare | Planned |

### Future: Hosted MCP with OAuth

Plan D (`docs/superpowers/plans/post-domain-plan-d-mcp-hosted-auth.md`):
- Replace local stdio transport with SSE (Server-Sent Events)
- OAuth 2.0 PKCE authentication flow
- `mcp_sessions` table in Supabase
- Hono web framework for HTTP endpoints
- AsyncLocalStorage for request-scoped user context
- Stdio entry point preserved for local development

---

## Performance Considerations

- **Vite dev server** on port 8080 with HMR
- **localStorage** for instant saves (no network round-trip)
- **React Query** for server state caching and deduplication
- **Code splitting** via React.lazy for page-level components
- **Tailwind purge** in production builds
- **jszip** streaming for large SCORM exports
