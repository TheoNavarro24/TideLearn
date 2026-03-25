import {
  uid,
  type Course,
  type Lesson,
  type HeadingBlock,
  type TextBlock,
  type TocBlock,
} from "@/types/course";
import type { ContentLesson } from "@/types/course";
import { supabase } from "@/integrations/supabase/client";

export type CourseIndexItem = {
  id: string;
  title: string;
  updatedAt: number;
  isPublic?: boolean;
  coverImageUrl?: string | null;
};

const INDEX_KEY = "courses:index";
const COURSE_KEY = (id: string) => `course:${id}`;
const LEGACY_KEY = "editor:course";
const LEGACY_MIGRATED_KEY = "editor:course:migrated";

/** Adds kind: "content" to any lesson that is missing it. Safe to call multiple times. */
function migrateLessons(course: Course): Course {
  return {
    ...course,
    lessons: course.lessons.map((l: any) =>
      l.kind ? l : { ...l, kind: "content" }
    ) as Course["lessons"],
  };
}

/** Adds kind: "mcq" to any assessment question missing it. Safe to call multiple times. */
function migrateQuestions(course: Course): Course {
  return {
    ...course,
    lessons: course.lessons.map((l: any) => {
      if (l.kind !== "assessment") return l;
      return {
        ...l,
        questions: (l.questions ?? []).map((q: any) =>
          q.kind ? q : { ...q, kind: "mcq" }
        ),
      };
    }) as Course["lessons"],
  };
}

export function getCoursesIndex(): CourseIndexItem[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

function setCoursesIndex(next: CourseIndexItem[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {}
}

export function loadCourse(id: string): Course | null {
  try {
    const raw = localStorage.getItem(COURSE_KEY(id));
    if (!raw) return null;
    return migrateQuestions(migrateLessons(JSON.parse(raw) as Course));
  } catch {
    return null;
  }
}

export function saveCourse(id: string, course: Course) {
  try {
    localStorage.setItem(COURSE_KEY(id), JSON.stringify(course));
  } catch {}
  const index = getCoursesIndex();
  const exists = index.find((i) => i.id === id);
  const item: CourseIndexItem = { id, title: course.title || "Untitled Course", updatedAt: Date.now() };
  const next = exists ? index.map((i) => (i.id === id ? item : i)) : [item, ...index];
  setCoursesIndex(next);
}

export function deleteCourse(id: string) {
  try { localStorage.removeItem(COURSE_KEY(id)); } catch {}
  const next = getCoursesIndex().filter((i) => i.id !== id);
  setCoursesIndex(next);
}

export function renameCourse(id: string, title: string) {
  const index = getCoursesIndex();
  const item = index.find((i) => i.id === id);
  if (item) {
    item.title = title;
    item.updatedAt = Date.now();
    setCoursesIndex([...index]);
  }
  const c = loadCourse(id);
  if (c) saveCourse(id, { ...c, title });
}

export function duplicateCourse(id: string): string | null {
  const c = loadCourse(id);
  if (!c) return null;
  const newId = uid();
  const copy: Course = JSON.parse(JSON.stringify(c));
  copy.title = `${c.title} (Copy)`;
  saveCourse(newId, copy);
  return newId;
}

export function createNewCourse(title = "New Course"): { id: string; course: Course } {
  // Create default with Welcome + TOC
  const welcome: ContentLesson = {
    kind: "content",
    id: uid(),
    title: "Welcome",
    blocks: [
      { id: uid(), type: "heading", text: `Welcome to ${title}` } as HeadingBlock,
      { id: uid(), type: "text", text: "Write a short course description here." } as TextBlock,
      { id: uid(), type: "toc" } as TocBlock,
    ],
  };
  const course: Course = { schemaVersion: 1, title, lessons: [welcome] };
  const id = uid();
  saveCourse(id, course);
  return { id, course };
}

export function exportCourseJSON(course: Course): string {
  return JSON.stringify(course, null, 2);
}

export function migrateFromLegacy(): string | null {
  try {
    // Avoid duplicating migrations
    const already = localStorage.getItem(LEGACY_MIGRATED_KEY);
    if (already === "1") return null;

    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.lessons) return null;
    const id = uid();
    const course: Course = {
      schemaVersion: 1,
      title: parsed.title || "Imported Course",
      lessons: (parsed.lessons as any[]).map((l: any) =>
        l.kind ? l : { ...l, kind: "content" }
      ) as Lesson[],
    };
    saveCourse(id, course);
    // Mark as migrated so this runs only once
    try { localStorage.setItem(LEGACY_MIGRATED_KEY, "1"); } catch {}
    // We intentionally keep the legacy key to avoid data loss
    return id;
  } catch {
    return null;
  }
}

/** Load all courses for the current logged-in user from Supabase */
export async function loadCoursesFromCloud(): Promise<CourseIndexItem[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, updated_at, is_public, cover_image_url")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: new Date(row.updated_at).getTime(),
    isPublic: row.is_public,
    coverImageUrl: row.cover_image_url,
  }));
}

/** Save or update a course in Supabase.
 *  Does NOT touch is_public — visibility is managed exclusively via setCourseVisibility.
 *  Cover image only written when explicitly provided via options.
 */
export async function saveCourseToCloud(
  id: string,
  course: Course,
  userId: string,
  options?: { coverImageUrl?: string | null }
): Promise<void> {
  const upsertData: Record<string, unknown> = {
    id,
    user_id: userId,
    title: course.title || "Untitled Course",
    content: course as unknown as import("@/integrations/supabase/types").Json,
    updated_at: new Date().toISOString(),
  };
  if (options?.coverImageUrl !== undefined) {
    upsertData.cover_image_url = options.coverImageUrl;
  }
  const { error } = await supabase.from("courses").upsert(upsertData);
  if (error) throw error;
}

export async function setCourseVisibility(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setCourseCoverImage(id: string, coverImageUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadCourseCover(
  userId: string,
  courseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${courseId}/cover.${ext}`;
  const { error } = await supabase.storage
    .from("course-media")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("course-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function duplicateCourseInCloud(
  sourceId: string,
  newId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("courses")
    .select("content, title")
    .eq("id", sourceId)
    .single();
  if (error || !data) throw error ?? new Error("Source course not found");
  const { error: insertError } = await supabase.from("courses").insert({
    id: newId,
    user_id: userId,
    title: `${data.title} (Copy)`,
    content: data.content,
    is_public: false,
    updated_at: new Date().toISOString(),
  });
  if (insertError) throw insertError;
}

/** Delete a course from Supabase */
export async function deleteCourseFromCloud(id: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

/** Load a single course from Supabase.
 *  Works for unauthenticated visitors as long as is_public = true (RLS policy allows it).
 */
export async function loadCourseFromCloud(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("content")
    .eq("id", id)
    .single();
  if (error) {
    console.error(`[loadCourseFromCloud] Failed to load course ${id}:`, error);
    return null;
  }
  if (!data) return null;
  return data.content as unknown as Course;
}
