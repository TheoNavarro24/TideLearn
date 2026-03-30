import * as path from "path";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
};

/** All supported file extensions (with dot prefix). */
export const SUPPORTED_EXTENSIONS = Object.keys(MIME_MAP);

/**
 * Returns the MIME type for a file path based on its extension.
 * Returns null if the extension is not supported.
 */
export function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? null;
}
