import {
  uid,
  type Course,
  type Lesson,
  type HeadingBlock,
  type TextBlock,
  type TocBlock,
} from "@/types/course";
import { supabase } from "@/integrations/supabase/client";

export type CourseIndexItem = { id: string; title: string; updatedAt: number };

const INDEX_KEY = "courses:index";
const COURSE_KEY = (id: string) => `course:${id}`;
const LEGACY_KEY = "editor:course";
const LEGACY_MIGRATED_KEY = "editor:course:migrated";

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
    return JSON.parse(raw) as Course;
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
  const welcome: Lesson = {
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
      lessons: parsed.lessons as Lesson[],
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
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

/** Save or update a course in Supabase.
 *  is_public defaults to true so that share links work for anyone,
 *  including visitors who are not logged in.
 */
export async function saveCourseToCloud(
  id: string,
  course: Course,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("courses").upsert({
    id,
    user_id: userId,
    title: course.title || "Untitled Course",
    content: course as unknown as import("@/integrations/supabase/types").Json,
    is_public: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
  if (error || !data) return null;
  return data.content as unknown as Course;
}
