# TideLearn — Project Guidelines

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [Index](00-INDEX.md) | Next: [General Vision →](01-GENERAL-VISION.md)*

---

## Why TideLearn Exists

Course authoring tools fall into two camps:

1. **Drag-and-drop builders** (Rise, Elucidat, EasyGenerator) — visual but rigid, opinionated templates, no AI integration surface.
2. **AI-native generators** (Mindsmith, CourseAU, Sana) — fast output but shallow instructional design, baked-in AI that removes author control.

TideLearn occupies the gap: a **structural authoring layer** for educators who already have AI workflows (Claude, ChatGPT, NotebookLM). The product provides the building blocks; the author (aided by AI) provides the instructional design.

---

## Founding Decisions

### 1. No Baked-In AI

TideLearn will never have "Generate with AI" buttons in the UI. The AI integration surface is the **MCP server** — Claude connects to TideLearn as a tool, not as a feature. This keeps the product simple and the author in control.

### 2. MCP = Doing, Skills = Thinking

MCP tools are dumb CRUD operations (create course, add block, save). Instructional design intelligence lives in Claude Skills and the Phase 3 workflow documents. This separation means:
- Tools don't need to be updated when pedagogical best practices evolve.
- Skills can be swapped, versioned, and shared independently.

### 3. Block-Based Architecture

Content is modelled as an ordered array of typed blocks inside lessons. This mirrors how modern editors (Notion, Gutenberg) work, and maps cleanly to SCORM packaging. 29 block types cover text, media, interactive, and knowledge-check categories.

### 4. Dual Storage

- **localStorage** for instant saves and offline capability.
- **Supabase** for cloud sync, sharing, and multi-device access.
- Google OAuth bridges both — one identity, two persistence layers.

### 5. SCORM 1.2 Export

The industry standard for LMS interoperability. TideLearn packages courses as SCORM 1.2 ZIP files so they can be uploaded to any compliant LMS (Moodle, Blackboard, Canvas, etc.).

### 6. Accessibility First

WCAG AA compliance is non-negotiable for educational software. Every component ships with semantic HTML, keyboard navigation, ARIA attributes, and sufficient colour contrast.

---

## Target Users

| Persona | Description | Primary workflow |
|---------|-------------|-----------------|
| **Course Author** | Educator or instructional designer building e-learning content | Editor → blocks → preview → SCORM export |
| **SME Reviewer** | Subject matter expert who reviews content before publishing | View mode via shared link |
| **Learner** | End user consuming the course | Viewer with progress tracking and assessments |

---

## Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React 18 + Vite | Fast dev server, SWC compilation, mature ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible primitives, design tokens |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Managed infra, RLS policies, real-time subscriptions |
| AI integration | MCP server (Node.js, stdio) | Claude-native protocol, stateless tools, no vendor lock-in |
| Export format | SCORM 1.2 via jszip | Universal LMS compatibility |
| Type safety | Zod schemas + TypeScript | Runtime validation + compile-time safety |
| Testing | Vitest | Fast, Vite-native, watch mode, coverage |
