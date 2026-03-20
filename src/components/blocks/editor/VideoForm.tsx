import { useRef, useState } from "react";
import { VideoBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";

export function VideoForm({ block, onChange }: { block: VideoBlock; onChange: (b: VideoBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "video");
      onChange({ ...block, url });
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Video URL (YouTube, Vimeo, or .mp4)</label>
      <div className="flex gap-2">
        <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
        {user && (
          <>
            <input ref={inputRef} type="file" accept="video/mp4,video/webm" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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
  );
}
