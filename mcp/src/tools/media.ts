import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err, getStorageClient } from "../lib/supabase.js";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function registerMediaTools(server: McpServer) {
  server.tool(
    "upload_media",
    "Upload a media file from your Mac to TideLearn's storage. Returns a public URL you can use in image/video/audio blocks.",
    {
      file_path: z.string().describe("Absolute path to the file on your Mac"),
      course_id: z.string().uuid().describe("The course this media belongs to, used to organise storage"),
    },
    async ({ file_path, course_id }) =>
      withAuth(async (_client, userId) => {
        // Validate file exists
        if (!fs.existsSync(file_path)) {
          return err("file_not_found", `No file at path: ${file_path}`);
        }

        // Validate size
        const { size } = fs.statSync(file_path);
        if (size > MAX_SIZE_BYTES) {
          return err("file_too_large", `File is ${Math.round(size / 1024 / 1024)}MB. Maximum is 50MB.`);
        }

        // Validate type
        const ext = path.extname(file_path).toLowerCase().slice(1);
        const contentType = ALLOWED_TYPES[ext];
        if (!contentType) {
          return err("unsupported_file_type", `File type .${ext} is not supported. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`);
        }

        // Upload to Supabase Storage
        const filename = `${Date.now()}-${path.basename(file_path)}`;
        const storagePath = `${userId}/${course_id}/${filename}`;
        const fileBuffer = fs.readFileSync(file_path);

        const storage = getStorageClient();
        const { error } = await storage.storage
          .from("course-media")
          .upload(storagePath, fileBuffer, { contentType, upsert: false });

        if (error) return err("storage_error", error.message);

        const { data: urlData } = storage.storage.from("course-media").getPublicUrl(storagePath);
        return ok({ url: urlData.publicUrl, path: storagePath });
      })
  );
}
