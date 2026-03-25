import { useEffect, useMemo, useRef, useState } from "react";
import { registry } from "@/components/blocks/registry";
import type { ContentLesson } from "@/types/course";

export function useBlockPicker(selectedLesson: ContentLesson | null) {
  const [pickerState, setPickerState] = useState<{ rowIndex: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  const filteredRegistry = useMemo(() => {
    if (!pickerSearch.trim()) return registry;
    const q = pickerSearch.toLowerCase();
    return registry.filter(s => s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [pickerSearch]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerState) return;
    const onMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerState(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [pickerState]);

  // Focus search input when picker opens
  useEffect(() => {
    if (pickerState && pickerSearchRef.current) {
      requestAnimationFrame(() => pickerSearchRef.current?.focus());
    }
  }, [pickerState]);

  const openPickerAt = (rowIndex: number) => {
    if (!selectedLesson) return;
    setPickerState({ rowIndex });
    setPickerSearch("");
  };

  return {
    pickerState,
    setPickerState,
    pickerSearch,
    setPickerSearch,
    filteredRegistry,
    pickerRef,
    pickerSearchRef,
    openPickerAt,
  };
}
