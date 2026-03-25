import { useRef, useState, useEffect } from "react";
import { ImageBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";
import { FieldLabel } from "./FieldLabel";
import { toast } from "@/hooks/use-toast";

export function ImageForm({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [imgStatus, setImgStatus] = useState<"empty" | "loading" | "loaded" | "error">(
    block.src ? "loading" : "empty"
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!block.src) { setImgStatus("empty"); return; }
    setImgStatus("loading");
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setImgStatus("error"), 10000);
    return () => clearTimeout(timeoutRef.current);
  }, [block.src]);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "image");
      onChange({ ...block, src: url });
    } catch (e) {
      console.error("Upload failed", e);
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Image URL</FieldLabel>
          <div className="flex gap-2">
            <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} />
            {user && (
              <>
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="px-[10px] rounded-md border border-[color:hsl(var(--border))] bg-transparent text-teal-600 text-xs font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "…" : "Upload"}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel required>Alt text</FieldLabel>
          <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
        </div>
      </div>
      {/* Image preview */}
      <div className="mt-2">
        {imgStatus === "empty" && (
          <p className="text-xs text-muted-foreground py-4">No image set</p>
        )}
        {imgStatus === "error" && (
          <p className="text-xs text-destructive py-4">Image failed to load — check the URL</p>
        )}
        {block.src && (
          <img
            src={block.src}
            alt={block.alt || "Preview"}
            onLoad={() => { clearTimeout(timeoutRef.current); setImgStatus("loaded"); }}
            onError={() => { clearTimeout(timeoutRef.current); setImgStatus("error"); }}
            className="max-h-[200px] object-contain rounded-md"
            style={{ display: imgStatus === "loaded" ? "block" : "none" }}
          />
        )}
      </div>
    </div>
  );
}
