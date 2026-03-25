import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCourse, saveCourseToCloud } from "@/lib/courses";
import type { Course } from "@/types/course";
import type { User } from "@supabase/supabase-js";

export function useCourseAutosave(
  courseId: string | null,
  courseData: Course,
  user: User | null,
) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const saveNow = async () => {
    setIsSaving(true);
    try {
      if (courseId) {
        saveCourse(courseId, courseData);
        if (user) {
          await saveCourseToCloud(courseId, courseData, user.id);
        }
      } else {
        localStorage.setItem("editor:course", JSON.stringify(courseData));
      }
      toast({ title: "Saved" });
    } catch (e) {
      toast({ title: "Save failed" });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      try {
        if (courseId) {
          saveCourse(courseId, courseData);
          if (user) {
            await saveCourseToCloud(courseId, courseData, user.id);
          }
        } else {
          localStorage.setItem("editor:course", JSON.stringify(courseData));
        }
      } catch (e) {
        console.error("Autosave failed:", e);
        toast({ title: "Autosave failed", description: "Your changes may not be saved", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [courseData, courseId, user]);

  return { isSaving, saveNow };
}
