# AGENTS.md

## Scope
Instructions apply to the entire repository unless a nested `AGENTS.md` overrides them.

## Environment
- Use **Node 18+** with **npm**.
- Project stack: **Vite**, **React**, **TypeScript**, **Tailwind**, **shadcn/ui**, **Supabase Edge Functions**, and the **lovable-tagger** plugin.
- Import code using the `@/` alias for `src`.

## Coding Conventions
- Write React components in TypeScript and prefer functional components.
- Tailwind CSS utility classes are expected; combine classes with `cn` from `src/lib/utils.ts`.
- Do not hand-edit generated files such as `src/integrations/supabase/types.ts`; regenerate them via the Supabase CLI when the database schema changes.
- For files under `supabase/functions/**`, use Deno: run `deno fmt` and `deno lint` after edits.

## Validation / Checks
- Run `npm run lint` and ensure it passes.
- Run `npm run build` to confirm the app compiles.
- For Supabase Edge functions: `deno fmt supabase/functions/*/*.ts` and `deno lint supabase/functions`.
- If the OpenAPI spec (`openapi/actions.v1.yaml`) changes, keep it valid and in sync with the functions.

## Tooling & Search
- Prefer `rg` (ripgrep) over `grep -R` for searching.
- When adding or renaming components, run `npm run dev` (or `npx lovable-tagger`) once so Lovable's component tagging updates.

## Commit & PR Workflow
- Keep commits focused and descriptive; ensure the worktree is clean before committing.
- After all required checks pass, call the `make_pr` tool with a concise title and body.
- PR bodies should cite relevant files/lines and reference outputs from lint/build commands.

## Secrets
- Store credentials (Supabase keys, etc.) in `.env` and never commit them.
