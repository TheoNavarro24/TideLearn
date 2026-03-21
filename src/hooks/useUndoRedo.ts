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
