import { SupabaseClient } from "@supabase/supabase-js";
import { Course } from "./types.js";

/**
 * Fetch a course, apply a mutation function, and save it back.
 * Returns null on success, or an error code string on failure.
 */
export async function mutateCourse(
  client: SupabaseClient,
  userId: string,
  courseId: string,
  mutator: (course: Course) => Course
): Promise<string | null> {
  const { data, error } = await client
    .from("courses")
    .select("content, user_id")
    .eq("id", courseId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return "course_not_found";

  const updated = mutator(data.content as Course);

  const { error: updateError } = await client
    .from("courses")
    .update({ content: updated, title: updated.title })
    .eq("id", courseId)
    .eq("user_id", userId);

  if (updateError) return "update_failed";
  return null;
}
