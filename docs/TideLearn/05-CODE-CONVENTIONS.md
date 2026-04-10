# TideLearn — Code Conventions

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Authentication](04-AUTHENTICATION-AUTHORIZATION.md) | [Index](00-INDEX.md) | Next: [Block System →](06-BLOCK-SYSTEM.md)*

---

## Language Rules

| Context | Language |
|---------|----------|
| Code, variables, functions | English |
| Database columns, tables | English (snake_case) |
| Git commits | English |
| Documentation | English |
| UI strings | English |
| Comments | English |

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `CourseCard.tsx` |
| Files (utilities) | camelCase | `courses.ts` |
| Files (hooks) | camelCase with `use` prefix | `useEditor.ts` |
| React components | PascalCase | `HeadingForm`, `QuizView` |
| Functions | camelCase | `createBlock()`, `getSpec()` |
| Variables | camelCase | `courseData`, `blockType` |
| Constants | UPPER_SNAKE_CASE | `SCHEMA_VERSION` |
| Types/Interfaces | PascalCase | `ContentLesson`, `BlockSpec` |
| Enums | PascalCase (type + values) | `BlockType`, `"heading"` |
| CSS custom properties | kebab-case | `--accent-hex`, `--topbar-h` |
| Database tables | snake_case | `courses`, `course_media` |
| Database columns | snake_case | `user_id`, `created_at` |
| URL slugs | kebab-case | `/courses`, `/changelog` |

---

## TypeScript Configuration

### Frontend (`src/`)

```json
{
  "strict": false,
  "paths": { "@/*": ["./src/*"] }
}
```

- Path alias `@/` resolves to `src/`
- Strict mode is off (legacy decision)
- Use `@/` imports everywhere: `import { Button } from "@/components/ui/button"`

### MCP Server (`mcp/`)

```json
{
  "strict": true,
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext"
}
```

- Strict mode is ON — no `any`, no implicit types
- ES2022 target for modern Node.js features
- NodeNext module resolution for ESM

---

## Component Structure

### Page Components (Thin Orchestrators)

After RC4 refactoring, page components are thin orchestrators that compose hooks and sub-components:

```typescript
// Pattern: pages delegate logic to hooks, render sub-components
export default function Editor() {
  const { course, lessons, ... } = useEditor();
  const { selectedLesson, ... } = useLessonSelection();

  return (
    <div>
      <EditorTopBar ... />
      <EditorSidebar ... />
      <EditorCanvas ... />
    </div>
  );
}
```

### Block Components (Editor + Viewer)

Each block type has two components:

```
src/components/blocks/
├── editors/
│   ├── HeadingForm.tsx      → Renders form fields for editing
│   └── QuizForm.tsx
└── viewers/
    ├── HeadingView.tsx      → Renders block content for learners
    └── QuizView.tsx
```

Both are registered in `registry.ts` and looked up by block type at runtime.

---

## Validation Rules

- **Zod** for all runtime validation (course schemas, MCP tool inputs)
- **TypeScript** for compile-time type safety
- **Two schema levels**: `courseSchema` (strict) and `courseSchemaPermissive` (viewer)
- Always validate at system boundaries (MCP input, Supabase responses)
- Trust internal code and framework guarantees

---

## Import Organization

```typescript
// 1. React/framework
import { useState, useEffect } from "react";

// 2. Third-party libraries
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

// 3. Internal (using @/ alias)
import { Button } from "@/components/ui/button";
import { createBlock } from "@/types/course";
import { useLessons } from "@/hooks/useLessons";
```

---

## shadcn/ui Rules

- Components in `src/components/ui/` are **shadcn/ui primitives — DO NOT MODIFY**
- Create wrapper components in `src/components/` for custom behavior
- Use built-in variants before custom styles
- Use semantic colors (`bg-primary`, not `bg-blue-500`)
- Use `cn()` from `@/lib/utils` for conditional class merging

---

## Git Conventions

- **Commit messages**: Conventional commits format (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `design:`)
- **Branch naming**: `feature/description`, `fix/description`, `audit/description`
- **PR size**: Prefer focused PRs; bundled PRs acceptable for refactors
- **No force push to main/master**
