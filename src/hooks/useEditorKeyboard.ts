import { useEffect } from "react";

interface UseEditorKeyboardOpts {
  onSlash: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canOpenPicker: boolean;
}

export function useEditorKeyboard({ onSlash, onUndo, onRedo, canOpenPicker }: UseEditorKeyboardOpts) {
  // "/" shortcut to open block picker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            (target as any).isContentEditable);
        if (!isTyping && canOpenPicker) {
          e.preventDefault();
          onSlash();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSlash, canOpenPicker]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = (navigator as any).userAgentData?.platform === "macOS"
        || /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUndo, onRedo]);
}
