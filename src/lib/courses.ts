import { uid, type Course, type Lesson } from "@/types/course";

export type CourseIndexItem = { id: string; title: string; updatedAt: number };

const INDEX_KEY = "courses:index";
const COURSE_KEY = (id: string) => `course:${id}`;
const LEGACY_KEY = "editor:course";

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
      { id: uid(), type: "heading", text: `Welcome to ${title}` } as any,
      { id: uid(), type: "text", text: "Write a short course description here." } as any,
      { id: uid(), type: "toc" } as any,
    ],
  };
  const course: Course = { schemaVersion: 1, title, lessons: [welcome] } as Course;
  const id = uid();
  saveCourse(id, course);
  return { id, course };
}

export function exportCourseJSON(course: Course): string {
  return JSON.stringify(course, null, 2);
}

export function migrateFromLegacy(): string | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.lessons) return null;
    const id = uid();
    const course: Course = { schemaVersion: 1, title: parsed.title || "Imported Course", lessons: parsed.lessons } as Course;
    saveCourse(id, course);
    // Optionally keep legacy; we won't delete it to avoid data loss
    return id;
  } catch {
    return null;
  }
}
