import { useRef, useState } from "react";
import { DocumentBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";
import { FieldLabel } from "./FieldLabel";
import { toast } from "@/hooks/use-toast";

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
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <FieldLabel required>Document type</FieldLabel>
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
        <FieldLabel required>Document URL</FieldLabel>
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
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
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
        <FieldLabel>Caption (optional)</FieldLabel>
        <Input
          value={block.title ?? ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="e.g. Annual Report 2025"
        />
      </div>
    </div>
  );
}
