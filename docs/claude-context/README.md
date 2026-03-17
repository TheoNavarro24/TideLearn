# Claude Code Context Pack: rise-on-go

Use the files in this folder as seed context when asking Claude Code to port or continue this project.

## Suggested upload/order
1. `01-project-overview.md`
2. `02-architecture-map.md`
3. `03-data-model-and-flow.md`
4. `04-porting-risks-checklist.md`

## Suggested bootstrap prompt

```text
You are taking over the `rise-on-go` project. Use the provided context docs as source-of-truth.

Goals:
1) Preserve current UX and behavior.
2) Keep TypeScript strict enough to avoid regressions.
3) Keep Supabase Edge Functions compatible.
4) Call out any behavior mismatches before changing APIs.

Before coding:
- Restate architecture and critical flows in your own words.
- List ambiguous areas that need repository verification.
- Propose a minimal migration plan with checkpoints.
```
