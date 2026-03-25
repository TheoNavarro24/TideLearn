import { useRef, useState, useEffect } from "react";
import { VideoBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";
import { FieldLabel } from "./FieldLabel";
import { toast } from "@/hooks/use-toast";
import { getVideoEmbed } from "@/lib/video";

export function VideoForm({ block, onChange }: { block: VideoBlock; onChange: (b: VideoBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [debouncedUrl, setDebouncedUrl] = useState(block.url);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUrl(block.url), 500);
    return () => clearTimeout(t);
  }, [block.url]);

  const embed = debouncedUrl ? getVideoEmbed(debouncedUrl) : null;

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "video");
      onChange({ ...block, url });
    } catch (e) {
      console.error("Upload failed", e);
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <FieldLabel required>Video URL (YouTube, Vimeo, or .mp4)</FieldLabel>
      <div className="flex gap-2">
        <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
        {user && (
          <>
            <input ref={inputRef} type="file" accept="video/mp4,video/webm" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-[10px] rounded-md border border-border bg-transparent text-teal-600 text-xs font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "…" : "Upload"}
            </button>
          </>
        )}
      </div>
      {/* Video preview */}
      <div className="mt-2">
        {!debouncedUrl && (
          <p className="text-xs text-muted-foreground py-4">No video set</p>
        )}
        {embed?.type === "youtube" && embed.src && (
          <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border">
            <iframe src={embed.src} title="Preview" className="h-full w-full" loading="lazy" allowFullScreen />
          </div>
        )}
        {embed?.type === "vimeo" && embed.src && (
          <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border">
            <iframe src={embed.src} title="Preview" className="h-full w-full" loading="lazy" allowFullScreen />
          </div>
        )}
        {embed?.type === "direct" && (
          <video controls src={debouncedUrl} preload="metadata" className="w-full max-w-md rounded-md border" />
        )}
        {embed?.type === "unknown" && debouncedUrl && (
          <p className="text-xs text-amber-600 py-4">
            URL not recognised — supported: YouTube, Vimeo, or direct .mp4/.webm
          </p>
        )}
      </div>
    </div>
  );
}
