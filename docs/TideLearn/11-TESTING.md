# TideLearn — Testing

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← SCORM Export](10-SCORM-EXPORT.md) | [Index](00-INDEX.md) | Next: [Deployment →](12-DEPLOYMENT.md)*

---

## Overview

TideLearn uses **Vitest** for all testing — both frontend and MCP server. The testing strategy prioritizes coverage of critical paths: block system, assessment logic, MCP tools, and course CRUD.

---

## Test Suites

### Frontend Tests (116 tests)

Location: `src/` (co-located with source files)

```bash
npm test              # Watch mode
npm run test:coverage # Coverage report
```

Coverage across 9 test files:
- Unit tests for utilities, progress tracking, assessment logic
- Component tests for block editors and viewers
- Integration tests for course CRUD operations

### MCP Server Tests (238 tests)

Location: `mcp/tests/`

```bash
cd mcp && npm test
```

Coverage:
- All 33 tool operations
- Zod schema validation (valid and invalid inputs)
- `injectSubItemIds` for all block types with nested items
- `renderBlock` for all 29 block types
- Error handling and edge cases

---

## Testing Strategy

### What to Test

| Priority | Area | Examples |
|----------|------|---------|
| **Critical** | Assessment logic | Leitner algorithm, scoring, question validation |
| **Critical** | MCP tool operations | CRUD for courses, lessons, blocks, questions |
| **Critical** | Zod schemas | Both strict and permissive validation |
| **High** | Block factories | Default values, required fields |
| **High** | Course CRUD | Create, read, update, delete, localStorage sync |
| **Medium** | Block editors | Form field rendering, onChange propagation |
| **Medium** | Block viewers | Correct rendering of block content |
| **Low** | UI components | shadcn/ui primitives (already tested upstream) |

### What NOT to Test

- shadcn/ui primitives (tested by the library)
- Supabase client internals (tested by Supabase)
- React Router navigation (integration-level, covered by e2e)
- Styling/CSS (visual verification via Control Chrome MCP)

---

## MCP Stress Playbook

Location: `docs/testing/mcp-stress-playbook.md`

6 comprehensive scenarios for end-to-end MCP validation:

| Scenario | What It Tests |
|----------|--------------|
| **1. Auth Flow** | Login, logout, session recovery |
| **2. Course Scaffold** | Create, list, get, add lessons |
| **3. All Block Types** | Create each of the 29 block types individually |
| **4. Mega-Course** | `save_course` with 2 content + 1 assessment lesson |
| **5. Assessment Lesson** | All 5 question types (MCQ, multipleresponse, fillinblank, matching, sorting) |
| **6. Media Upload** | Upload and link media files |

---

## Running Tests

### Full Suite

```bash
# Frontend
npm test

# MCP
cd mcp && npm test

# Coverage (frontend)
npm run test:coverage

# Coverage (MCP)
cd mcp && npx vitest run --coverage
```

### Single File

```bash
# Frontend
npx vitest run src/lib/assessment.test.ts

# MCP
cd mcp && npx vitest run tests/tools/blocks.test.ts
```

---

## Test Conventions

- Co-locate test files with source: `foo.ts` → `foo.test.ts`
- Use descriptive `describe`/`it` blocks
- Test both valid and invalid inputs for Zod schemas
- Mock Supabase client for unit tests (not for integration tests)
- Use `beforeEach` for test isolation
- No snapshot tests (brittle with frequent UI changes)
