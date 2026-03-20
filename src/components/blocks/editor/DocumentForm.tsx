import { useRef, useState } from "react";
import { DocumentBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";

const FILE_TYPES = [
  { value: "pdf", label: "PDF", accept: "application/pdf" },
  { value: "docx", label: "Word (.docx)", accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { value: "xlsx", label: "Excel (.xlsx)", accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { value: "pptx", label: "PowerPoint (.pptx)", accept: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
] as const;

export function DocumentForm({ block, onChange }: { block: DocumentBlock; onChange: (b: DocumentBlock) => void }) {
  const { user } = useAuth();
  const courseId = new URLSearchParams(window.location.search).get("courseId") ?? "local";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentType = FILE_TYPES.find(t => t.value === block.fileType);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id, courseId, "document");
      onChange({ ...block, src: url });
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Document type</label>
        <Select
          value={block.fileType}
          onValueChange={(v) => onChange({ ...block, fileType: v as DocumentBlock["fileType"] })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Document URL</label>
        <div className="flex gap-2">
          <Input
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="https://..."
          />
          {user && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={currentType?.accept}
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
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
        <label className="text-sm text-muted-foreground">Caption (optional)</label>
        <Input
          value={block.title ?? ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="e.g. Annual Report 2025"
        />
      </div>
    </div>
  );
}
