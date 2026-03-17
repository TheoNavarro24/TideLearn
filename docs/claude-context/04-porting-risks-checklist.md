# 04 — Porting Risks & Checklist

## Known risk areas
1. **OpenAPI spec drift**
   - `openapi/actions.v1.yaml` response/request shapes differ from live edge function implementations.
   - If Claude uses OpenAPI as truth, behavior can regress unless reconciled first.

2. **Duplicate / overlapping intent hooks**
   - Both `src/hooks/useDeepLinkIntents.ts` and `src/hooks/use-deep-link-intents.ts` exist with different behaviors.
   - Ensure imports resolve to intended implementation during migration.

3. **LocalStorage key stability**
   - Existing users may have data under legacy and current keys.
   - Changing keys without migration path can appear as data loss.

4. **Schema-driven rendering dependencies**
   - View/editor rely on block discriminators and registry mappings.
   - Adding/removing block types requires synchronized updates in type schema + registry + renderer/editor components.

5. **Auth signout behavior**
   - Signout currently clears multiple auth-related local keys and hard redirects.
   - Refactors to cleaner hooks may accidentally change logout semantics.

## Migration checklist for Claude Code
- [ ] Confirm node/npm toolchain and install succeeds.
- [ ] Run lint + build and capture baseline output.
- [ ] Reconcile OpenAPI spec against edge functions before client generation.
- [ ] Verify deep-link intent flow (hash parsing, versioning, post-consume cleanup).
- [ ] Verify editor autosave and course CRUD persistence.
- [ ] Verify `/view` hash decode + Zod validation + progress persistence.
- [ ] Verify Supabase auth session bootstrap and signout path.
- [ ] If touching edge functions, run `deno fmt` + `deno lint` on `supabase/functions`.

## Helpful “first prompt” for Claude
```text
Audit this repository for migration readiness.
1) Build a behavior map for editor/course/view/auth flows.
2) Identify API/spec mismatches and propose exact fixes.
3) List any compatibility-sensitive contracts (localStorage keys, URL formats, schema literals).
4) Suggest the smallest safe sequence of PRs to port without regressions.
```
