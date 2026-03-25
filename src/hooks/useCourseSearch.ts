import { useEffect, useMemo, useState } from "react";

interface CourseIndex {
  id: string;
  title: string;
  updatedAt: string | number;
  lessonCount?: number;
  isPublic?: boolean;
  coverImageUrl?: string | null;
}

export function useCourseSearch(courses: CourseIndex[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredCourses = useMemo(
    () => courses.filter((c) => c.title.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [courses, debouncedSearch]
  );

  return { searchTerm, setSearchTerm, filteredCourses };
}
