import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

export function registerAssessmentTools(server: McpServer) {
  // ── add_assessment_lesson ─────────────────────────────────────────────────
  server.tool(
    "add_assessment_lesson",
    "Add a new assessment lesson (adaptive practice test) to a course. Assessment lessons hold a question bank, not content blocks.",
    {
      course_id: z.string().uuid(),
      title: z.string().min(1),
      position: z.number().int().positive().optional(),
    },
    async ({ course_id, title, position }) =>
      withAuth(async (client, userId) => {
        const lessonId = uid();
        const newLesson = {
          kind: "assessment" as const,
          id: lessonId,
          title,
          questions: [],
          config: { passingScore: 80, examSize: 20 },
        };
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lessons = [...course.lessons];
          const idx = position ? Math.min(position - 1, lessons.length) : lessons.length;
          lessons.splice(idx, 0, newLesson);
          return { ...course, lessons };
        });
        if (mutError) return err(mutError, "Failed to add assessment lesson");
        return ok({ lesson_id: lessonId });
      })
  );

  // ── list_questions ────────────────────────────────────────────────────────
  server.tool(
    "list_questions",
    "List all questions in an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();
        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const lesson = (data.content as any).lessons?.find((l: any) => l.id === lesson_id);
        if (!lesson) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (lesson.kind !== "assessment") return err("not_assessment", "Lesson is not an assessment lesson");
        return ok((lesson.questions ?? []).map((q: any, i: number) => ({
          position: i + 1,
          id: q.id,
          text: q.text,
          correctIndex: q.correctIndex,
          bloomLevel: q.bloomLevel,
          source: q.source,
        })));
      })
  );

  // ── add_question ──────────────────────────────────────────────────────────
  server.tool(
    "add_question",
    "Add a question to an assessment lesson's question bank",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question: questionSchema,
    },
    async ({ course_id, lesson_id, question }) =>
      withAuth(async (client, userId) => {
        const questionId = uid();
        const newQuestion = { ...question, id: questionId };
        let notAssessment = false;
        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id);
          if (!lesson) { lessonNotFound = true; return course; }
          if ((lesson as any).kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: [...((l as any).questions ?? []), newQuestion],
              }
            ),
          };
        });
        if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (notAssessment) return err("not_assessment", "Lesson is not an assessment lesson. Use add_block for content lessons.");
        if (mutError) return err(mutError, "Failed to add question");
        return ok({ question_id: questionId });
      })
  );

  // ── update_question ───────────────────────────────────────────────────────
  server.tool(
    "update_question",
    "Update a question in an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question_id: z.string().uuid(),
      fields: questionSchema.partial(),
    },
    async ({ course_id, lesson_id, question_id, fields }) =>
      withAuth(async (client, userId) => {
        let notFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
          if (!lesson || lesson.kind !== "assessment") { notFound = true; return course; }
          const qIdx = lesson.questions.findIndex((q: any) => q.id === question_id);
          if (qIdx === -1) { notFound = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: (l as any).questions.map((q: any, i: number) =>
                  i === qIdx ? { ...q, ...fields } : q
                ),
              }
            ),
          };
        });
        if (notFound) return err("not_found", `Question ${question_id} not found in lesson ${lesson_id}`);
        if (mutError) return err(mutError, "Failed to update question");
        return ok({ updated: true });
      })
  );

  // ── delete_question ───────────────────────────────────────────────────────
  server.tool(
    "delete_question",
    "Remove a question from an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question_id: z.string().uuid(),
    },
    async ({ course_id, lesson_id, question_id }) =>
      withAuth(async (client, userId) => {
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) =>
            l.id !== lesson_id ? l : {
              ...l,
              questions: ((l as any).questions ?? []).filter((q: any) => q.id !== question_id),
            }
          ),
        }));
        if (mutError) return err(mutError, "Failed to delete question");
        return ok({ deleted: true });
      })
  );

  // ── import_questions ──────────────────────────────────────────────────────
  server.tool(
    "import_questions",
    "Bulk-import questions into an assessment lesson. All questions are validated before any are committed — no partial imports.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      questions: z.array(questionSchema).min(1),
    },
    async ({ course_id, lesson_id, questions }) =>
      withAuth(async (client, userId) => {
        const withIds = questions.map((q) => ({ ...q, id: uid() }));
        let notAssessment = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
          if (!lesson || lesson.kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : {
                ...l,
                questions: [...((l as any).questions ?? []), ...withIds],
              }
            ),
          };
        });
        if (notAssessment) return err("not_assessment", "Target lesson is not an assessment lesson");
        if (mutError) return err(mutError, "Failed to import questions");
        return ok({ imported: withIds.length, question_ids: withIds.map((q) => q.id) });
      })
  );

  // ── update_assessment_config ──────────────────────────────────────────────
  server.tool(
    "update_assessment_config",
    "Update the config (passing score, exam size) for an assessment lesson",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      passingScore: z.number().int().min(0).max(100).optional(),
      examSize: z.number().int().min(1).optional(),
    },
    async ({ course_id, lesson_id, passingScore, examSize }) =>
      withAuth(async (client, userId) => {
        if (passingScore === undefined && examSize === undefined) {
          return err("missing_fields", "At least one of passingScore or examSize must be provided");
        }
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id || (l as any).kind !== "assessment") return l;
            const config = { ...(l as any).config };
            if (passingScore !== undefined) config.passingScore = passingScore;
            if (examSize !== undefined) config.examSize = examSize;
            return { ...l, config };
          }),
        }));
        if (mutError) return err(mutError, "Failed to update assessment config");
        return ok({ updated: true });
      })
  );
}
