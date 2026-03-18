import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

export function registerLessonTools(server: McpServer) {
  server.tool(
    "add_lesson",
    "Add a new lesson to a course",
    {
      course_id: z.string().uuid(),
      title: z.string().min(1),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, title, position }) =>
      withAuth(async (client, userId) => {
        const lessonId = uid();
        const newLesson = { id: lessonId, title, blocks: [] };
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, newLesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to add lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  server.tool(
    "update_lesson",
    "Update a lesson's title, position, or both. At least one of title or position must be provided. Returns an error if lesson_id is not found.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      title: z.string().optional(),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, lesson_id, title, position }) =>
      withAuth(async (client, userId) => {
        if (title === undefined && position === undefined) {
          return err("missing_fields", "At least one of title or position must be provided");
        }

        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = lessons.findIndex((l) => l.id === lesson_id);
          if (idx === -1) {
            lessonNotFound = true;
            return course;
          }

          let lesson = { ...lessons[idx] };
          if (title !== undefined) {
            lesson = { ...lesson, title };
          }
          lessons[idx] = lesson;

          if (position !== undefined) {
            lessons.splice(idx, 1);
            const toIdx = Math.min(position - 1, lessons.length);
            lessons.splice(toIdx, 0, lesson);
          }

          return { ...course, lessons };
        });

        if (lessonNotFound) return err("lesson_not_found", `Lesson not found in course: ${lesson_id}`);
        if (mutError) return err(mutError, "Failed to update lesson");
        return ok({ updated: true });
      })
  );

  server.tool(
    "delete_lesson",
    "Remove a lesson and all its blocks from a course",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.filter((l) => l.id !== lesson_id),
        }));
        if (mutError) return err(mutError, "Failed to delete lesson");
        return ok({ message: "Lesson deleted" });
      })
  );
}
