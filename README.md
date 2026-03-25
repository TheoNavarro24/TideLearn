# TideLearn

E-learning course authoring platform — React frontend, MCP server for Claude integration, Supabase backend.

## What It Does

- **29 block types** for rich content (text, headings, images, video, code, quotes, callouts, accordion, tabs, timeline, process, chart, sorting, hotspot, branching, and more)
- **7 question types** for assessment (MCQ, true/false, short answer, multiple response, fill-in-the-blank, matching, sorting)
- **SCORM 1.2 export** via JSZip for LMS compatibility
- **Cloud sync** with Supabase + Google OAuth
- **MCP integration surface** for Claude-powered workflows

## Quick Start

**Frontend:**
```bash
npm install
npm run dev          # Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
```

**MCP Server:**
```bash
cd mcp
npm install
npm run build
npm test            # 238 Vitest tests
```

## Architecture

| Directory | Purpose |
|-----------|---------|
| `src/` | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| `mcp/` | MCP server (Node, stdio transport, strict TypeScript) |
| `supabase/` | Migrations and Postgres configuration |

## Key Files

| File | Purpose |
|------|---------|
| `src/types/course.ts` | Core types, Zod schemas, block factories |
| `src/components/blocks/registry.ts` | Block type registry (29 types) |
| `src/lib/courses.ts` | Course CRUD and localStorage |
| `src/lib/assessment.ts` | Leitner spaced repetition algorithm |
| `src/lib/scorm12.ts` | SCORM 1.2 export |
| `mcp/src/index.ts` | MCP server entry and tool registration |
| `mcp/src/resources/instructions.ts` | Full MCP documentation |

## MCP Server

33 tools across 8 modules:

- **Course Management** — create, read, update, delete, list, review
- **Lesson Operations** — add, update, delete, reorder
- **Block Operations** — add, update, move, delete across content lessons
- **Assessment Tools** — add/update/delete assessment lessons, import/replace questions
- **Question Bank** — add, update, delete individual questions
- **Course Preview & Export** — preview HTML, SCORM 1.2 export
- **Semantic Analysis** — review_course (gaps, coverage, reading time)
- **Media Upload** — upload_media to course storage

## Environment Variables

**Frontend** (`.env.local`):
```
VITE_SUPABASE_URL=https://wlevkqlsabvmfdkphnza.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**MCP Server**:
```
SUPABASE_URL=https://rljldeobjtgoqttuxhsf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Design System

**Rockpool** design system with **Gunmetal** palette:

- **Body font:** DM Sans
- **Display font:** Lora (serif)
- **Brand accent:** `var(--accent-hex)` (#40c8a0)
- **Muted text:** `--text-muted: #6a7a90` (WCAG AA contrast)
- **Layout tokens:** `--sidebar-w-editor`, `--sidebar-w-viewer`, `--topbar-h`, `--canvas-max-w`, `--reading-max-w`, `--content-px`

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **State & Data:** TanStack Query, Zod validation
- **Rich Text:** Tiptap editor
- **Drag & Drop:** DnD Kit
- **Backend:** Supabase (PostgreSQL), Google OAuth
- **Export:** JSZip (SCORM 1.2)
