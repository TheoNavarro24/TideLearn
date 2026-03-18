import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { uid } from "../lib/uid.js";

export function registerCourseTools(server: McpServer) {
  server.tool("list_courses", "List all courses for the logged-in user", {}, async () =>
    withAuth(async (client, userId) => {
      const { data, error } = await client
        .from("courses")
        .select("id, title, is_public, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) return err("query_failed", error.message);
      return ok(data);
    })
  );

  server.tool(
    "get_course",
    "Get the full content of a course including all lessons and blocks",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("id, title, is_public, content, created_at, updated_at")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        return ok(data);
      })
  );

  server.tool(
    "create_course",
    "Create a new empty course",
    { title: z.string().min(1) },
    async ({ title }) =>
      withAuth(async (client, userId) => {
        const content = { schemaVersion: 1, title, lessons: [] };
        const { data, error } = await client
          .from("courses")
          .insert({ user_id: userId, title, content, is_public: false })
          .select("id")
          .single();

        if (error || !data) return err("insert_failed", error?.message ?? "Unknown error");
        return ok({ course_id: data.id });
      })
  );

  server.tool(
    "update_course_title",
    "Rename a course",
    { course_id: z.string().uuid(), title: z.string().min(1) },
    async ({ course_id, title }) =>
      withAuth(async (client, userId) => {
        const { mutateCourse } = await import("../lib/mutate.js");
        const error = await mutateCourse(client, userId, course_id, (c) => ({
          ...c,
          title,
        }));
        if (error) return err(error, `Failed to update course title`);
        return ok({ message: "Course title updated" });
      })
  );

  server.tool(
    "delete_course",
    "Permanently delete a course",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { error } = await client
          .from("courses")
          .delete()
          .eq("id", course_id)
          .eq("user_id", userId);

        if (error) return err("delete_failed", error.message);
        return ok({ message: "Course deleted" });
      })
  );

  server.tool(
    "set_course_visibility",
    "Set a course to public or private",
    { course_id: z.string().uuid(), is_public: z.boolean() },
    async ({ course_id, is_public }) =>
      withAuth(async (client, userId) => {
        const { error } = await client
          .from("courses")
          .update({ is_public })
          .eq("id", course_id)
          .eq("user_id", userId);

        if (error) return err("update_failed", error.message);
        return ok({ message: `Course is now ${is_public ? "public" : "private"}` });
      })
  );
}
