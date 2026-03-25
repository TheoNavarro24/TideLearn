import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCoursesIndex,
  createNewCourse,
  deleteCourse as deleteCourseLocal,
  duplicateCourse as duplicateCourseLocal,
  migrateFromLegacy,
  saveCourse,
  loadCoursesFromCloud,
  deleteCourseFromCloud,
  setCourseVisibility,
  setCourseCoverImage,
  uploadCourseCover,
  duplicateCourseInCloud,
} from "@/lib/courses";
import type { User } from "@supabase/supabase-js";

interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessonCount?: number;
  isPublic?: boolean;
  coverImageUrl?: string | null;
}

export function useCourseList(user: User | null) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseIndex[]>(getCoursesIndex());
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);

  const refresh = () => setCourses(getCoursesIndex());

  const refreshCourses = async () => {
    if (user) {
      const cloudCourses = await loadCoursesFromCloud();
      setCourses(cloudCourses as CourseIndex[]);
    } else {
      setCourses(getCoursesIndex());
    }
  };

  // Legacy migration on mount
  useEffect(() => {
    const migrated = migrateFromLegacy();
    if (migrated) refresh();
  }, []);

  // Load courses when auth state changes
  useEffect(() => {
    refreshCourses();
  }, [user]);

  const createCourse = (title: string) => {
    const t = title.trim() || "Untitled Course";
    const { id } = createNewCourse(t);
    refresh();
    navigate(`/editor?courseId=${id}`);
  };

  const openCourse = (id: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(`/editor?courseId=${id}`));
    } else {
      navigate(`/editor?courseId=${id}`);
    }
  };

  const deleteCourse = async (id: string) => {
    deleteCourseLocal(id);
    if (user) {
      try { await deleteCourseFromCloud(id); } catch (e) { console.error("Failed to delete from cloud:", e); }
    }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const duplicateCourse = async (id: string) => {
    const newId = duplicateCourseLocal(id);
    if (!newId) return;
    if (user) {
      try { await duplicateCourseInCloud(id, newId, user.id); } catch (e) { console.error("Cloud duplication failed", e); }
    }
    await refreshCourses();
    navigate(`/editor?courseId=${newId}`);
  };

  const handleCoverUpload = async (courseId: string, file: File) => {
    if (!user) return;
    setUploadingCoverId(courseId);
    try {
      const url = await uploadCourseCover(user.id, courseId, file);
      await setCourseCoverImage(courseId, url);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, coverImageUrl: url } : c)));
    } catch (e) {
      console.error("Cover upload failed", e);
    } finally {
      setUploadingCoverId(null);
    }
  };

  const handleToggleVisibility = async (courseId: string, current: boolean) => {
    if (!user) return;
    const next = !current;
    try {
      await setCourseVisibility(courseId, next);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isPublic: next } : c)));
    } catch (e) {
      console.error("Visibility toggle failed", e);
    }
  };

  const importCourse = async (file: File, onSuccess: () => void) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.lessons) throw new Error("Invalid");
      const { id } = createNewCourse(data.title || "Imported Course");
      saveCourse(id, { schemaVersion: 1, title: data.title || "Imported Course", lessons: data.lessons });
      refresh();
      navigate(`/editor?courseId=${id}`);
    } catch (e) {
      alert("Import failed");
    } finally {
      onSuccess();
    }
  };

  return {
    courses, refreshCourses, uploadingCoverId,
    createCourse, openCourse, deleteCourse, duplicateCourse,
    handleCoverUpload, handleToggleVisibility, importCourse,
  };
}
