# TideLearn — General Vision

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Guidelines](00-GUIDELINES.md) | [Index](00-INDEX.md) | Next: [Architecture →](02-ARCHITECTURE.md)*

---

## What Is TideLearn?

TideLearn is an **e-learning course authoring platform** that lets educators create, preview, and export structured courses. It combines a rich block-based editor with a Claude-integrated MCP server for AI-assisted course creation.

### Core Loop

```
Author → Editor (29 block types) → Preview → SCORM Export → LMS
                ↑                                    
          Claude + MCP Server                        
          (AI-assisted authoring)                    
```

---

## Product Pillars

### 1. Content Is King

The interface stays out of the way. Typography, whitespace, and layout do the heavy lifting. Chrome is minimal. Every pixel earns its place.

### 2. Structural, Not Generative

TideLearn provides the structure (blocks, lessons, courses, assessments). Authors bring the content — whether they write it themselves or use AI. No magic "generate course" buttons.

### 3. Standards-Based Export

SCORM 1.2 ensures courses work in any LMS. The internal JSON format is clean, versioned (`schemaVersion: 1`), and fully typed with Zod.

### 4. Accessible by Default

WCAG AA minimum. Semantic HTML, keyboard navigation, ARIA attributes, focus management, sufficient contrast. Education must be inclusive.

---

## Feature Overview

### Editor

- **29 block types** across 4 categories: Text, Media, Interactive, Knowledge
- Drag-and-drop reordering (dnd-kit)
- Rich text editing (TipTap)
- Resizable sidebar with lesson tree
- Real-time preview

### Assessment Engine

- **5 question types**: MCQ, Multiple Response, Fill-in-the-Blank, Matching, Sorting
- Leitner spaced repetition algorithm
- Configurable passing scores and exam size
- Immediate feedback with explanations

### Viewer

- Clean reading experience with progress tracking
- Responsive layout (mobile + desktop)
- Assessment mode with scoring
- Bottom navigation for mobile

### MCP Server

- 33 tools for course CRUD, lesson management, block operations, assessment handling, media upload
- Stateless, stdio transport
- Full Zod validation on all inputs
- Instructions resource for Claude context

### Export

- SCORM 1.2 ZIP packaging
- Course sharing via URL
- JSON import/export

### Authentication

- Google OAuth via Supabase Auth
- Protected routes for editor, courses, settings
- Public view mode for shared courses

---

## Business Model

TideLearn is currently a **free, open-source tool**. The planned monetization path involves:
- **Hosted MCP server** with OAuth 2.0 authentication (post-domain)
- Premium features around collaboration and team management
- Enterprise SCORM export customization

---

## Competitive Landscape

Based on comparative analysis of 7 platforms (docs/analysis/):

| Platform | Strengths | TideLearn Differentiator |
|----------|-----------|------------------------|
| Rise (Articulate) | Polish, templates | MCP integration, open format |
| EasyGenerator | Simplicity | Assessment depth, block variety |
| Elucidat | Enterprise features | Lightweight, developer-friendly |
| Mindsmith | AI generation | Author control, no baked-in AI |
| CourseAU | Speed | Instructional design workflow |
| Sana | Modern UI | SCORM export, offline support |
