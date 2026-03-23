import { useState, type RefObject } from "react";
import { Search } from "lucide-react";
import type { BlockType } from "@/types/course";
import type { registry } from "@/components/blocks/registry";

const CATEGORY_META: Record<string, { label: string; iconBg: string }> = {
  Text: { label: "Text", iconBg: "bg-green-50" },
  Media: { label: "Media", iconBg: "bg-blue-50" },
  Interactive: { label: "Interactive", iconBg: "bg-purple-50" },
  Knowledge: { label: "Knowledge Check", iconBg: "bg-orange-50" },
};

const CATEGORIES = ["Text", "Media", "Interactive", "Knowledge"] as const;

interface AddBlockRowProps {
  rowIndex: number;
  pickerState: { rowIndex: number } | null;
  onOpen: () => void;
  pickerRef: (rowIndex: number) => RefObject<HTMLDivElement> | undefined;
  pickerSearch: string;
  setPickerSearch: (s: string) => void;
  filteredRegistry: typeof registry;
  pickerSearchRef: RefObject<HTMLInputElement>;
  onPickerSelect: (type: BlockType) => void;
  onPickerClose: () => void;
}

export function AddBlockRow({
  rowIndex,
  pickerState,
  onOpen,
  pickerRef,
  pickerSearch,
  setPickerSearch,
  filteredRegistry,
  pickerSearchRef,
  onPickerSelect,
  onPickerClose,
}: AddBlockRowProps) {
  const isOpen = pickerState?.rowIndex === rowIndex;
  const ref = pickerRef(rowIndex);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Flatten filtered tiles for keyboard navigation
  const allTiles = filteredRegistry.map(spec => spec.type);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight": {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % allTiles.length);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + allTiles.length) % allTiles.length);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allTiles.length) {
          onPickerSelect(allTiles[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        onPickerClose();
        break;
      }
    }
  };

  const activeOptionId = activeIndex >= 0 ? `block-option-${activeIndex}` : undefined;

  return (
    <div className="abr-container relative my-1">
      <div className={`abr flex items-center w-full${isOpen ? " open" : ""}`}>
        {/* Left line */}
        <div className="flex-1 h-px bg-[rgba(20,184,166,0.15)]" />

        {/* Pill button */}
        <div className="relative shrink-0">
          <button
            className="abr-pill bg-white border-[1.5px] border-[var(--border-emphasis)] rounded-full text-[var(--teal-primary)] text-[11px] font-bold py-[5px] px-[13px] cursor-pointer mx-2.5 transition-colors hover:bg-[var(--surface-tint)] hover:border-[var(--teal-light)] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
            onClick={onOpen}
          >
            + Add block
          </button>

          {/* Picker popup */}
          {isOpen && (
            <div
              ref={ref}
              className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-[var(--border-emphasis)] rounded-xl shadow-[var(--shadow-popup)] z-[100] overflow-hidden"
              onKeyDown={handleKeyDown}
            >
              {/* Search */}
              <div className="px-3.5 py-2.5 border-b border-[var(--surface-tint)] flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  ref={pickerSearchRef}
                  value={pickerSearch}
                  onChange={e => { setPickerSearch(e.target.value); setActiveIndex(-1); }}
                  placeholder="Search blocks…"
                  role="combobox"
                  aria-expanded={true}
                  aria-controls="block-picker-list"
                  aria-activedescendant={activeOptionId}
                  className="border-none outline-none text-[13px] text-[var(--text-primary)] w-full bg-transparent"
                />
              </div>

              {/* Categories */}
              <div role="listbox" id="block-picker-list" className="max-h-80 overflow-y-auto py-2">
                {(() => {
                  let globalIdx = 0;
                  return CATEGORIES.map(cat => {
                    const catSpecs = filteredRegistry.filter(s => s.category === cat);
                    if (catSpecs.length === 0) return null;
                    const meta = CATEGORY_META[cat];
                    return (
                      <div key={cat} className="px-3.5 pb-2.5">
                        <div className="text-[9.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 mt-1">
                          {meta.label}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {catSpecs.map(spec => {
                            const tileIdx = globalIdx++;
                            const isActive = tileIdx === activeIndex;
                            return (
                              <button
                                key={spec.type}
                                role="option"
                                id={`block-option-${tileIdx}`}
                                aria-selected={isActive}
                                onClick={() => onPickerSelect(spec.type)}
                                className={`picker-tile flex flex-col items-center gap-[5px] bg-white border-[1.5px] rounded-lg p-2 cursor-pointer transition-colors ${
                                  isActive
                                    ? "border-[var(--border-emphasis)] bg-[var(--surface-tint)]"
                                    : "border-[var(--border-subtle)] hover:bg-[var(--surface-tint)] hover:border-[var(--border-emphasis)]"
                                }`}
                              >
                                <div className={`w-[34px] h-[34px] ${meta.iconBg} rounded-md flex items-center justify-center`}>
                                  <spec.icon size={16} className="text-[var(--teal-primary)]" />
                                </div>
                                <span className="text-[10px] text-[var(--text-body)] font-semibold text-center leading-tight">
                                  {spec.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
                {filteredRegistry.length === 0 && (
                  <div className="p-4 text-center text-[var(--text-muted)] text-xs">
                    No blocks found
                  </div>
                )}
              </div>

              {/* Footer close */}
              <div className="border-t border-[var(--surface-tint)] px-3.5 py-2 text-right">
                <button
                  onClick={onPickerClose}
                  className="bg-none border-none text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--teal-primary)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right line */}
        <div className="flex-1 h-px bg-[rgba(20,184,166,0.15)]" />
      </div>
    </div>
  );
}
