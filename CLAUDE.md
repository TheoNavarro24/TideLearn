# TideLearn

E-learning course authoring platform. React frontend + MCP server for Claude integration + Supabase backend.

## Quick Reference

```bash
# Frontend (root)
npm run dev          # Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint

# MCP server (mcp/)
cd mcp && npm test   # 238 Vitest tests
cd mcp && npm run build
```

## Architecture

```
src/           → React 18 + TypeScript + Vite + Tailwind + shadcn/ui
mcp/           → MCP server (Node, stdio transport, strict TS)
supabase/      → Migrations & config
```

- **29 block types** registered in `src/components/blocks/registry.ts` — each has a factory, editor form, and view renderer
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

- When adding a new block type, update **both** `courseSchema` AND `courseSchemaPermissive` in `src/types/course.ts` — stale permissive schema causes viewer to silently show "Course not found"
- When adding a new block type with nested items, update `injectSubItemIds` in `mcp/src/tools/semantic.ts` and `renderBlock` in `mcp/src/tools/preview.ts`
- When adding a new block type or assessment question type, update `docs/phase-3/step7-mcp-reference.md` with the new schema
- `"schemaVersion": 1` is **required** in all course JSON
- Never include `id` fields in blocks/lessons — auto-generated
- Always `get_course` before editing — never guess IDs
- `save_course` is the correct tool (not `generate_course`)
- Quiz `correctIndex` is 0-based; factory default is `-1` (must set before publish)
- Assessment lessons use `add_assessment_lesson` — NOT `add_lesson`
- Block ops error on assessment lessons — use question tools instead
- Text fields accept HTML; callout `text` should use HTML
- Audio accepts `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/m4a`, `audio/x-m4a` — not `audio/mp3` (use `audio/mpeg`)
- Document block field is `src` not `url`
- `fillinblank` template uses `{{n}}` gap markers — blank IDs injected by `injectSubItemIds`
- `matching` pairs use `leftId`/`rightId` — MCP input uses `leftIndex`/`rightIndex`, IDs injected server-side
- `AssessmentQuestion` is now a discriminated union — always check `kind` before accessing type-specific fields
- Assessment lesson questions: MCQ, multipleresponse, fillinblank, matching, sorting — use `add_question` with correct `kind`

## AI Strategy

No baked-in AI features in the product UI. TideLearn targets users who already have AI workflows. Integration surface = MCP server + Claude Skills. Never propose adding in-product "generate with AI" buttons.

## MCP Design Principle

Keep MCP tools dumb and structural (CRUD/persistence). Instructional design logic belongs in skills, not tools. Skills = thinking, MCP = doing.

## Workflow Correction Protocol

When a workflow deviation is identified mid-session: acknowledge in one sentence → execute the corrective tool call immediately → continue. Do not produce extended analysis of the deviation before acting. "I understand what I should have done" is not the same as doing it.

## TypeScript

- **Frontend** (`src/`): `strict: false`, path alias `@/*` → `./src/*`
- **MCP** (`mcp/`): `strict: true`, ES2022, NodeNext modules

## Environment

Supabase projects: **Frontend** uses `wlevkqlsabvmfdkphnza` (in `src/integrations/supabase/client.ts`); **MCP** uses `rljldeobjtgoqttuxhsf` (env var). Google OAuth configured (Cloud project: `tidelearn`). Media uploads go to `course_media` bucket.

## Design System (Rockpool)

- **Brand accent token**: `var(--accent-hex)` (#40c8a0) — use for accent colour. `--color-teal-*` no longer exists (removed in Gunmetal overhaul).
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
- [x] **Gunmetal UI Overhaul** (merged to main) — full dark-theme Gunmetal design system: AppShell, Auth, Settings, token migration, a11y hardening
- [x] **Phase 2A — New Block Types** (merged to main) — Button/CTA, Embed, Flashcard, Timeline, Process, Chart, Sorting, Hotspot, Branching
- [x] **Phase 2A+ — MCP Cleanup** (merged to main) — Fixed sortingBlockSchema, extended injectSubItemIds for all complex blocks, added renderBlock for Phase 2A types, updated tool descriptions & instructions, fixed update_assessment_config silent no-op, added 238 MCP tests
- [x] **Phase 2B — Assessment Question Types** (merged to main) — 3 new blocks (multipleresponse, fillinblank, matching), 4 new question types (multipleresponse, fillinblank, matching, sorting), AssessmentQuestion discriminated union migration, Phase 2A validation catch-up (FieldLabel required, Zod schema tightening, hotspot MCP handoff banner)
- [x] **RC1 — Accessibility & UX Polish** (merged to main) — accessible dialogs, HotspotForm keyboard nav, aria-live quiz results, focus management on lesson nav
- [x] **RC2 — Frontend Test Suite** (merged to main) — 116 Vitest tests across 9 files (unit/component/integration), progress.ts extracted
- [x] **RC3 — Block Modernisation** (merged to main) — all block components migrated from inline hex styles to Tailwind + CSS vars; quiz semantic colour tokens added to index.css
- [x] **RC4 — Page Component Refactoring** (merged to main) — Editor/View/Courses decomposed into thin orchestrators; 11 custom hooks + 6 sub-components extracted; page files reduced from 776–873 lines to 144–380 lines
- [x] **Phase 3A — Workflow Guidance Layer** (revised, merged to main) — 9-step instructional design workflow: `docs/phase-3/phase-3-workflow.md` (master workflow + Manning skill calls), `docs/phase-3/step4-block-planning.md` (block skeleton selection), `docs/phase-3/step6-block-development.md` (per-block field + feedback rules), `docs/phase-3/step7-mcp-reference.md` (MCP schema reference). Revised after first test run: added media sourcing, approval gates, content persistence (build markdown file), correct build method (add_lesson+add_block, not generate_lesson), assessment guidance, audit re-run rules, session boundary guidance.
- [ ] **Phase 3B — WYSIWYG Editor + Inspector Drawer** (planned) — plan at `docs/superpowers/plans/2026-04-18-wysiwyg-editor.md`: WYSIWYG canvas (View components), right-side BlockInspector drawer on block click, light-theme EditorSidebar, static breadcrumb TopBar.
- [x] **Consistency Foundation** (merged to main) — `--tl-*` tokens, paper-default palette, `BlockItem` nested-button a11y fix, canvas cleanup (no duplicate header, flatter max-width, Lucide inspector icons, polished empty state), AddBlockRow token.
- [ ] **Assessment Editor WYSIWYG** (PR open) — `QuestionInspector` drawer mirrors `BlockInspector`; `QuestionCard` has WYSIWYG select affordance; `AssessmentConfigBar` replaces the full-width config form with a chip row; all inline hex / `Inter` styling replaced with tokens.

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

## Visual Verification

The app is **auth-gated** (Google OAuth). The `preview_*` tools hit a login wall and are not useful here.

**Preferred: Chrome DevTools MCP** (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`)
- `take_screenshot` — real screenshots (the key capability Control Chrome lacks)
- `take_snapshot` — DOM snapshot with element refs for clicking
- `evaluate_script` — query computed styles, measurements
- `navigate_page`, `click`, `fill`, `resize_page` — full interaction

**Fallback: Control Chrome MCP** (when chrome-devtools-mcp is not loaded)
- `mcp__Control_Chrome__get_page_content`, `execute_javascript`, `reload_tab`

Either browser session is already signed in with Theo's Google account. Dev server: `http://localhost:8080` (start with `npm run dev` if down).

### Visual comparison discipline

When comparing UI to a reference image or design, NEVER claim "this matches" without a concrete side-by-side comparison. Before any match claim:

1. **Screenshot the current state** (chrome-devtools-mcp `take_screenshot`)
2. **Open the reference image** with the Read tool
3. **List at least 5 concrete differences** — hex colors, px spacing, font weight/size, letter-spacing, alignment. Measurements, not adjectives.
4. Only after that list, propose changes or declare parity.

Words like "matches", "looks right", "close enough" are not verification — they are the failure mode. If you cannot produce the diff list, say so instead of asserting a match.

## Plan vs Execute

When the user asks for a "plan", "spec", "design", or "brainstorm": produce ONLY the written artifact. Do NOT dispatch subagents, edit source code, or start implementation until the user explicitly approves.

Before writing any plan:
- Re-read every referenced source (epub, workflow docs, reference HTML, existing plans) **in full**, not skimmed.
- If a workflow doc is referenced, restate the workflow steps at the top of the plan before proposing anything.

End every plan with: "Plan saved to `<path>`. Approve to proceed?" — then stop.

## Git Workflow

After any commit on `main` or a branch that feeds a deployed site: **push in the same turn**. Do not wait for the user to notice stale content on the live site.

Before declaring a merge or deploy complete:
- Run `git log origin/main..HEAD --oneline` (should be empty)
- If the change is user-visible on a deployed surface, verify it's actually live (curl, `gh run list`, or a real browser check)

Do not report "done" until the change is verified at its final destination.

## Available Tools & MCPs

Key MCPs available in this project — check before falling back to Bash or manual steps:

| MCP | When to use |
|-----|-------------|
| `mcp__tidelearn__*` | Course/lesson/block CRUD via the TideLearn MCP server |
| `mcp__Control_Chrome__*` | Visual verification of the auth-gated frontend |
| `mcp__Claude_Preview__*` | **Not useful here** — app requires auth, preview tools hit login wall |
| `mcp__Desktop_Commander__*` | Long-running processes, background tasks |

**Skills** — always check for a relevant skill before doing ad-hoc work:
- `/commit` — structured git commit
- `/commit-push-pr` — commit + push + open PR
- `impeccable:*` — design quality passes (polish, animate, colorize, etc.)
- `frontend-design` — high-quality UI implementation
- `superpowers:brainstorming` — before any creative/feature work
- `superpowers:writing-plans` — before multi-step implementation

## Hosting (planned)

Cloudflare Pages (frontend) + Fly.io (MCP server) + Supabase (stays). Domain via Porkbun, DNS via Cloudflare.
