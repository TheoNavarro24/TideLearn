# TideLearn — MCP Server

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Assessment Engine](07-ASSESSMENT-ENGINE.md) | [Index](00-INDEX.md) | Next: [Design System →](09-DESIGN-SYSTEM.md)*

---

## Overview

TideLearn exposes a **Model Context Protocol (MCP) server** that lets Claude create, edit, and manage courses programmatically. The server is a separate Node.js TypeScript project in the `mcp/` directory.

---

## Design Principles

### MCP = Doing, Skills = Thinking

MCP tools are **dumb, structural CRUD operations**. They persist data, validate schemas, and inject IDs. They do NOT make instructional design decisions.

Instructional design intelligence lives in:
- **Claude Skills** — Reusable knowledge about pedagogy and content patterns
- **Phase 3 Workflow** — 9-step process in `docs/phase-3/phase-3-workflow.md`

This separation means tools don't need updating when pedagogical best practices evolve.

### Stateless Tools

Each tool call is independent. The server maintains no state between calls. Course data lives in Supabase — every tool reads the latest state before operating.

---

## Transport

Currently: **stdio** (standard input/output) — the MCP server runs as a subprocess of Claude Code.

```
Claude Code → spawns → MCP server process
            → sends JSON-RPC messages via stdin
            ← receives responses via stdout
```

Future (Plan D): **SSE** (Server-Sent Events) over HTTP with OAuth 2.0 PKCE authentication.

---

## Tool Registry

33 tools organized into 8 modules:

### Auth Tools
| Tool | Purpose |
|------|---------|
| `authenticate` | Authenticate user via Google OAuth |

### Course Tools
| Tool | Purpose |
|------|---------|
| `create_course` | Create a new empty course |
| `get_course` | Fetch a course by ID (**always call before editing**) |
| `list_courses` | List all user courses |
| `save_course` | Save/overwrite entire course JSON |
| `delete_course` | Delete a course |
| `review_course` | Analyze course (reading time, coverage) |
| `export_course` | Export as SCORM or JSON |
| `import_course` | Import from JSON |

### Lesson Tools
| Tool | Purpose |
|------|---------|
| `add_lesson` | Add a content lesson (`kind: "content"`) |
| `update_lesson` | Update lesson title |
| `delete_lesson` | Remove a lesson |
| `reorder_lessons` | Change lesson order |

### Block Tools
| Tool | Purpose |
|------|---------|
| `add_block` | Add a block to a content lesson |
| `update_block` | Update block fields |
| `move_block` | Change block position |
| `delete_block` | Remove a block |

### Assessment Tools
| Tool | Purpose |
|------|---------|
| `add_assessment_lesson` | Add an assessment lesson (`kind: "assessment"`) |
| `update_assessment_config` | Change passing score / exam size |

### Question Tools
| Tool | Purpose |
|------|---------|
| `add_question` | Add a question (specify `kind`) |
| `update_question` | Update question fields |
| `delete_question` | Remove a question |
| `replace_questions` | Replace all questions at once |

### Preview Tools
| Tool | Purpose |
|------|---------|
| `preview_snapshot` | Generate HTML preview of a lesson |
| `preview_screenshot` | Generate PNG screenshot |
| `preview_inspect` | Inspect specific elements |

### Media Tools
| Tool | Purpose |
|------|---------|
| `upload_media` | Upload file to Supabase course-media bucket |

---

## Resources

The server exposes one resource:

```
URI: tidelearn://instructions
```

This contains the full MCP documentation — block schemas, tool reference, workflows, and rules. Claude loads this resource for context when working with TideLearn.

---

## Key Rules for Tool Usage

1. **Always `get_course` before editing** — never guess IDs
2. **`save_course`** is the correct tool for saving (not `generate_course`)
3. **Never include `id` fields** in blocks/lessons — auto-generated
4. **`schemaVersion: 1`** is required in all course JSON
5. **Block ops error on assessment lessons** — use question tools instead
6. **`add_assessment_lesson`** for assessment lessons — NOT `add_lesson`
7. **Text fields accept HTML** — callout `text` should use HTML
8. **Audio MIME**: `audio/mpeg` (not `audio/mp3`)
9. **Document field**: `src` (not `url`)
10. **Quiz `correctIndex`**: 0-based; factory default is `-1` (must set before publish)
11. **Position**: 1-based, optional (omit to append)

---

## Validation Pipeline

```
Tool call → Zod schema validation → Business logic check
    → injectSubItemIds() (for nested items)
    → Supabase persistence → Response
```

All tool inputs are validated with strict Zod schemas defined in `mcp/src/lib/types.ts`. These mirror the frontend schemas in `src/types/course.ts`.

---

## Testing

**238 Vitest tests** in `mcp/tests/` covering:
- All tool operations (CRUD for courses, lessons, blocks, questions)
- Validation edge cases
- ID injection (injectSubItemIds)
- Preview rendering (renderBlock)
- Error handling

Run tests:
```bash
cd mcp && npm test
```

---

## File Structure

```
mcp/
├── src/
│   ├── index.ts              → Server entry, tool registration
│   ├── lib/
│   │   └── types.ts          → Zod schemas (mirrors frontend)
│   ├── tools/
│   │   ├── semantic.ts       → injectSubItemIds, review_course
│   │   └── preview.ts        → renderBlock (HTML generation)
│   └── resources/
│       └── instructions.ts   → Full documentation resource
├── tests/                    → 238 Vitest tests
├── tsconfig.json             → strict: true, ES2022, NodeNext
└── package.json              → Separate dependency tree
```
