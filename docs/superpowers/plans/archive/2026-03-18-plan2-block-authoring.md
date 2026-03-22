# Plan 2: Block Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feedback toggle to all knowledge-check blocks (Quiz, True/False, Short Answer), add direct file upload to media blocks (Image, Video, Audio), introduce a new Document block (PDF/DOCX/XLSX/PPTX), and ensure all media is bundled into SCORM and static web exports.

**Architecture:** All block changes follow the same pattern: update the TypeScript type + Zod schema in `course.ts`, update the editor form component, update the view component, register the new block in `registry.ts`. Media upload uses a new shared `src/lib/upload.ts` utility that talks to Supabase Storage. Media bundling in exports uses a new `fetchAndBundleMedia` function in `scorm12.ts`.

**Tech Stack:** React, TypeScript, Supabase JS client + Storage, JSZip (already installed), Microsoft Office Online viewer (free, no auth required for public URLs).

---

## File Map

| File | Change |
|------|--------|
| `src/types/course.ts` | Add `showFeedback?` + `feedbackMessage?` to QuizBlock; add consistent feedback fields to TrueFalseBlock/ShortAnswerBlock; add `DocumentBlock` type + Zod schema + factory |
| `src/lib/upload.ts` | **Create new** — shared file upload utility for Supabase Storage |
| `src/components/blocks/editor/QuizForm.tsx` | Add feedback toggle + message field |
| `src/components/blocks/editor/TrueFalseForm.tsx` | Refactor to use unified `showFeedback` toggle; keep existing correct/incorrect fields |
| `src/components/blocks/editor/ShortAnswerForm.tsx` | Add feedback toggle + message field |
| `src/components/blocks/view/Quiz.tsx` | Show `feedbackMessage` after answer if `showFeedback` is true |
| `src/components/blocks/view/TrueFalse.tsx` | Guard feedback display behind `showFeedback` flag |
| `src/components/blocks/view/ShortAnswer.tsx` | Show `feedbackMessage` after answer if `showFeedback` is true |
| `src/components/blocks/editor/ImageForm.tsx` | Add file upload button alongside URL input |
| `src/components/blocks/editor/VideoForm.tsx` | Add file upload button alongside URL input |
| `src/components/blocks/editor/AudioForm.tsx` | Add file upload button alongside URL input |
| `src/components/blocks/editor/DocumentForm.tsx` | **Create new** — upload or URL, fileType selector, optional title |
| `src/components/blocks/view/Document.tsx` | **Create new** — iframe embed for PDF, Office Online viewer for DOCX/XLSX/PPTX |
| `src/components/blocks/registry.ts` | Register `document` block |
| `src/lib/scorm12.ts` | Add `fetchAndBundleMedia` utility; update both exports to bundle media files |

---

## Task 1: Update block types in `course.ts`

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add feedback fields to `QuizBlock`**

Replace lines 6–12:

```typescript
export type QuizBlock = {
  id: string;
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
  showFeedback?: boolean;
  feedbackMessage?: string;
};
```

- [ ] **Step 2: Add `showFeedback` toggle to `TrueFalseBlock`**

`TrueFalseBlock` already has `feedbackCorrect`/`feedbackIncorrect`. Add a `showFeedback` toggle so the author can disable feedback display (making it summative):

```typescript
export type TrueFalseBlock = {
  id: string;
  type: "truefalse";
  question: string;
  correct: boolean;
  showFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
};
```

- [ ] **Step 3: Add feedback fields to `ShortAnswerBlock`**

```typescript
export type ShortAnswerBlock = {
  id: string;
  type: "shortanswer";
  question: string;
  answer: string;
  acceptable?: string[];
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  showFeedback?: boolean;
  feedbackMessage?: string;
};
```

- [ ] **Step 4: Add `DocumentBlock` type**

After `AudioBlock` (line 72), add:

```typescript
export type DocumentBlock = {
  id: string;
  type: "document";
  src: string;
  fileType: "pdf" | "docx" | "xlsx" | "pptx";
  title?: string;
};
```

- [ ] **Step 5: Add `DocumentBlock` to the `Block` union**

```typescript
export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | QuizBlock
  | CodeBlock
  | TrueFalseBlock
  | ShortAnswerBlock
  | ListBlock
  | QuoteBlock
  | AccordionBlock
  | TabsBlock
  | DividerBlock
  | TocBlock
  | CalloutBlock
  | VideoBlock
  | AudioBlock
  | DocumentBlock;
```

- [ ] **Step 6: Update Zod schemas**

Update `quizBlockSchema` to include feedback fields:

```typescript
export const quizBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quiz"),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

Update `trueFalseBlockSchema`:

```typescript
export const trueFalseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("truefalse"),
  question: z.string(),
  correct: z.boolean(),
  showFeedback: z.boolean().optional(),
  feedbackCorrect: z.string().optional(),
  feedbackIncorrect: z.string().optional(),
});
```

Update `shortAnswerBlockSchema`:

```typescript
export const shortAnswerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("shortanswer"),
  question: z.string(),
  answer: z.string(),
  acceptable: z.array(z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

Add `documentBlockSchema` before `blockSchema`:

```typescript
export const documentBlockSchema = z.object({
  id: z.string(),
  type: z.literal("document"),
  src: z.string(),
  fileType: z.union([z.literal("pdf"), z.literal("docx"), z.literal("xlsx"), z.literal("pptx")]),
  title: z.string().optional(),
});
```

Add to `blockSchema` discriminated union:
```typescript
documentBlockSchema,
```

- [ ] **Step 7: Add `DocumentBlock` import to `blockSchema` and add factory**

In the `factories` object, add:

```typescript
document: (): DocumentBlock => ({ id: uid(), type: "document", src: "", fileType: "pdf", title: "" }),
```

- [ ] **Step 8: Commit**

```bash
git add src/types/course.ts
git commit -m "feat(types): add document block, feedback fields to knowledge blocks"
```

---

## Task 2: Create shared upload utility

**Files:**
- Create: `src/lib/upload.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from "@/integrations/supabase/client";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"],
  document: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const MAX_SIZE_MB = 50;

export async function uploadMedia(
  file: File,
  userId: string,
  courseId: string,
  category: keyof typeof ALLOWED_TYPES
): Promise<string> {
  const allowed = ALLOWED_TYPES[category] ?? [];
  if (!allowed.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed for ${category}`);
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File too large. Maximum size is ${MAX_SIZE_MB}MB`);
  }
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${userId}/${courseId}/${filename}`;
  const { error } = await supabase.storage
    .from("course-media")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("course-media").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/upload.ts
git commit -m "feat(upload): shared media upload utility for Supabase Storage"
```

---

## Task 3: Update knowledge block editor forms

**Files:**
- Modify: `src/components/blocks/editor/QuizForm.tsx`
- Modify: `src/components/blocks/editor/TrueFalseForm.tsx`
- Modify: `src/components/blocks/editor/ShortAnswerForm.tsx`

- [ ] **Step 1: Read the current QuizForm**

Read `src/components/blocks/editor/QuizForm.tsx` to understand its current structure before editing.

- [ ] **Step 2: Update QuizForm to add feedback toggle**

Add a feedback section below the options in `QuizForm.tsx`:

```tsx
import { QuizBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuizForm({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  return (
    <div className="grid gap-3">
      {/* existing question + options fields */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Question</label>
        <Input value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} />
      </div>
      {block.options.map((opt, i) => (
        <div key={i} className="space-y-1">
          <label className="text-sm text-muted-foreground">
            Option {String.fromCharCode(65 + i)}{i === block.correctIndex ? " ✓ Correct" : ""}
          </label>
          <div className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => {
                const next = [...block.options];
                next[i] = e.target.value;
                onChange({ ...block, options: next });
              }}
            />
            <button
              type="button"
              onClick={() => onChange({ ...block, correctIndex: i })}
              style={{
                padding: "0 10px",
                borderRadius: 6,
                border: "1.5px solid",
                borderColor: i === block.correctIndex ? "#0d9488" : "#e2e8f0",
                background: i === block.correctIndex ? "#f0fdfb" : "transparent",
                color: i === block.correctIndex ? "#0d9488" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✓
            </button>
          </div>
        </div>
      ))}

      {/* Feedback section */}
      <div style={{ borderTop: "1px solid #e0fdf4", paddingTop: 12, marginTop: 4 }}>
        <div className="flex items-center gap-2 mb-2">
          <Switch
            id={`feedback-${block.id}`}
            checked={block.showFeedback ?? false}
            onCheckedChange={(v) => onChange({ ...block, showFeedback: v })}
          />
          <Label htmlFor={`feedback-${block.id}`} className="text-sm text-muted-foreground">
            Show feedback after answer
          </Label>
        </div>
        {block.showFeedback && (
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Feedback message</label>
            <Textarea
              value={block.feedbackMessage ?? ""}
              onChange={(e) => onChange({ ...block, feedbackMessage: e.target.value })}
              placeholder="Explain the correct answer..."
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Read TrueFalseForm then update it**

Read `src/components/blocks/editor/TrueFalseForm.tsx`, then add a `showFeedback` toggle. The existing form has `feedbackCorrect`/`feedbackIncorrect` fields — wrap them behind the toggle. When `showFeedback` is false, hide both feedback fields.

The pattern to add:
```tsx
<div style={{ borderTop: "1px solid #e0fdf4", paddingTop: 12, marginTop: 4 }}>
  <div className="flex items-center gap-2 mb-2">
    <Switch
      id={`feedback-${block.id}`}
      checked={block.showFeedback ?? false}
      onCheckedChange={(v) => onChange({ ...block, showFeedback: v })}
    />
    <Label htmlFor={`feedback-${block.id}`} className="text-sm text-muted-foreground">
      Show feedback after answer
    </Label>
  </div>
  {block.showFeedback && (
    <div className="grid gap-2">
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">Correct feedback</label>
        <Input
          value={block.feedbackCorrect ?? ""}
          onChange={(e) => onChange({ ...block, feedbackCorrect: e.target.value })}
          placeholder="Great job!"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">Incorrect feedback</label>
        <Input
          value={block.feedbackIncorrect ?? ""}
          onChange={(e) => onChange({ ...block, feedbackIncorrect: e.target.value })}
          placeholder="Not quite — the answer is..."
        />
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Read ShortAnswerForm then update it**

Read `src/components/blocks/editor/ShortAnswerForm.tsx`, then add the same `showFeedback` toggle + `feedbackMessage` textarea pattern used in QuizForm step 2.

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/editor/QuizForm.tsx src/components/blocks/editor/TrueFalseForm.tsx src/components/blocks/editor/ShortAnswerForm.tsx
git commit -m "feat(blocks): feedback toggle on Quiz, TrueFalse, ShortAnswer editor forms"
```

---

## Task 4: Update knowledge block view components

**Files:**
- Modify: `src/components/blocks/view/Quiz.tsx`
- Modify: `src/components/blocks/view/TrueFalse.tsx`
- Modify: `src/components/blocks/view/ShortAnswer.tsx`

- [ ] **Step 1: Update Quiz view to show feedback message**

In `src/components/blocks/view/Quiz.tsx`, the result section (line 108–112) currently shows "Correct!" or "Try again." Add the feedback message below:

```tsx
{revealed && (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span style={{ fontSize: 13, color: isCorrect ? "#0d9488" : "#ef4444", fontWeight: 500 }}>
      {isCorrect ? "Correct!" : "Try again."}
    </span>
    {block.showFeedback && block.feedbackMessage && !isCorrect && (
      <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
        {block.feedbackMessage}
      </span>
    )}
    {/* Note: feedback is intentionally only shown on wrong answers — it acts as a hint/explanation
        for the learner rather than confirmation of a correct answer. TrueFalse shows feedback
        on both correct and incorrect to match its existing feedbackCorrect/feedbackIncorrect fields. */}
  </div>
)}
```

- [ ] **Step 2: Read TrueFalse view then update it**

Read `src/components/blocks/view/TrueFalse.tsx`. Find where `feedbackCorrect`/`feedbackIncorrect` are displayed. Wrap those displays behind `block.showFeedback`:

```tsx
// Only show feedback text if showFeedback is enabled
{block.showFeedback && revealed && (
  <span style={{ fontSize: 13, color: isCorrect ? "#0d9488" : "#ef4444" }}>
    {isCorrect ? (block.feedbackCorrect || "Correct!") : (block.feedbackIncorrect || "Incorrect.")}
  </span>
)}
```

- [ ] **Step 3: Read ShortAnswer view then update it**

Read `src/components/blocks/view/ShortAnswer.tsx`. Add feedback message display after answer check, gated by `block.showFeedback`:

```tsx
{block.showFeedback && block.feedbackMessage && submitted && !isCorrect && (
  <span style={{ fontSize: 13, color: "#475569", marginTop: 4, display: "block" }}>
    {block.feedbackMessage}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/view/Quiz.tsx src/components/blocks/view/TrueFalse.tsx src/components/blocks/view/ShortAnswer.tsx
git commit -m "feat(blocks): show feedback messages in knowledge block view components"
```

---

## Task 5: Add file upload to media block editor forms

**Files:**
- Modify: `src/components/blocks/editor/ImageForm.tsx`
- Modify: `src/components/blocks/editor/VideoForm.tsx`
- Modify: `src/components/blocks/editor/AudioForm.tsx`

The upload button needs access to the current user and courseId. These are available via `useAuth()` and the URL param. Read the existing Editor.tsx to understand how props flow to block forms — the `EditorRenderer` type only passes `block` and `onChange`, so the upload button will need to call `useAuth` directly and read `courseId` from the URL.

- [ ] **Step 1: Update ImageForm to add upload button**

Replace `src/components/blocks/editor/ImageForm.tsx`:

```tsx
import { useRef, useState } from "react";
import { ImageBlock } from "@/types/course";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/components/auth/AuthContext";

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
        <label className="text-sm text-muted-foreground">Image URL</label>
        <div className="flex gap-2">
          <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} />
          {user && (
            <>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
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
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Alt text</label>
        <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Read VideoForm then update it**

Read `src/components/blocks/editor/VideoForm.tsx`. Apply the same upload button pattern using `category: "video"` and `accept="video/mp4,video/webm"`. The `url` field maps to the video block's `url` property.

- [ ] **Step 3: Read AudioForm then update it**

Read `src/components/blocks/editor/AudioForm.tsx`. Apply the same pattern using `category: "audio"` and `accept="audio/mpeg,audio/wav,audio/ogg"`. The `src` field maps to the audio block's `src` property.

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/editor/ImageForm.tsx src/components/blocks/editor/VideoForm.tsx src/components/blocks/editor/AudioForm.tsx
git commit -m "feat(blocks): file upload in Image, Video, Audio editor forms"
```

---

## Task 6: Create Document block editor form

**Files:**
- Create: `src/components/blocks/editor/DocumentForm.tsx`

- [ ] **Step 1: Create DocumentForm**

```tsx
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
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/DocumentForm.tsx
git commit -m "feat(blocks): DocumentForm editor component"
```

---

## Task 7: Create Document block view component

**Files:**
- Create: `src/components/blocks/view/Document.tsx`

- [ ] **Step 1: Create DocumentView**

PDF files are embedded directly via `<iframe>`. DOCX/XLSX/PPTX use Microsoft Office Online viewer, which renders public URLs without authentication. Note: Office Online requires the document URL to be publicly accessible.

```tsx
import { DocumentBlock } from "@/types/course";

const OFFICE_VIEWER = "https://view.officeapps.live.com/op/embed.aspx?src=";

export function DocumentView({ block }: { block: DocumentBlock }) {
  if (!block.src) {
    return (
      <div style={{ padding: 24, background: "#fafffe", border: "1px solid #e0fdf4", borderRadius: 12, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No document set
      </div>
    );
  }

  const isPdf = block.fileType === "pdf";
  const embedSrc = isPdf ? block.src : `${OFFICE_VIEWER}${encodeURIComponent(block.src)}`;

  return (
    <div style={{ margin: "16px 0" }}>
      {block.title && (
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 500 }}>{block.title}</p>
      )}
      <div style={{ border: "1px solid #e0fdf4", borderRadius: 10, overflow: "hidden" }}>
        <iframe
          src={embedSrc}
          style={{ width: "100%", height: 500, border: "none", display: "block" }}
          title={block.title ?? "Document"}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/view/Document.tsx
git commit -m "feat(blocks): DocumentView component with PDF iframe and Office Online viewer"
```

---

## Task 8: Register Document block

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports**

`registry.ts` has two consolidated import lines at the top — one from `@/types/course` (line 2) and one from `lucide-react` (line 35). Do NOT add new import statements; append to the existing ones.

**Append to the `@/types/course` import on line 2:**
Add `DocumentBlock` to the existing destructuring list.

**Append to the `lucide-react` import on line 35:**
Add `File as DocumentIcon` to the existing destructuring list.

**Add two new import lines for the new components (these are new modules, not consolidated):**
```typescript
import { DocumentForm } from "./editor/DocumentForm";
import { DocumentView } from "./view/Document";
```

- [ ] **Step 2: Add document entry to the registry array**

In the `registry` array, add after the audio entry:

```typescript
{
  type: "document",
  label: "Document",
  icon: DocumentIcon,
  create: factories.document,
  Editor: DocumentForm as EditorRenderer<DocumentBlock>,
  View: DocumentView as ViewRenderer<DocumentBlock>,
  category: "Media",
},
```

Also add `"document"` to the allowed upload types in `src/lib/upload.ts` — this was already included in Task 2 step 1.

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/registry.ts
git commit -m "feat(blocks): register document block in registry"
```

---

## Task 9: Bundle media in static web and SCORM exports

**Files:**
- Modify: `src/lib/scorm12.ts`

- [ ] **Step 1: Read the full scorm12.ts file**

Read `src/lib/scorm12.ts` completely before editing. The file is ~440 lines. Pay attention to `exportStaticWebZip` and `exportScorm12Zip`.

- [ ] **Step 2: Add `fetchAndBundleMedia` utility**

Add this function near the top of `scorm12.ts` (after imports, before other functions):

```typescript
/**
 * Finds all media URLs in the course, fetches them, adds them to the ZIP
 * under a `media/` folder, and returns a map of original URL → relative path.
 * Skips URLs that fail to fetch (leaves original URL intact in those cases).
 */
async function fetchAndBundleMedia(
  course: CourseData,
  zip: JSZip
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const mediaFolder = zip.folder("media")!;
  const seen = new Set<string>();

  for (const lesson of course.lessons ?? []) {
    for (const block of lesson.blocks ?? []) {
      const urls: string[] = [];
      if (block.type === "image" && block.src) urls.push(block.src);
      if (block.type === "video" && block.url) urls.push(block.url);
      if (block.type === "audio" && block.src) urls.push(block.src);
      if (block.type === "document" && block.src) urls.push(block.src);

      for (const url of urls) {
        if (!url || seen.has(url)) continue;
        seen.add(url);
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const ext = url.split(".").pop()?.split("?")[0] ?? "bin";
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          mediaFolder.file(filename, blob);
          urlMap.set(url, `media/${filename}`);
        } catch {
          // Failed to fetch — leave original URL in place
        }
      }
    }
  }
  return urlMap;
}
```

- [ ] **Step 3: Update `exportStaticWebZip` to call `fetchAndBundleMedia`**

`exportStaticWebZip` currently generates inline HTML with block data embedded as `var COURSE = {...}`. After generating the ZIP but before returning it:

1. Call `await fetchAndBundleMedia(course, zip)` to get the URL map
2. Apply the URL map to the course JSON before embedding: replace each original URL with the relative `media/` path

The course JSON is serialized with `JSON.stringify`. Apply the URL remapping:

```typescript
// After: const urlMap = await fetchAndBundleMedia(course, zip);
// Replace URLs in serialized course JSON
let courseJson = JSON.stringify(course);
for (const [original, relative] of urlMap) {
  courseJson = courseJson.replaceAll(JSON.stringify(original), JSON.stringify(relative));
}
// Use courseJson (string) instead of JSON.stringify(course) when embedding
```

- [ ] **Step 4: Update `exportScorm12Zip` to bundle media**

`exportScorm12Zip` currently uses an iframe pointing to the live publish URL. To make it truly self-contained, it should embed the static HTML (same as `exportStaticWebZip`) but wrapped with the SCORM manifest.

Find `exportScorm12Zip` and update it to:
1. Generate the same self-contained HTML that `exportStaticWebZip` generates
2. Bundle media using `fetchAndBundleMedia`
3. Include the SCORM manifest
4. Include the bundled HTML as `index.html` in the ZIP

The SCORM `index.html` should be the static HTML (course rendered inline) plus the SCORM 1.2 JS from the current `buildIndexHtml`. Merge the SCORM API JS from the current `buildIndexHtml` into the static HTML template.

- [ ] **Step 5: Confirm callers are already async**

Both `exportStaticWebZip` and `exportScorm12Zip` are already declared `async` in `scorm12.ts` and their callers in `Editor.tsx` already use `await`. No changes needed to function signatures or callers.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scorm12.ts src/pages/Editor.tsx
git commit -m "feat(export): bundle media files into SCORM and static web ZIP exports"
```

---

## Task 10: Add document type to upload allowed types

**Files:**
- Modify: `src/lib/upload.ts`

- [ ] **Step 1: Verify document MIME types in upload.ts**

The `ALLOWED_TYPES.document` array in `upload.ts` (Task 2) already includes the Office MIME types. Verify that `application/pdf` is included. No change needed if correct.

- [ ] **Step 2: Verify in browser end-to-end**

Start dev server (`npm run dev`) and verify:
1. Open editor, add a Quiz block → feedback toggle appears → enable it → enter a message → save → view mode shows message after wrong answer
2. Add an Image block → "Upload" button appears → upload an image → src URL populates
3. Add a Document block → appears in Media category → upload a PDF → iframe renders
4. Export as static web ZIP → open `index.html` locally → media loads from `media/` folder
5. Quiz feedback toggle off → no feedback shown (summative mode)

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat(plan2): block authoring complete — feedback, media upload, document block, bundled exports"
```

---

## Done

Plan 2 complete. Knowledge blocks support formative/summative toggling via `showFeedback`. Media blocks have direct upload. A new Document block supports PDF, DOCX, XLSX, and PPTX. Exports bundle media for offline use.
