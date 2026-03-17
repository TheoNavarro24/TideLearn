# 01 — Project Overview

## What this app does
`rise-on-go` is a browser-based course authoring + playback tool:
- **Authoring**: create/edit courses in `/editor` with block-based lessons.
- **Catalog**: manage local courses in `/courses` (create, rename, duplicate, delete, import/export JSON).
- **Playback**: render compressed course payloads in `/view#<hash>`.
- **Auth**: Supabase auth session wrapper for gated app areas.

## Stack
- Vite + React + TypeScript app.
- Tailwind + shadcn/ui component library.
- Supabase JS client for auth.
- Supabase Edge Functions (Deno) for link/compression endpoints.
- `lz-string` for hash-based course sharing.

## Runtime shape
- Main router defines routes: `/`, `/auth`, `/courses`, `/editor`, `/view`, `*` fallback.
- App providers include React Query, tooltip provider, auth provider, and toast layers.

## Core product behavior
- Course editing is heavily local-first (`localStorage`) with autosave.
- Course sharing uses compressed JSON stored in URL hash.
- Playback (`/view`) validates decoded content against Zod schema before rendering.
- SCORM/static export logic exists in frontend utility layer and is invoked from editor actions.

## Porting priorities
1. Preserve course schema compatibility (`schemaVersion: 1`).
2. Preserve URL/hash contract for `/view` and deep-link intent handling.
3. Preserve local storage keys where practical to avoid data loss for existing users.
4. Keep Supabase edge contracts aligned with frontend callers.
