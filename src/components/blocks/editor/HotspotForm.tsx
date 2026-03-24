import { useRef } from "react";
import { HotspotBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: HotspotBlock; onChange: (b: HotspotBlock) => void };

export function HotspotForm({ block, onChange }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ ...block, hotspots: [...block.hotspots, { id: uid(), x, y, label: "New hotspot" }] });
  };

  const updateHotspot = (index: number, updates: Partial<HotspotBlock["hotspots"][0]>) => {
    const hotspots = block.hotspots.map((h, i) => i === index ? { ...h, ...updates } : h);
    onChange({ ...block, hotspots });
  };

  const removeHotspot = (index: number) =>
    onChange({ ...block, hotspots: block.hotspots.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input type="url" value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })}
          placeholder="https://" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Alt text</label>
        <input type="text" value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Describe the image" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      {block.src && (
        <>
          <p className="text-xs text-muted-foreground">Click the image to place a hotspot pin</p>
          <div className="relative cursor-crosshair rounded-lg overflow-hidden border border-border" onClick={handleImageClick}>
            <img ref={imgRef} src={block.src} alt={block.alt} className="w-full block" />
            {block.hotspots.map((h, i) => (
              <div key={h.id} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                className="w-6 h-6 rounded-full bg-[--color-teal-500] border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md pointer-events-none">
                {i + 1}
              </div>
            ))}
          </div>
          {block.hotspots.length > 0 && (
            <div className="space-y-2">
              {block.hotspots.map((h, i) => (
                <div key={h.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[--color-teal-500] text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <input type="text" value={h.label} onChange={(e) => updateHotspot(i, { label: e.target.value })}
                      placeholder="Label" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                    <button onClick={() => removeHotspot(i)} aria-label="Remove hotspot" className="text-destructive text-sm">✕</button>
                  </div>
                  <textarea value={h.description ?? ""} onChange={(e) => updateHotspot(i, { description: e.target.value || undefined })}
                    placeholder="Description (optional)" rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
