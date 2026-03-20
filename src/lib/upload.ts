import { supabase } from "@/integrations/supabase/client";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
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
