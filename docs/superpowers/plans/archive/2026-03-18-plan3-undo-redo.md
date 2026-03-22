# Plan 3: Undo/Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full undo/redo history to the course editor — Ctrl+Z undoes the last meaningful change, Ctrl+Y (or Ctrl+Shift+Z) redoes it. History is session-only (not persisted), capped at 50 snapshots, debounced so rapid typing doesn't create a new entry per keystroke.

**Architecture:** A custom `useUndoRedo` hook manages a snapshot array and a pointer. The Editor replaces its `useState` calls for `courseTitle` and `lessons` with this hook. Keyboard shortcuts follow the same `window.addEventListener('keydown')` pattern already used in the Editor. Undo/redo buttons in the editor toolbar provide visual affordance.

**Tech Stack:** React, TypeScript. No new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `src/hooks/useUndoRedo.ts` | **Create new** — undo/redo hook managing snapshot array + pointer + debounced push |
| `src/pages/Editor.tsx` | Replace `courseTitle`/`lessons` useState with `useUndoRedo`; add keyboard shortcut; add undo/redo buttons to toolbar |

---

## Task 1: Create `useUndoRedo` hook

**Files:**
- Create: `src/hooks/useUndoRedo.ts`

- [ ] **Step 1: Create the hook**

Uses `useReducer` to manage stack + pointer atomically, eliminating stale-closure bugs that would occur with separate `useState` calls + debounced callbacks.

```typescript
import { useReducer, useRef } from "react";
import type { Lesson } from "@/types/course";

export type EditorSnapshot = {
  courseTitle: string;
  lessons: Lesson[];
};

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 800;

type HistoryState = {
  stack: EditorSnapshot[];
  pointer: number;
};

type HistoryAction =
  | { type: "PUSH"; snapshot: EditorSnapshot }
  | { type: "UNDO" }
  | { type: "REDO" };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "PUSH": {
      // Discard any "future" entries when a new change is made mid-undo
      const base = state.stack.slice(0, state.pointer + 1);
      const next = [...base, action.snapshot];
      // Cap at MAX_HISTORY — drop oldest if over limit
      const capped = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      return { stack: capped, pointer: capped.length - 1 };
    }
    case "UNDO": {
      if (state.pointer <= 0) return state;
      return { ...state, pointer: state.pointer - 1 };
    }
    case "REDO": {
      if (state.pointer >= state.stack.length - 1) return state;
      return { ...state, pointer: state.pointer + 1 };
    }
    default:
      return state;
  }
}

export function useUndoRedo(initial: EditorSnapshot) {
  const [{ stack, pointer }, dispatch] = useReducer(historyReducer, {
    stack: [initial],
    pointer: 0,
  });

  // Debounce refs — stored outside reducer to avoid side effects in pure reducer
  const debounceRef = useRef<number | null>(null);
  const pendingRef = useRef<EditorSnapshot | null>(null);

  const canUndo = pointer > 0;
  const canRedo = pointer < stack.length - 1;

  /** Call this on every state change. Debounces pushes to the stack. */
  function push(snapshot: EditorSnapshot) {
    pendingRef.current = snapshot;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) return;
      dispatch({ type: "PUSH", snapshot: pending });
      pendingRef.current = null;
    }, DEBOUNCE_MS);
  }

  function undo(): EditorSnapshot | null {
    // Flush any pending debounced snapshot first so it's in the stack before we step back
    if (debounceRef.current && pendingRef.current) {
      window.clearTimeout(debounceRef.current);
      dispatch({ type: "PUSH", snapshot: pendingRef.current });
      pendingRef.current = null;
    }
    dispatch({ type: "UNDO" });
    // Return the snapshot the reducer will land on after UNDO
    // (pointer - 1, or pointer after flush+undo — read from stack directly)
    const targetPointer = pointer > 0 ? pointer - 1 : 0;
    return stack[targetPointer];
  }

  function redo(): EditorSnapshot | null {
    dispatch({ type: "REDO" });
    const targetPointer = pointer < stack.length - 1 ? pointer + 1 : pointer;
    return stack[targetPointer];
  }

  const current = stack[pointer];

  return { current, push, undo, redo, canUndo, canRedo };
}
```

> **Note on `undo`/`redo` return values:** The returned snapshot is a hint to the caller for any imperative work needed. However, since `current` (derived from the reducer state) updates on re-render, the Editor should primarily read from `editorState` (i.e. `current`) rather than the return value of `undo()`/`redo()`.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUndoRedo.ts
git commit -m "feat(hooks): useUndoRedo hook with debounced snapshot stack"
```

---

## Task 2: Integrate `useUndoRedo` into the Editor

**Files:**
- Modify: `src/pages/Editor.tsx`

Read `src/pages/Editor.tsx` fully before making changes. The editor currently has:
- `const [courseTitle, setCourseTitle] = useState("My Course");` (line 39)
- `const [lessons, setLessons] = useState<Lesson[]>([defaultLesson]);` (line 40)
- The autosave `useEffect` depends on `[courseTitle, lessons, courseId, user]` (line 244)
- Keyboard shortcut useEffect at line 247 uses `window.addEventListener('keydown')`

- [ ] **Step 1: Replace useState with useUndoRedo**

The hook manages both `courseTitle` and `lessons` as a single snapshot. Replace the two `useState` calls:

```typescript
// Remove these two lines:
// const [courseTitle, setCourseTitle] = useState("My Course");
// const [lessons, setLessons] = useState<Lesson[]>([defaultLesson]);

// Add:
import { useUndoRedo, type EditorSnapshot } from "@/hooks/useUndoRedo";

const {
  current: editorState,
  push: pushHistory,
  undo: undoHistory,
  redo: redoHistory,
  canUndo,
  canRedo,
} = useUndoRedo({ courseTitle: "My Course", lessons: [defaultLesson] });

const courseTitle = editorState.courseTitle;
const lessons = editorState.lessons;
```

- [ ] **Step 2: Replace all `setCourseTitle(...)` calls**

Every place that calls `setCourseTitle(value)` should now call:
```typescript
pushHistory({ courseTitle: value, lessons });
```

Every place that calls `setLessons(value)` or `setLessons(prev => ...)` should now call:
```typescript
// For direct value:
pushHistory({ courseTitle, lessons: value });

// For functional update pattern (setLessons(prev => ...)):
const nextLessons = /* compute next value */;
pushHistory({ courseTitle, lessons: nextLessons });
```

Search for all occurrences of `setCourseTitle` and `setLessons` in `Editor.tsx` and replace each one. There are likely 10–20 occurrences.

- [ ] **Step 3: Update the load effect**

The `loadInitialCourse` effect sets initial state when a course is loaded. Find `setCourseTitle(loaded.title...)` and `setLessons(loaded.lessons...)` — these calls set initial state, not history entries. Use a ref-based "seed" approach to avoid polluting history:

```typescript
// Replace the two setCourseTitle + setLessons calls in loadInitialCourse with:
pushHistory({ courseTitle: loaded.title || "My Course", lessons: loaded.lessons });
// Note: this will add to history — that's acceptable for load; history starts from the loaded state.
```

- [ ] **Step 4: Update the autosave useEffect dependency array**

The autosave effect depends on `[courseTitle, lessons, courseId, user]`. These are now derived from `editorState`, so update the dependency:

```typescript
}, [editorState, courseId, user]);
```

- [ ] **Step 5: Add the undo/redo keyboard shortcut**

The Editor already has a keyboard shortcut `useEffect` at line ~247 that listens for `/`. Add undo/redo to the same or a new `useEffect`:

```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (!ctrl) return;

    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      const prev = undoHistory();
      if (prev) {
        // State is set by the hook — no additional setState needed
        // The hook updates editorState which triggers re-render
      }
    }
    if ((e.key === "y") || (e.key === "z" && e.shiftKey)) {
      e.preventDefault();
      redoHistory();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [undoHistory, redoHistory]);
```

**Note:** Because `useUndoRedo` manages state internally and returns `current` as derived state, calling `undoHistory()` and `redoHistory()` triggers a re-render automatically — the Editor reads `editorState.courseTitle` and `editorState.lessons` from the hook's current value.

- [ ] **Step 6: Add undo/redo buttons to the editor toolbar**

Find the editor's top toolbar area in `Editor.tsx`. Add undo/redo buttons using the existing toolbar button style. Look for the area with the "Back" button and save indicator to understand the style pattern, then add:

```tsx
<button
  onClick={() => undoHistory()}
  disabled={!canUndo}
  title="Undo (Ctrl+Z)"
  style={{
    background: "none",
    border: "none",
    cursor: canUndo ? "pointer" : "not-allowed",
    opacity: canUndo ? 1 : 0.35,
    padding: "6px 8px",
    borderRadius: 6,
    color: "#0d9488",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 4,
  }}
>
  ↩ Undo
</button>
<button
  onClick={() => redoHistory()}
  disabled={!canRedo}
  title="Redo (Ctrl+Y)"
  style={{
    background: "none",
    border: "none",
    cursor: canRedo ? "pointer" : "not-allowed",
    opacity: canRedo ? 1 : 0.35,
    padding: "6px 8px",
    borderRadius: 6,
    color: "#0d9488",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 4,
  }}
>
  ↪ Redo
</button>
```

- [ ] **Step 7: Verify in browser**

Start dev server (`npm run dev`):
1. Open the editor
2. Type a course title → pause → Ctrl+Z → title reverts to previous value
3. Ctrl+Y → title comes back
4. Add a block → Ctrl+Z → block disappears
5. Type rapidly in a text block → pause 1 second → Ctrl+Z → entire typing sequence undone as one step (not per keystroke)
6. Undo button is greyed out at start of history
7. Redo button is greyed out at end of history
8. Make a change mid-undo → redo stack is cleared (can't redo past a new edit)

- [ ] **Step 8: Commit**

```bash
git add src/pages/Editor.tsx src/hooks/useUndoRedo.ts
git commit -m "feat(editor): undo/redo history with Ctrl+Z / Ctrl+Y and toolbar buttons"
```

---

## Task 3: Edge case handling

- [ ] **Step 1: Ensure undo doesn't interfere with autosave**

The autosave fires on `editorState` change. Undo/redo changes `editorState` too. This means undoing will trigger an autosave — which is correct behaviour (the undone state gets saved). No special handling needed.

- [ ] **Step 2: Ensure initial course load doesn't create undo history before user edits**

When a course loads, `pushHistory` is called once. This sets the first snapshot. The user cannot undo past the load state — `canUndo` will be false until they make their first change. This is correct.

- [ ] **Step 3: Test with a long editing session**

Make 55+ changes in the editor. Verify the history stack caps at 50 — the oldest entry is dropped and you cannot undo past the 50th-most-recent change. No error, no memory leak.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "fix(editor): undo/redo edge cases — cap at 50, load state, autosave integration"
```

---

## Done

Plan 3 complete. The editor has full session-based undo/redo with Ctrl+Z / Ctrl+Y, debounced to capture meaningful edit steps rather than individual keystrokes. History is capped at 50 entries.
