# 02 — Architecture Map

## Frontend entry and routing
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: wraps providers and route table.
- Routes:
  - `/` -> landing page
  - `/auth` -> auth page
  - `/courses` -> local course library
  - `/editor` -> authoring UI
  - `/view` -> runtime player

## Feature modules

### Auth
- `src/components/auth/AuthContext.tsx`
  - Subscribes to Supabase auth state.
  - Exposes `{ user, session, loading, signOut }`.
  - `signOut` aggressively clears auth-related localStorage keys and redirects to `/auth`.

### Course persistence
- `src/lib/courses.ts`
  - Canonical storage keys:
    - `courses:index`
    - `course:<id>`
    - legacy `editor:course`
  - Handles CRUD, duplication, rename, legacy migration.

### Editor
- `src/pages/Editor.tsx`
  - Loads course from `courseId` query param or legacy autosave.
  - Autosaves on debounce.
  - Supports adding/reordering/deleting lessons and blocks.
  - Builds publish URL as `/view#<compressedCourse>`.
  - Includes import/export and SCORM/static export actions.

### Player
- `src/pages/View.tsx`
  - Decodes `window.location.hash` via `lz-string`.
  - Validates with `courseSchema` before rendering.
  - Tracks progress/quiz state in localStorage.
  - Contains parent-frame messaging hooks (`ready`, `resume`, `progress`) for LMS/SCORM bridge.

### Blocks system
- `src/types/course.ts`: discriminated union for all block types and Zod schemas.
- `src/components/blocks/registry.ts`: maps block type -> editor/view components + labels/icons/default creation.
- `src/components/blocks/editor/*` and `src/components/blocks/view/*`: per-block implementation.

## Backend (Supabase Edge Functions)
- `supabase/functions/compress/index.ts`
  - Validates course payload, compresses JSON, returns `{ shareUrl, hash }`.
- `supabase/functions/links/index.ts`
  - Stores payload in Deno KV, returns resolve URL token.

## Config and build
- `vite.config.ts`: includes `lovable-tagger` in development mode + `@` alias.
- `tsconfig*.json`: relaxed strictness flags currently enabled.
- `supabase/config.toml`: project id only, minimal local config.
