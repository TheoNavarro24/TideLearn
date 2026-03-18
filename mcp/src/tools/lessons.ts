import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

export function registerLessonTools(server: McpServer) {
  server.tool(
    "list_lessons",
    "List all lessons in a course with their positions",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lessons = (data.content as any).lessons ?? [];
        return ok(lessons.map((l: any, i: number) => ({ id: l.id, title: l.title, position: i + 1 })));
      })
  );

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
    "update_lesson_title",
    "Rename a lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      title: z.string().min(1),
    },
    async ({ course_id, lesson_id, title }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id === lesson_id ? { ...l, title } : l
          ),
        }));
        if (mutError) return err(mutError, "Failed to update lesson");
        return ok({ message: "Lesson title updated" });
      })
  );

  server.tool(
    "reorder_lesson",
    "Move a lesson to a new position (1-based, splice semantics)",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      new_position: z.number().int().positive(),
    },
    async ({ course_id, lesson_id, new_position }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const fromIdx = lessons.findIndex((l) => l.id === lesson_id);
          if (fromIdx === -1) return course;
          const [lesson] = lessons.splice(fromIdx, 1);
          const toIdx = Math.min(new_position - 1, lessons.length);
          lessons.splice(toIdx, 0, lesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to reorder lesson");
        return ok({ message: "Lesson reordered" });
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
