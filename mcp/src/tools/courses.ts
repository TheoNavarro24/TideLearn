import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err, APP_URL } from "../lib/supabase.js";
import { uid } from "../lib/uid.js";

export function registerCourseTools(server: McpServer) {
  server.tool("list_courses", "List all courses for the logged-in user", {}, async () =>
    withAuth(async (client, userId) => {
      const { data, error } = await client
        .from("courses")
        .select("id, title, is_public, updated_at, content")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) return err("query_failed", error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        is_public: row.is_public,
        updated_at: row.updated_at,
        lesson_count: (row.content as any)?.lessons?.length ?? 0,
      }));
      return ok(mapped);
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
        return ok({ course_id: data.id, view_url: `${APP_URL}/view?id=${data.id}` });
      })
  );

  server.tool(
    "update_course",
    "Update a course's title, visibility, or both. At least one of title or is_public must be provided.",
    {
      course_id: z.string().uuid(),
      title: z.string().optional(),
      is_public: z.boolean().optional(),
    },
    async ({ course_id, title, is_public }) =>
      withAuth(async (client, userId) => {
        if (title === undefined && is_public === undefined) {
          return err("validation_failed", "At least one of title or is_public must be provided");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fields: Record<string, any> = { updated_at: new Date().toISOString() };

        if (title !== undefined) {
          const { data, error: readError } = await client
            .from("courses")
            .select("content")
            .eq("id", course_id)
            .eq("user_id", userId)
            .single();

          if (readError || !data) return err("course_not_found", `No course with id ${course_id}`);

          const content = { ...(data.content as Record<string, unknown>), title };
          fields.title = title;
          fields.content = content;
        }

        if (is_public !== undefined) {
          fields.is_public = is_public;
        }

        const { error: updateError } = await client
          .from("courses")
          .update(fields)
          .eq("id", course_id)
          .eq("user_id", userId);

        if (updateError) return err("update_failed", updateError.message);
        const result: Record<string, unknown> = { updated: true };
        if (is_public === true) {
          result.view_url = `${APP_URL}/view?id=${course_id}`;
          result.note = "Course is now public. Share view_url with learners.";
        }
        return ok(result);
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

}
