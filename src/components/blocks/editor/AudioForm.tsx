import { useRef, useState } from "react";
import { AudioBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";
import { FieldLabel } from "./FieldLabel";
import { toast } from "@/hooks/use-toast";

export function AudioForm({ block, onChange }: { block: AudioBlock; onChange: (b: AudioBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "audio");
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
      <FieldLabel required>Audio URL</FieldLabel>
      <div className="flex gap-2">
        <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="https://..." />
        {user && (
          <>
            <input ref={inputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg" className="hidden"
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
      <FieldLabel>Title (optional)</FieldLabel>
      <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} />
    </div>
  );
}
