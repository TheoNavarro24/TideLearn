import { useRef, useState } from "react";
import { ImageBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";
import { FieldLabel } from "./FieldLabel";

export function ImageForm({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "image");
      onChange({ ...block, src: url });
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-2">
        <FieldLabel>Image URL</FieldLabel>
        <div className="flex gap-2">
          <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} />
          {user && (
            <>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "0 10px", borderRadius: 6,
                  border: "1.5px solid #e0fdf4", background: "transparent",
                  color: "#0d9488", fontSize: 12, fontWeight: 600,
                  cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}
              >
                {uploading ? "…" : "Upload"}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <FieldLabel>Alt text</FieldLabel>
        <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
      </div>
    </div>
  );
}
