# Plan 1: Course Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cover images and a visibility toggle to courses, and ensure course duplication works end-to-end for both local and cloud-saved courses.

**Architecture:** `cover_image_url` and `is_public` are Supabase columns (not in the course JSON blob). The Courses page fetches both when listing cloud courses. Cover image upload uses the existing `course-media` Supabase Storage bucket. Visibility is a toggle on each card that calls a new `setCourseVisibility` function.

**Tech Stack:** React, TypeScript, Supabase JS client, Supabase Storage (`course-media` bucket), existing inline-style UI patterns (no Tailwind classes in Courses.tsx).

---

## File Map

| File | Change |
|------|--------|
| `src/integrations/supabase/types.ts` | Add `cover_image_url` column to `courses` Row/Insert/Update types |
| `src/lib/courses.ts` | Extend `CourseIndexItem`, update `loadCoursesFromCloud`, update `saveCourseToCloud`, add `setCourseVisibility`, add `duplicateCourseInCloud`, add `uploadCourseCover` |
| `src/pages/Courses.tsx` | Update card UI (cover image + visibility toggle), wire duplication to cloud, add cover upload handler |

---

## Task 1: Add `cover_image_url` to Supabase types

**Files:**
- Modify: `src/integrations/supabase/types.ts`

> **Note:** This is a TypeScript types file only — it reflects the DB schema. You must also run the SQL migration in Supabase (see step below).

- [ ] **Step 1: Add the column to the TypeScript types**

In `src/integrations/supabase/types.ts`, add `cover_image_url` to the `courses` Row, Insert, and Update types:

```typescript
// In Row:
cover_image_url: string | null

// In Insert:
cover_image_url?: string | null

// In Update:
cover_image_url?: string | null
```

- [ ] **Step 2: Run SQL migration in Supabase**

In the Supabase dashboard SQL editor (or via CLI), run:

```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url text;
```

- [ ] **Step 3: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat(schema): add cover_image_url column to courses table"
```

---

## Task 2: Extend `CourseIndexItem` and cloud functions

**Files:**
- Modify: `src/lib/courses.ts`

- [ ] **Step 1: Extend `CourseIndexItem` type**

At line 11 of `src/lib/courses.ts`, replace:

```typescript
export type CourseIndexItem = { id: string; title: string; updatedAt: number };
```

With:

```typescript
export type CourseIndexItem = {
  id: string;
  title: string;
  updatedAt: number;
  isPublic?: boolean;
  coverImageUrl?: string | null;
};
```

- [ ] **Step 2: Update `loadCoursesFromCloud` to fetch new fields**

Replace the existing `loadCoursesFromCloud` function (lines 131–142):

```typescript
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
```

- [ ] **Step 3: Update `saveCourseToCloud` to accept an optional cover image**

Replace the existing `saveCourseToCloud` function (lines 148–162). The signature adds an optional `coverImageUrl` parameter but deliberately does NOT touch `is_public` — visibility is managed exclusively via `setCourseVisibility` so that editor auto-saves never accidentally flip a private course back to public.

```typescript
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
  // Only set is_public on first insert (handled by DB default or RLS).
  // Cover image only included when explicitly provided.
  if (options?.coverImageUrl !== undefined) {
    upsertData.cover_image_url = options.coverImageUrl;
  }
  const { error } = await supabase.from("courses").upsert(upsertData);
  if (error) throw error;
}
```

> **Note:** Existing callers in `Editor.tsx` use the 3-argument form — this change is fully backward-compatible since `options` is optional.

- [ ] **Step 4: Add `setCourseVisibility` function**

Append after `saveCourseToCloud`:

```typescript
export async function setCourseVisibility(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: Add `setCourseCoverImage` function**

```typescript
export async function setCourseCoverImage(id: string, coverImageUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 6: Add `uploadCourseCover` function**

```typescript
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
```

- [ ] **Step 7: Add `duplicateCourseInCloud` function**

The caller passes `newId` so the local and cloud copies share the same ID (avoids split-brain between localStorage and Supabase).

```typescript
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
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/courses.ts
git commit -m "feat(courses): extend cloud functions — visibility, cover image, cloud duplication"
```

---

## Task 3: Update the Courses page UI

**Files:**
- Modify: `src/pages/Courses.tsx`

This file uses inline styles. Follow the existing pattern — no Tailwind classes.

- [ ] **Step 1: Import new functions**

Find the imports from `@/lib/courses` (around line 12–22) and add the four new exports to the existing import statement:

```typescript
import {
  // existing imports...
  setCourseVisibility,
  setCourseCoverImage,
  uploadCourseCover,
  duplicateCourseInCloud,
} from "@/lib/courses";
```

> Note: `Courses.tsx` does not import `supabase` directly — all Supabase access goes through `@/lib/courses`. Do not add a Supabase client import.

- [ ] **Step 2: Update the course list state type**

The Courses page maintains a local list of `CourseIndex` items (defined at line 26–31 as `interface CourseIndex`). Update it to include the new fields:

```typescript
interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessons?: unknown[];
  isPublic?: boolean;
  coverImageUrl?: string | null;
}
```

- [ ] **Step 3: Add a cover image upload handler**

Inside the `Courses` component, add:

```typescript
const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);

async function handleCoverUpload(courseId: string, file: File) {
  if (!user) return;
  setUploadingCoverId(courseId);
  try {
    const url = await uploadCourseCover(user.id, courseId, file);
    await setCourseCoverImage(courseId, url);
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, coverImageUrl: url } : c)
    );
  } catch (e) {
    console.error("Cover upload failed", e);
  } finally {
    setUploadingCoverId(null);
  }
}
```

- [ ] **Step 4: Add a visibility toggle handler**

```typescript
async function handleToggleVisibility(courseId: string, current: boolean) {
  if (!user) return;
  const next = !current;
  try {
    await setCourseVisibility(courseId, next);
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, isPublic: next } : c)
    );
  } catch (e) {
    console.error("Visibility toggle failed", e);
  }
}
```

- [ ] **Step 5: Update the duplicate handler and add a cloud-aware refresh helper**

First, add a `refreshCourses` helper inside the component (the existing `refresh` helper only reads localStorage — this one also fetches from cloud for logged-in users):

```typescript
async function refreshCourses() {
  if (user) {
    const cloudCourses = await loadCoursesFromCloud();
    setCourses(cloudCourses);
  } else {
    setCourses(getCoursesIndex());
  }
}
```

Then find the existing duplicate handler (search for `duplicateCourse`) and replace it:

```typescript
async function handleDuplicate(id: string) {
  // Duplicate locally — this generates the shared newId
  const newId = duplicateCourse(id);
  if (!newId) return;
  // Mirror in cloud using the same ID so local and cloud stay in sync
  if (user) {
    try {
      await duplicateCourseInCloud(id, newId, user.id);
    } catch (e) {
      console.error("Cloud duplication failed", e);
    }
  }
  await refreshCourses();
}
```

- [ ] **Step 6: Add cover image area to each course card**

Find the course card rendering in `Courses.tsx`. Each card should have a clickable cover image area at the top. Add before the card's title/content area:

```tsx
{/* Cover image area */}
<div
  style={{
    height: 120,
    background: course.coverImageUrl
      ? `url(${course.coverImageUrl}) center/cover no-repeat`
      : "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
    borderRadius: "10px 10px 0 0",
    position: "relative",
    cursor: user ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
  onClick={() => {
    if (!user) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleCoverUpload(course.id, file);
    };
    input.click();
  }}
  title={user ? "Click to upload cover image" : undefined}
>
  {!course.coverImageUrl && (
    <span style={{ fontSize: 28, opacity: 0.5 }}>
      {course.title.charAt(0).toUpperCase()}
    </span>
  )}
  {uploadingCoverId === course.id && (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 12, borderRadius: "10px 10px 0 0"
    }}>
      Uploading…
    </div>
  )}
</div>
```

- [ ] **Step 7: Add visibility toggle to each card**

In the card's action area (near the dropdown), add a visibility toggle button visible only when the user is logged in:

```tsx
{user && (
  <button
    onClick={(e) => { e.stopPropagation(); handleToggleVisibility(course.id, course.isPublic ?? true); }}
    title={course.isPublic !== false ? "Public — click to make private" : "Private — click to make public"}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px 6px",
      borderRadius: 6,
      color: course.isPublic !== false ? "#0d9488" : "#94a3b8",
      fontSize: 13,
    }}
  >
    {course.isPublic !== false ? "🌐" : "🔒"}
  </button>
)}
```

- [ ] **Step 8: Disable share link for private courses**

`Courses.tsx` uses a custom `<DropItem>` component (not `DropdownMenuItem`). Read the file to find the "Copy share link" `<DropItem>` and update its `onClick` to guard against private courses:

```tsx
<DropItem
  icon="🔗"
  label={course.isPublic !== false ? "Copy share link" : "Copy share link (private)"}
  onClick={() => {
    if (course.isPublic === false) return;
    setOpenDropdownId(null);
    navigator.clipboard.writeText(`${window.location.origin}/view?id=${course.id}`);
  }}
/>
```

> The exact icon and label text may differ — read the existing `<DropItem>` for "Copy share link" and update only the `onClick` guard and label. Do not change the icon.

- [ ] **Step 9: Verify end-to-end in browser**

Start dev server (`npm run dev`), log in, go to Courses page:
1. Create a new course → card shows gradient placeholder with initial letter
2. Click the cover area → file picker opens → upload an image → cover appears
3. Click 🌐 → changes to 🔒, course is private
4. Click 🔒 → changes back to 🌐
5. Duplicate a course → duplicated course appears in list
6. Verify duplicated course opens in editor with "(Copy)" title

- [ ] **Step 10: Commit**

```bash
git add src/pages/Courses.tsx
git commit -m "feat(courses): cover images, visibility toggle, cloud duplication"
```

---

## Done

Plan 1 complete. The Courses page now supports cover images (upload to Supabase Storage), per-course visibility toggling (public/private), and full cloud duplication.
