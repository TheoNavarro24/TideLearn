# TideLearn — Block System

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Code Conventions](05-CODE-CONVENTIONS.md) | [Index](00-INDEX.md) | Next: [Assessment Engine →](07-ASSESSMENT-ENGINE.md)*

---

## Overview

Content in TideLearn is composed of **blocks** — atomic, typed content units inside lessons. The block system is the core abstraction: every piece of content (text, image, quiz, timeline, etc.) is a block with a defined schema, factory, editor form, and viewer renderer.

---

## Block Categories

### Text (8 blocks)

| Block | Icon | Purpose |
|-------|------|---------|
| `heading` | Heading | Section titles |
| `text` | Type | Rich text content (HTML) |
| `code` | Code | Syntax-highlighted code |
| `list` | List | Bulleted or numbered lists |
| `quote` | Quote | Block quotations with attribution |
| `callout` | AlertCircle | Info/success/warning/danger callouts |
| `divider` | Minus | Horizontal rule separator |
| `toc` | TableOfContents | Auto-generated table of contents |

### Media (6 blocks)

| Block | Icon | Purpose |
|-------|------|---------|
| `image` | Image | Static images with alt text |
| `video` | Video | YouTube, Vimeo, or direct mp4 |
| `audio` | Headphones | Audio files (mpeg, wav, ogg, m4a) |
| `document` | FileText | PDF, DOCX, XLSX, PPTX viewer |
| `chart` | BarChart | Bar, line, or pie charts (Recharts) |
| `embed` | Globe | iframe embeds (external content) |

### Interactive (9 blocks)

| Block | Icon | Purpose |
|-------|------|---------|
| `accordion` | ChevronDown | Expandable content sections |
| `tabs` | LayoutGrid | Tabbed content panels |
| `button` | MousePointer | CTA button with URL |
| `timeline` | Clock | Chronological events |
| `process` | GitBranch | Step-by-step processes |
| `hotspot` | Target | Image with interactive markers |
| `branching` | GitMerge | Choose-your-own-adventure paths |
| `flashcard` | Repeat | Flip card (front/back/hint) |
| `sorting` | ArrowUpDown | Categorization exercise |

### Knowledge (6 blocks)

| Block | Icon | Purpose |
|-------|------|---------|
| `quiz` | HelpCircle | Multiple choice (single answer) |
| `truefalse` | ToggleLeft | True/false questions |
| `shortanswer` | MessageSquare | Free text with accepted answers |
| `multipleresponse` | CheckSquare | Multiple choice (multiple answers) |
| `fillinblank` | TextCursor | Gap-fill with `{{n}}` markers |
| `matching` | Link | Pair matching exercise |

---

## Block Registry

The registry (`src/components/blocks/registry.ts`) is the central mapping for all block types:

```typescript
interface BlockSpec {
  type: BlockType;           // e.g., "heading", "quiz"
  icon: LucideIcon;          // Icon component
  label: string;             // Display name
  category: "text" | "media" | "interactive" | "knowledge";
  create: () => Block;       // Factory function
  EditorForm: EditorRenderer<Block>;   // Form component
  ViewRenderer: ViewRenderer<Block>;   // Display component
}
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `createBlock(type)` | Creates a default block instance with correct shape and defaults |
| `getSpec(type)` | Looks up the full BlockSpec for a given type |
| `registry` | The full array of all 29 BlockSpec objects |

---

## Block Lifecycle

### 1. Creation

```
User clicks "Add Block" → selects type → createBlock(type)
→ Factory returns default instance → Block added to lesson.blocks[]
```

### 2. Editing

```
Block selected in editor → registry.getSpec(type).EditorForm rendered
→ User edits fields → onChange propagates up → course saved
```

### 3. Viewing

```
Viewer iterates lesson.blocks → registry.getSpec(type).ViewRenderer
→ Block rendered as read-only interactive content
```

### 4. MCP Creation

```
Claude calls add_block tool → Zod validates input
→ injectSubItemIds() generates nested IDs → Block inserted at position
→ Course saved to Supabase
```

---

## Adding a New Block Type

**Checklist** (all steps are mandatory):

1. **Define the type** in `src/types/course.ts`:
   - Add to `BlockType` union
   - Create the block interface
   - Add factory function to `factories`
   - Add Zod schema to `blockSchema` discriminated union
   - Add Zod schema to `courseSchemaPermissive` (**critical — stale permissive schema causes viewer "Course not found"**)

2. **Create editor form** in `src/components/blocks/editors/`:
   - Component receives `block` and `onChange` props
   - Uses FieldLabel for all form fields

3. **Create viewer renderer** in `src/components/blocks/viewers/`:
   - Component receives `block` prop (read-only)

4. **Register in registry** (`src/components/blocks/registry.ts`):
   - Add BlockSpec entry with icon, label, category, create, EditorForm, ViewRenderer

5. **Update MCP schemas** (`mcp/src/lib/types.ts`):
   - Mirror the Zod schema from frontend

6. **If block has nested items** (like accordion, tabs, timeline):
   - Update `injectSubItemIds` in `mcp/src/tools/semantic.ts`
   - Update `renderBlock` in `mcp/src/tools/preview.ts`

7. **Update documentation**:
   - `docs/phase-3/step7-mcp-reference.md` with new schema

---

## Blocks with Nested Items

These blocks contain arrays of sub-items that need auto-generated IDs:

| Block | Sub-items | ID Field |
|-------|-----------|----------|
| `accordion` | `items[]` | `id` |
| `tabs` | `items[]` | `id` |
| `timeline` | `items[]` | `id` |
| `process` | `steps[]` | `id` |
| `hotspot` | `hotspots[]` | `id` |
| `branching` | `choices[]` | `id` |
| `sorting` | `items[]` | `id` |
| `fillinblank` | `blanks[]` | `id` (from `{{n}}` markers) |
| `matching` | `pairs[]` | `leftId`, `rightId` (from indices) |

The `injectSubItemIds()` function in `mcp/src/tools/semantic.ts` handles ID injection for all these types when blocks are created via MCP.
