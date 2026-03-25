import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { mutateCourse } from "../lib/mutate.js";
import { uid } from "../lib/uid.js";

const mcqQuestionInputSchema = z.object({
  kind: z.literal("mcq"),
  text: z.string().min(1),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

const multipleResponseQuestionInputSchema = z.object({
  kind: z.literal("multipleresponse"),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndices: z.array(z.number().int().min(0)).min(2),
  feedback: z.string().optional(),
});

const fillInBlankQuestionInputSchema = z.object({
  kind: z.literal("fillinblank"),
  text: z.string().min(1),
  blanks: z.array(z.object({
    acceptable: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean().optional(),
  })).min(1),
  feedback: z.string().optional(),
});

const matchingQuestionInputSchema = z.object({
  kind: z.literal("matching"),
  text: z.string().min(1),
  left: z.array(z.object({ label: z.string().min(1) })).min(2),
  right: z.array(z.object({ label: z.string().min(1) })).min(2),
  pairs: z.array(z.object({ leftIndex: z.number().int().min(0), rightIndex: z.number().int().min(0) })).min(2),
  feedback: z.string().optional(),
});

const sortingQuestionInputSchema = z.object({
  kind: z.literal("sorting"),
  text: z.string().min(1),
  buckets: z.array(z.object({ label: z.string().min(1) })).min(2),
  items: z.array(z.object({ text: z.string().min(1), bucketIndex: z.number().int().min(0) })).min(2),
  feedback: z.string().optional(),
});

const questionInputSchema = z.discriminatedUnion("kind", [
  mcqQuestionInputSchema,
  multipleResponseQuestionInputSchema,
  fillInBlankQuestionInputSchema,
  matchingQuestionInputSchema,
  sortingQuestionInputSchema,
]);

export function injectQuestionSubItemIds(q: any): any {
  const withId = { ...q, id: uid() };
  switch (q.kind) {
    case "fillinblank":
      return {
        ...withId,
        blanks: (q.blanks ?? []).map((b: any) => ({
          ...b,
          id: uid(),
        })),
      };
    case "matching": {
      const leftWithIds = (q.left ?? []).map((item: any) => ({ ...item, id: uid() }));
      const rightWithIds = (q.right ?? []).map((item: any) => ({ ...item, id: uid() }));
      const pairs = (q.pairs ?? []).map((p: any) => ({
        leftId: leftWithIds[p.leftIndex]?.id ?? uid(),
        rightId: rightWithIds[p.rightIndex]?.id ?? uid(),
      }));
      return { ...withId, left: leftWithIds, right: rightWithIds, pairs };
    }
    case "sorting": {
      const bucketsWithIds = (q.buckets ?? []).map((b: any) => ({ ...b, id: uid() }));
      const itemsWithIds = (q.items ?? []).map((item: any) => ({
        ...item,
        id: uid(),
        bucketId: bucketsWithIds[item.bucketIndex]?.id ?? uid(),
      }));
      return { ...withId, buckets: bucketsWithIds, items: itemsWithIds };
    }
    default:
      return withId;
  }
}

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
          kind: q.kind ?? "mcq",
          text: q.text,
          ...(q.kind === "mcq" || !q.kind ? { correctIndex: q.correctIndex } : {}),
          bloomLevel: q.bloomLevel,
          source: q.source,
        })));
      })
  );

  // ── add_question ──────────────────────────────────────────────────────────
  server.tool(
    "add_question",
    "Add a question to an assessment lesson's question bank. Supports 5 question kinds: mcq (4-option multiple choice), multipleresponse (select all that apply, ≥2 correct), fillinblank (fill in the gaps), matching (pair left to right), sorting (drag items into buckets). Set kind to select the type.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      question: questionInputSchema,
    },
    async ({ course_id, lesson_id, question }) =>
      withAuth(async (client, userId) => {
        const newQuestion = injectQuestionSubItemIds(question);
        const questionId = newQuestion.id;
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
      fields: z.object({
        kind: z.enum(["mcq", "multipleresponse", "fillinblank", "matching", "sorting"]).optional(),
        text: z.string().min(1).optional(),
        // mcq fields
        options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]).optional(),
        correctIndex: z.number().int().min(0).max(3).optional(),
        bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
        source: z.string().optional(),
        // multipleresponse fields
        correctIndices: z.array(z.number().int().min(0)).optional(),
        // fillinblank fields
        blanks: z.array(z.object({ acceptable: z.array(z.string().min(1)).min(1), caseSensitive: z.boolean().optional() })).optional(),
        // matching fields
        left: z.array(z.object({ label: z.string().min(1) })).optional(),
        right: z.array(z.object({ label: z.string().min(1) })).optional(),
        pairs: z.array(z.object({ leftIndex: z.number().int().min(0), rightIndex: z.number().int().min(0) })).optional(),
        // sorting fields
        buckets: z.array(z.object({ label: z.string().min(1) })).optional(),
        items: z.array(z.object({ text: z.string().min(1), bucketIndex: z.number().int().min(0) })).optional(),
        feedback: z.string().optional(),
      }),
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
                questions: (l as any).questions.filter((q: any) => q.id !== question_id),
              }
            ),
          };
        });
        if (notFound) return err("not_found", `Question ${question_id} not found in lesson ${lesson_id}`);
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
      questions: z.array(questionInputSchema).min(1),
    },
    async ({ course_id, lesson_id, questions }) =>
      withAuth(async (client, userId) => {
        const withIds = questions.map((q) => injectQuestionSubItemIds(q));
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

  // ── replace_questions ──────────────────────────────────────────────────────
  server.tool(
    "replace_questions",
    "Replace the entire question bank for an assessment lesson with a new set. All incoming questions are validated before any are committed — no partial replacements. Existing questions are discarded.",
    {
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      questions: z.array(questionInputSchema).min(1),
    },
    async ({ course_id, lesson_id, questions }) =>
      withAuth(async (client, userId) => {
        const withIds = questions.map((q) => injectQuestionSubItemIds(q));
        let notAssessment = false;
        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id) as any;
          if (!lesson) { lessonNotFound = true; return course; }
          if (lesson.kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) =>
              l.id !== lesson_id ? l : { ...l, questions: withIds }
            ),
          };
        });
        if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (notAssessment) return err("not_assessment", "Target lesson is not an assessment lesson");
        if (mutError) return err(mutError, "Failed to replace questions");
        return ok({ replaced: withIds.length, question_ids: withIds.map((q) => q.id) });
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
        let notAssessment = false;
        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id);
          if (!lesson) { lessonNotFound = true; return course; }
          if ((lesson as any).kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const config = { ...(l as any).config };
              if (passingScore !== undefined) config.passingScore = passingScore;
              if (examSize !== undefined) config.examSize = examSize;
              return { ...l, config };
            }),
          };
        });
        if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (notAssessment) return err("not_assessment", "Lesson is not an assessment lesson");
        if (mutError) return err(mutError, "Failed to update assessment config");
        return ok({ updated: true });
      })
  );
}
