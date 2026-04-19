# Non-Editor Surface Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prereq:** Consistency Foundation plan (`docs/superpowers/plans/2026-04-18-1-consistency-foundation.md`) **must** be merged first — this plan consumes the paper-default palette, and Task 3 (NavItem hover) uses `hover:bg-black/[0.04]` which only reads correctly on the paper sidebar (not on the previous dark gunmetal).

**File overlap with sibling plans (merge-conflict risk):**
- `src/components/AppShell.tsx` — Consistency Foundation edits line 44 (wordmark colour). This plan (Task 3) edits the `NavItem` function around line 134-148. Different regions; no conflict.
- No shared files with Assessment WYSIWYG plan.

Can run in parallel with Assessment WYSIWYG. Rebase on Consistency Foundation when it lands.

**Goal:** Close the remaining visual gaps on non-editor surfaces: consolidate the two competing "create course" affordances on the Courses page, tokenise the hard-coded `CourseCard` gradient covers, add a subtle hover state to the dark-sidebar `NavItem`, and migrate the last stray `text-slate-*` utilities in `View.tsx` to tokens.

**Architecture:**
- Each task is independent and touches a single file.
- No new components, no new tests — purely polish edits.
- Small PR (~4 commits) that cleans up what's left after the foundation and assessment plans land.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS custom properties

---

## Gap Summary

| Area | Gap | Severity |
|------|-----|----------|
| `Courses.tsx` | Two "create course" affordances visible at once: a `+ New Course` button in the top bar (silently creates with empty title) AND a `Name your new course…` input row. Easy to click the wrong one. | Medium |
| `CourseCard.tsx` | Hard-coded gradient cover pairs (`["#2d3a4a", "#3a4d60"]`, etc.) — not token-driven; reads inconsistently against the paper-default palette. | Low |
| `AppShell.tsx` | Dark-sidebar `NavItem` has no hover background — inactive items feel flat. | Low |
| `View.tsx` | A couple of raw `text-slate-400` utilities remain where tokens would be cleaner. | Low |

---

## File Structure

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Courses.tsx` | Top-bar `+ New Course` focuses the input instead of silently creating; `onCreate` short-circuits when title is blank. |
| `src/pages/CourseCard.tsx` | Replace hard-coded gradient pairs with a single token-driven fallback; reassess initial-letter text colour. |
| `src/components/AppShell.tsx` | Dark `NavItem` gains `hover:bg-white/[0.04]` on the inactive path. |
| `src/pages/View.tsx` | `text-slate-400` → `text-[var(--text-muted)]` (keep dark learner shell otherwise). |

---

## Task 1 — Consolidate Courses create-flow

Currently `Courses.tsx` has two create affordances: a `+ New Course` button in the top bar that calls `onCreate` directly (which creates with whatever `newTitle` state is, including empty), and a dedicated `Name your new course and press Enter…` input row. Disambiguate: keep the input as the primary affordance; make the top-bar button a "jump to input" focus trigger; guard `onCreate` against empty titles.

**Files:**
- Modify: `src/pages/Courses.tsx`

- [ ] **Step 1: Top-bar button focuses the input instead of creating**

Around line 85 in `src/pages/Courses.tsx`:

```tsx
// before
onClick={onCreate}

// after
onClick={() => newCourseInputRef.current?.focus()}
```

(Ensure the existing `newCourseInputRef` is reachable from this scope. If not, hoist the ref to the component's top-level or pass it down.)

- [ ] **Step 2: Guard `onCreate` against blank titles**

Around line 33-36:

```tsx
const onCreate = () => {
  if (!newTitle.trim()) {
    newCourseInputRef.current?.focus();
    return;
  }
  createCourse(newTitle);
  setNewTitle("");
};
```

Now the input is the single source of truth for "what's the new course named"; the top-bar button is a nav affordance (jump to field) rather than a silent creator.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Manual verify in Chrome** (Control Chrome MCP):
  - Click top-bar `+ New Course` without typing anything → focus jumps to the input; no course is created.
  - Type a title + press Enter → course is created; input clears.
  - Type a title + click top-bar button → focus returns to input (the button no longer creates).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "refactor: Courses — disambiguate top-bar New Course (focuses input)"
```

---

## Task 2 — Tokenise CourseCard gradient covers

Replace the hard-coded `["#2d3a4a", "#3a4d60"]` (etc.) array with a single token-driven fallback that reads legibly against the paper canvas.

**Files:**
- Modify: `src/pages/CourseCard.tsx` (around line 90-111)

- [ ] **Step 1: Replace the hard-coded gradient pairs**

Near line 90 there's code resembling:

```tsx
const coverColors = [
  ["#2d3a4a", "#3a4d60"],
  // ...
];
const colorPair = coverColors[course.title.charCodeAt(0) % coverColors.length];
```

Replace with a token-driven fallback:

```tsx
const fallbackGradient = "linear-gradient(135deg, hsl(var(--muted)), var(--accent-bg))";
```

Then around line 109, replace:

```tsx
// before
background: course.coverImageUrl
  ? undefined
  : `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`

// after
background: course.coverImageUrl ? undefined : fallbackGradient
```

Delete the now-unused `coverColors` array and `colorPair` computation.

- [ ] **Step 2: Reassess initial-letter colour**

Around line 111:

```tsx
<span className="relative z-10 px-3 pb-2 text-2xl leading-none text-white/70">
```

The old navy-slate gradient made `text-white/70` the right call. Against the muted-to-accent-bg gradient, it may read too faint. Swap to a readable token:

```tsx
<span
  className="relative z-10 px-3 pb-2 text-2xl leading-none font-bold"
  style={{ color: "var(--text-muted)" }}
>
```

Eyeball in the browser; if contrast is still too low, bump to `var(--ink)` with an opacity class like `text-[var(--ink)]/60`.

- [ ] **Step 3: Build + visual check**

```bash
npm run build 2>&1 | tail -10
```

Open `/courses` and confirm: cards now have a subtle neutral→accent gradient that reads against paper canvas; initial letter is visible but not aggressive.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CourseCard.tsx
git commit -m "refactor: CourseCard — tokenised fallback gradient"
```

---

## Task 3 — Polish AppShell NavItem hover

Non-editor pages (Courses / Settings / Changelog) use the `AppShell` sidebar. After the Consistency Foundation plan lands, this rail is **paper**, not dark gunmetal. `NavItem` still has no hover affordance on the inactive state — items feel flat.

**Prereq check:** this plan assumes the Consistency Foundation plan has merged (`--sidebar` is now paper). If you're running this before that lands, replace `hover:bg-black/[0.04]` below with `hover:bg-white/[0.04]` (the correct value for a still-dark sidebar).

**Files:**
- Modify: `src/components/AppShell.tsx` (the `NavItem` function, around line 134-148)

- [ ] **Step 1: Add subtle hover background on the inactive path**

```tsx
function NavItem({ icon: Icon, label, active, onClick }: { ... }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
        active
          ? "text-[var(--accent-hex)]"
          : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-black/[0.04]"
      )}
      style={active ? { background: "var(--accent-bg)" } : undefined}
    >
      <Icon className="w-[13px] h-[13px] [stroke-width:2]" />
      {label}
    </button>
  );
}
```

The only addition is `hover:bg-black/[0.04]` on the inactive path — a subtle darken against the paper rail. Active items keep their accent-bg background.

- [ ] **Step 2: Build + visual check**

```bash
npm run build 2>&1 | tail -10
```

Hover over sidebar items on `/courses` / `/settings` / `/changelog` — each now shows a faint highlight.

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "polish: AppShell NavItem hover background"
```

---

## Task 4 — View.tsx: tokenise residual slate utilities

`View.tsx` mostly uses tokens, but a couple of raw `text-slate-400` utilities remain (around lines 158, 160, 161) from before the tokenisation sweep.

**Files:**
- Modify: `src/pages/View.tsx`

- [ ] **Step 1: Grep to locate**

```bash
grep -n 'slate-' src/pages/View.tsx
```

- [ ] **Step 2: Replace**

Swap `text-slate-400` → `text-[var(--text-muted)]`. Keep `hover:text-slate-300` as-is or swap to `hover:text-white/70` — eyeball which reads better against the dark learner-header background. The learner view keeps its dark header deliberately (it signals "learner mode" vs authoring); only tokenise; do not restyle.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Visual check**

Open `/view?id=<any published course>` — dark header still reads fine; no visual regression.

- [ ] **Step 5: Commit**

```bash
git add src/pages/View.tsx
git commit -m "polish: View.tsx — tokenise residual slate utilities"
```

---

## Final verification

- [ ] **Step 1** — full test suite:

```bash
npx vitest run 2>&1 | tail -15
cd mcp && npm test 2>&1 | tail -10 && cd ..
```

Expected: all green (these tasks don't add tests but shouldn't regress any).

- [ ] **Step 2** — lint + build:

```bash
npm run lint 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

- [ ] **Step 3** — cross-page visual walkthrough (Control Chrome):
  - `/courses` — two affordances still visible but no longer compete; gradient covers read against paper canvas.
  - `/settings` — NavItem hover visible.
  - `/changelog` — NavItem hover visible.
  - `/view?id=<any>` — learner header unchanged in appearance.
  - `/editor?courseId=<any>` — unchanged (this plan doesn't touch editor surfaces).

- [ ] **Step 4** — residual hex grep on the surfaces touched:

```bash
grep -rn --include='*.tsx' -E '#[0-9a-fA-F]{6}' src/pages/Courses.tsx src/pages/CourseCard.tsx src/pages/View.tsx src/components/AppShell.tsx 2>&1 | head -20
```

Expected: only intentional brand constants (if any). Investigate anything unexpected.

- [ ] **Step 5** — update CLAUDE.md audit progress:

```markdown
- [x] **Non-Editor Polish** (merged to main) — Courses create-flow consolidated (top-bar button focuses input); CourseCard gradient tokenised; AppShell NavItem hover; View.tsx tokenisation drive-by.
```

- [ ] **Step 6** — open PR.

```bash
gh pr create --title "Non-editor polish: Courses, CourseCard, AppShell, View" --body "$(cat <<'EOF'
## Summary
- Courses: top-bar `+ New Course` button now focuses the input instead of silently creating an untitled course; `onCreate` guards blank titles.
- CourseCard: hard-coded navy-slate gradient pairs replaced with a single token-driven fallback (muted → accent-bg).
- AppShell: dark-sidebar NavItem gains a subtle hover background on the inactive state.
- View.tsx: residual `text-slate-400` utilities tokenised.

## Test plan
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Vitest + MCP tests still green (no behaviour changes)
- [ ] Visual check: Courses (input-first create); CourseCard (paper-friendly gradient); NavItem hover in dark sidebar; View.tsx unchanged visually

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes for Implementation

- **Do not restyle the View.tsx dark header.** The learner view is deliberately distinct from authoring; Task 4 is only a utility→token swap, not a redesign.
- **Don't add tests.** These are all presentational polish edits; a test-coverage pass is out of scope.
- **Order within this plan doesn't matter** — each task is a single-file edit with a single-commit outcome. Pick any order.
- **Runs in parallel with the Assessment WYSIWYG plan** — there's no file overlap.
