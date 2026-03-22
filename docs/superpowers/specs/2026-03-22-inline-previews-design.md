# Spec 2: Inline Previews

> Let authors see what they're producing without leaving the editor.

## Context

Currently, the only way to see how a block renders to learners is to click "Preview" which opens the entire course in a new tab. For media blocks (image, video), the editor form shows only a URL input with no visual feedback — the author has no way to verify the URL works or see what the learner will see. This creates a guess-and-check workflow that slows authoring and leads to broken media being published unnoticed.

This is **Spec 2 of 3** in the Block Polish series:
- Spec 1: Block Form UX (complete)
- **Spec 2: Inline Previews** (this document)
- Spec 3: Validation & Mandatory Fields

## Changes

### 1. Image thumbnail preview

**Current:** ImageForm shows a URL input and an alt text input. No visual feedback.

**After:** Below the URL/alt inputs, show a live thumbnail preview of the image:
- When `block.src` is a valid URL and the image loads: render `<img>` at max 200px height with rounded corners
- When `block.src` is empty: show a light placeholder ("No image set")
- When `block.src` is set but the image fails to load: show an error state ("Image failed to load — check the URL")

Uses an `<img>` element with `onLoad` / `onError` handlers to detect success/failure. For CORS cases where `onError` may not fire, add a 10-second timeout that falls back to the error state. No external dependencies.

**Files changed:**
- `src/components/blocks/editor/ImageForm.tsx` — add preview section below inputs

**Cascade:** None. This is purely an editor form addition.

### 2. Video embed preview

**Current:** VideoForm shows a URL input. No visual feedback. The author cannot tell if a YouTube URL was pasted correctly.

**After:** Below the URL input, show a live preview (debounced — 500ms after last keystroke to avoid rapid iframe reloads while typing):
- **YouTube URL detected:** render the YouTube embed iframe (same as VideoView does)
- **Vimeo URL detected:** render the Vimeo embed iframe
- **Direct .mp4/.webm URL:** render a `<video>` element with controls
- **Empty URL:** show a light placeholder ("No video set")
- **Unrecognised URL format:** show a hint ("URL not recognised — supported: YouTube, Vimeo, or direct .mp4/.webm")

The YouTube/Vimeo URL detection logic currently lives inline in `src/components/blocks/view/Video.tsx` (functions `isYouTube`, `youTubeEmbed`, `isVimeo`, `vimeoEmbed`). This logic needs to be **extracted into a shared utility** so both VideoView and VideoForm can use it without duplication.

**Files changed:**
- `src/lib/video.ts` — **new file**: shared YouTube/Vimeo URL detection + embed URL generation
- `src/components/blocks/editor/VideoForm.tsx` — add preview section below input, import from `src/lib/video.ts`
- `src/components/blocks/view/Video.tsx` — refactor to import from `src/lib/video.ts` instead of inline functions

**Cascade:**
- `src/components/blocks/view/Video.tsx` — refactored to use `getVideoEmbed()`. **Minor behavioral change:** the current view treats ALL non-YouTube/non-Vimeo URLs as direct `<video>` elements (unconditional else fallback). After the refactor, only URLs matching `.mp4`/`.webm` extensions render as `<video>`. For the `"unknown"` type, `VideoView` should **preserve the current fallback** and render a `<video>` element (not the "unrecognised" hint — that's editor-only). This ensures existing courses with extensionless video URLs continue to work.
- **SCORM export** (`src/lib/scorm12.ts`) — contains its own `videoEmbed()` function embedded as a string template inside `buildStaticIndexHtml()`. This cannot import from a shared module since it's runtime JS baked into the HTML output. **No change.** The duplication is unavoidable here. Note: the SCORM regex uses `[\w-]+` for YouTube IDs while the shared util uses `[^&#]+` — these are equivalent in practice but syntactically different. Do not attempt to synchronize them.
- **MCP preview** (`mcp/src/tools/preview.ts`) — renders video as `[Video: ${url}]` placeholder text, does not embed. **No change.**

### 3. Shared video utility

**New file:** `src/lib/video.ts`

```typescript
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

export function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "direct" | "unknown"; src: string | null } {
  const yt = youTubeEmbedUrl(url);
  if (yt) return { type: "youtube", src: yt };
  const vm = vimeoEmbedUrl(url);
  if (vm) return { type: "vimeo", src: vm };
  if (isDirectVideo(url)) return { type: "direct", src: url };
  return { type: "unknown", src: null };
}
```

This centralises all video URL handling. `VideoView` and `VideoForm` both call `getVideoEmbed(url)` and branch on the result.

## Files changed summary

| File | Change type |
|---|---|
| `src/components/blocks/editor/ImageForm.tsx` | Add thumbnail preview |
| `src/components/blocks/editor/VideoForm.tsx` | Add embed preview, import shared util |
| `src/components/blocks/view/Video.tsx` | Refactor to import shared util (preserves current fallback for unknown URLs) |
| `src/lib/video.ts` | **New file** — shared video URL detection |

## What this does NOT change

- **Audio/Document blocks** — no inline preview (audio can't be meaningfully previewed visually, document preview would require PDF rendering infrastructure)
- **Zod schemas** — no validation changes (Spec 3)
- **SCORM/MCP renderers** — no changes (SCORM has its own baked-in video logic, MCP preview uses placeholder text)
- **Block forms other than Image and Video** — no changes

## Risks

1. **YouTube iframe in editor performance** — embedding a YouTube iframe inside every video block's editor form could slow down the editor if many video blocks are present. Mitigation: only render the iframe when the URL has changed (debounce) and use `loading="lazy"` on the iframe.

2. **Image preview with large files** — showing a preview of a very large image could cause layout jank. Mitigation: constrain to `max-height: 200px` with `object-fit: contain`.

3. **CORS on image error detection** — some image URLs may not trigger proper `onError` events due to CORS. The preview should handle this gracefully by falling back to the "check the URL" state after a timeout.
