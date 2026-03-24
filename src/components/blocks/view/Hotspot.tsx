import { useState } from "react";
import { HotspotBlock } from "@/types/course";

export function HotspotView({ block }: { block: HotspotBlock }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = (id: string) => setActiveId((prev) => (prev === id ? null : id));

  if (!block.src) return <p className="text-sm text-muted-foreground italic">No image set.</p>;

  return (
    <div className="py-2">
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img src={block.src} alt={block.alt} className="w-full block" />
        {block.hotspots.map((h, i) => {
          const isOpen = activeId === h.id;
          return (
            <div key={h.id} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%` }}>
              <button onClick={() => toggle(h.id)} aria-label={h.label} aria-expanded={isOpen}
                className="w-7 h-7 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md hover:bg-[--color-teal-600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110">
                {i + 1}
              </button>
              {isOpen && (
                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border border-border bg-popover p-3 shadow-lg text-sm">
                  <p className="font-semibold">{h.label}</p>
                  {h.description && <p className="text-muted-foreground mt-1">{h.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
