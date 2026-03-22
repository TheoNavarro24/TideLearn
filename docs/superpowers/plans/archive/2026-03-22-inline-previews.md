# Inline Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline image and video previews to editor forms, and extract shared video URL utilities.

**Architecture:** New shared utility `src/lib/video.ts` for YouTube/Vimeo/direct URL detection. ImageForm and VideoForm get preview sections below their inputs. VideoView is refactored to use the shared utility (preserving its current fallback behavior for unknown URLs).

**Tech Stack:** React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-22-inline-previews-design.md`

**Prerequisite:** Plan 1 (Block Form UX) must be implemented first — it introduces FieldLabel which these forms use.

---

### Task 1: Create shared video utility

**Files:**
- Create: `src/lib/video.ts`

- [ ] **Step 1: Create the video utility module**

```typescript
// src/lib/video.ts
export function isYouTube(url: string): boolean {
  return /youtube\.com\/.+v=|youtu\.be\//.test(url);
}

export function youTubeEmbedUrl(url: string): string | null {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isVimeo(url: string): boolean {
  return /vimeo\.com\//.test(url);
}

export function vimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export type VideoEmbedResult = {
  type: "youtube" | "vimeo" | "direct" | "unknown";
  src: string | null;
};

export function getVideoEmbed(url: string): VideoEmbedResult {
  const yt = youTubeEmbedUrl(url);
  if (yt) return { type: "youtube", src: yt };
  const vm = vimeoEmbedUrl(url);
  if (vm) return { type: "vimeo", src: vm };
  if (isDirectVideo(url)) return { type: "direct", src: url };
  return { type: "unknown", src: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/video.ts
git commit -m "feat: add shared video URL detection utility"
```

---

### Task 2: Refactor VideoView to use shared utility

**Files:**
- Modify: `src/components/blocks/view/Video.tsx`

- [ ] **Step 1: Refactor VideoView**

Replace the entire file:

```tsx
import { VideoBlock } from "@/types/course";
import { getVideoEmbed } from "@/lib/video";

export function VideoView({ block }: { block: VideoBlock }) {
  const { url } = block;
  const embed = getVideoEmbed(url);

  if (embed.type === "youtube" || embed.type === "vimeo") {
    return (
      <div className="aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-md border">
        <iframe
          src={embed.src!}
          title="Embedded video"
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // For "direct" AND "unknown" — preserve current fallback behavior.
  // VideoView has always rendered a <video> element for any non-YouTube/non-Vimeo URL.
  // The "unknown" hint is editor-only (VideoForm shows it, VideoView does not).
  return (
    <div className="w-full max-w-3xl mx-auto">
      <video controls className="w-full rounded-md border" src={url} preload="metadata" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/view/Video.tsx
git commit -m "refactor: VideoView uses shared video utility, preserves unknown URL fallback"
```

---

### Task 3: ImageForm inline preview

**Files:**
- Modify: `src/components/blocks/editor/ImageForm.tsx`

- [ ] **Step 1: Add image preview section below inputs**

Add state and timeout logic for the preview:

```tsx
import { useRef, useState, useEffect } from "react";
```

Inside the component, after existing state, add:

```tsx
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
```

After the closing `</div>` of the `sm:grid-cols-2` grid, add the preview section:

```tsx
{/* Image preview */}
<div style={{ marginTop: 8 }}>
  {imgStatus === "empty" && (
    <p className="text-xs text-muted-foreground" style={{ padding: "16px 0" }}>No image set</p>
  )}
  {imgStatus === "error" && (
    <p className="text-xs text-destructive" style={{ padding: "16px 0" }}>Image failed to load — check the URL</p>
  )}
  {block.src && (
    <img
      src={block.src}
      alt={block.alt || "Preview"}
      onLoad={() => { clearTimeout(timeoutRef.current); setImgStatus("loaded"); }}
      onError={() => { clearTimeout(timeoutRef.current); setImgStatus("error"); }}
      style={{
        maxHeight: 200,
        objectFit: "contain",
        borderRadius: 6,
        display: imgStatus === "loaded" ? "block" : "none",
      }}
    />
  )}
</div>
```

Wrap the entire return in a fragment or outer div if needed — the current return is a single `<div className="grid gap-2 sm:grid-cols-2">`. Change the outer element to:

```tsx
return (
  <div className="space-y-2">
    <div className="grid gap-2 sm:grid-cols-2">
      {/* existing URL + alt inputs */}
    </div>
    {/* preview section from above */}
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/editor/ImageForm.tsx
git commit -m "feat: ImageForm shows inline image preview with load/error states"
```

---

### Task 4: VideoForm inline preview

**Files:**
- Modify: `src/components/blocks/editor/VideoForm.tsx`

- [ ] **Step 1: Add debounced video preview**

Add imports:
```tsx
import { useState, useEffect, useRef } from "react";
import { getVideoEmbed } from "@/lib/video";
```

Inside the component, after existing state, add:

```tsx
const [debouncedUrl, setDebouncedUrl] = useState(block.url);

useEffect(() => {
  const t = setTimeout(() => setDebouncedUrl(block.url), 500);
  return () => clearTimeout(t);
}, [block.url]);

const embed = debouncedUrl ? getVideoEmbed(debouncedUrl) : null;
```

After the existing input section's closing `</div>`, add the preview:

```tsx
{/* Video preview */}
<div style={{ marginTop: 8 }}>
  {!debouncedUrl && (
    <p className="text-xs text-muted-foreground" style={{ padding: "16px 0" }}>No video set</p>
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
    <p className="text-xs text-amber-600" style={{ padding: "16px 0" }}>
      URL not recognised — supported: YouTube, Vimeo, or direct .mp4/.webm
    </p>
  )}
</div>
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/VideoForm.tsx
git commit -m "feat: VideoForm shows inline video preview with 500ms debounce"
```
