import { z } from "zod";

export type HeadingBlock = { id: string; type: "heading"; text: string };
export type TextBlock = { id: string; type: "text"; text: string };
export type ImageBlock = { id: string; type: "image"; src: string; alt: string };
export type QuizBlock = {
  id: string;
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
  showFeedback?: boolean;
  feedbackMessage?: string;
};

export type CodeBlock = {
  id: string;
  type: "code";
  language: string;
  code: string;
};

// New richer blocks
export type ListBlock = {
  id: string;
  type: "list";
  style: "bulleted" | "numbered";
  items: string[];
};

export type QuoteBlock = {
  id: string;
  type: "quote";
  text: string;
  cite?: string;
};

export type AccordionBlock = {
  id: string;
  type: "accordion";
  items: { id: string; title: string; content: string }[];
};

export type TabsBlock = {
  id: string;
  type: "tabs";
  items: { id: string; label: string; content: string }[];
};

export type DividerBlock = { id: string; type: "divider" };

// Auto-generated table of contents for lessons
export type TocBlock = { id: string; type: "toc" };

export type CalloutBlock = {
  id: string;
  type: "callout";
  variant: "info" | "success" | "warning" | "danger";
  title?: string;
  text: string;
};

export type VideoBlock = {
  id: string;
  type: "video";
  url: string; // YouTube/Vimeo or direct mp4
};

export type AudioBlock = {
  id: string;
  type: "audio";
  src: string; // direct audio file
  title?: string;
};

export type DocumentBlock = {
  id: string;
  type: "document";
  src: string;
  fileType: "pdf" | "docx" | "xlsx" | "pptx";
  title?: string;
};

export type TrueFalseBlock = {
  id: string;
  type: "truefalse";
  question: string;
  correct: boolean;
  showFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
};

export type ShortAnswerBlock = {
  id: string;
  type: "shortanswer";
  question: string;
  answer: string;
  acceptable?: string[];
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  showFeedback?: boolean;
  feedbackMessage?: string;
};

export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | QuizBlock
  | CodeBlock
  | TrueFalseBlock
  | ShortAnswerBlock
  | ListBlock
  | QuoteBlock
  | AccordionBlock
  | TabsBlock
  | DividerBlock
  | TocBlock
  | CalloutBlock
  | VideoBlock
  | AudioBlock
  | DocumentBlock;

export type AssessmentQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

export type AssessmentConfig = {
  passingScore?: number;
  examSize?: number;
};

export type ContentLesson = {
  kind: "content";
  id: string;
  title: string;
  blocks: Block[];
};

export type AssessmentLesson = {
  kind: "assessment";
  id: string;
  title: string;
  questions: AssessmentQuestion[];
  config: AssessmentConfig;
};

export type Lesson = ContentLesson | AssessmentLesson;
export type Course = { schemaVersion: 1; title: string; lessons: Lesson[] };

// Zod schemas mirroring the above types
export const headingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  text: z.string().min(1),
});

export const textBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  text: z.string().min(1),
});

export const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  src: z.string().min(1),
  alt: z.string().min(1),
});

export const quizBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quiz"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});

export const trueFalseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("truefalse"),
  question: z.string().min(1),
  correct: z.boolean(),
  showFeedback: z.boolean().optional(),
  feedbackCorrect: z.string().optional(),
  feedbackIncorrect: z.string().optional(),
});

export const shortAnswerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("shortanswer"),
  question: z.string().min(1),
  answer: z.string().min(1),
  acceptable: z.array(z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});

export const listBlockSchema = z.object({
  id: z.string(),
  type: z.literal("list"),
  style: z.union([z.literal("bulleted"), z.literal("numbered")]),
  items: z.array(z.string().min(1)).min(1),
});

export const quoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  text: z.string().min(1),
  cite: z.string().optional(),
});

export const accordionBlockSchema = z.object({
  id: z.string(),
  type: z.literal("accordion"),
  items: z.array(z.object({ id: z.string(), title: z.string().min(1), content: z.string() })).min(1),
});

export const tabsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("tabs"),
  items: z.array(z.object({ id: z.string(), label: z.string().min(1), content: z.string() })).min(1),
});

export const dividerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("divider"),
});

export const tocBlockSchema = z.object({
  id: z.string(),
  type: z.literal("toc"),
});

export const calloutBlockSchema = z.object({
  id: z.string(),
  type: z.literal("callout"),
  variant: z.union([z.literal("info"), z.literal("success"), z.literal("warning"), z.literal("danger")]),
  title: z.string().optional(),
  text: z.string().min(1),
});

export const videoBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  url: z.string().min(1),
});

export const audioBlockSchema = z.object({
  id: z.string(),
  type: z.literal("audio"),
  src: z.string().min(1),
  title: z.string().optional(),
});

export const documentBlockSchema = z.object({
  id: z.string(),
  type: z.literal("document"),
  src: z.string().min(1),
  fileType: z.union([z.literal("pdf"), z.literal("docx"), z.literal("xlsx"), z.literal("pptx")]),
  title: z.string().optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  textBlockSchema,
  imageBlockSchema,
  quizBlockSchema,
  trueFalseBlockSchema,
  shortAnswerBlockSchema,
  listBlockSchema,
  quoteBlockSchema,
  accordionBlockSchema,
  tabsBlockSchema,
  dividerBlockSchema,
  tocBlockSchema,
  calloutBlockSchema,
  videoBlockSchema,
  audioBlockSchema,
  documentBlockSchema,
]);

const contentLessonSchema = z.object({
  kind: z.literal("content"),
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
}).passthrough();

const assessmentLessonSchema = z.object({
  kind: z.literal("assessment"),
  id: z.string(),
  title: z.string(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
  }).passthrough()),
  config: z.object({}).passthrough(),
}).passthrough();

export const lessonSchema = z.discriminatedUnion("kind", [
  contentLessonSchema,
  assessmentLessonSchema,
]);

export const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
});

// ── Permissive schemas for read path (View.tsx) ──────────────────────────────
// Same structure but accepts empty strings and empty arrays.
// Only used in View.tsx to load existing courses that may have empty fields.

const headingBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("heading"), text: z.string() });
const textBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("text"), text: z.string() });
const imageBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("image"), src: z.string(), alt: z.string() });
const quizBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("quiz"), question: z.string(),
  options: z.array(z.string()), correctIndex: z.number(),
  showFeedback: z.boolean().optional(), feedbackMessage: z.string().optional(),
});
const codeBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("code"), language: z.string(), code: z.string() });
const trueFalseBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("truefalse"), question: z.string(), correct: z.boolean(),
  showFeedback: z.boolean().optional(), feedbackCorrect: z.string().optional(), feedbackIncorrect: z.string().optional(),
});
const shortAnswerBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("shortanswer"), question: z.string(), answer: z.string(),
  acceptable: z.array(z.string()).optional(), caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(), showFeedback: z.boolean().optional(), feedbackMessage: z.string().optional(),
});
const listBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("list"), style: z.union([z.literal("bulleted"), z.literal("numbered")]), items: z.array(z.string()) });
const quoteBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("quote"), text: z.string(), cite: z.string().optional() });
const accordionBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("accordion"), items: z.array(z.object({ id: z.string(), title: z.string(), content: z.string() })) });
const tabsBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("tabs"), items: z.array(z.object({ id: z.string(), label: z.string(), content: z.string() })) });
const calloutBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("callout"), variant: z.union([z.literal("info"), z.literal("success"), z.literal("warning"), z.literal("danger")]), title: z.string().optional(), text: z.string() });
const videoBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("video"), url: z.string() });
const audioBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("audio"), src: z.string(), title: z.string().optional() });
const documentBlockSchemaPermissive = z.object({ id: z.string(), type: z.literal("document"), src: z.string(), fileType: z.union([z.literal("pdf"), z.literal("docx"), z.literal("xlsx"), z.literal("pptx")]), title: z.string().optional() });

export const blockSchemaPermissive = z.discriminatedUnion("type", [
  headingBlockSchemaPermissive, textBlockSchemaPermissive, imageBlockSchemaPermissive,
  quizBlockSchemaPermissive, codeBlockSchemaPermissive, trueFalseBlockSchemaPermissive,
  shortAnswerBlockSchemaPermissive, listBlockSchemaPermissive, quoteBlockSchemaPermissive,
  accordionBlockSchemaPermissive, tabsBlockSchemaPermissive, dividerBlockSchema, tocBlockSchema,
  calloutBlockSchemaPermissive, videoBlockSchemaPermissive, audioBlockSchemaPermissive,
  documentBlockSchemaPermissive,
]);

const contentLessonSchemaPermissive = z.object({
  kind: z.literal("content"), id: z.string(), title: z.string(),
  blocks: z.array(blockSchemaPermissive),
}).passthrough();

const lessonSchemaPermissive = z.discriminatedUnion("kind", [
  contentLessonSchemaPermissive, assessmentLessonSchema,
]);

export const courseSchemaPermissive = z.object({
  schemaVersion: z.literal(1), title: z.string(),
  lessons: z.array(lessonSchemaPermissive),
});

export function uid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Polyfill for environments without crypto.randomUUID
  const randomBytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // version 4
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Factories
export const factories = {
  heading: (): HeadingBlock => ({ id: uid(), type: "heading", text: "New Heading" }),
  text: (): TextBlock => ({ id: uid(), type: "text", text: "New paragraph..." }),
  code: (): CodeBlock => ({ id: uid(), type: "code", language: "typescript", code: "// code" }),
  image: (): ImageBlock => ({ id: uid(), type: "image", src: "", alt: "" }),
  quiz: (): QuizBlock => ({
    id: uid(),
    type: "quiz",
    question: "Your question?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: -1,
  }),
  list: (): ListBlock => ({ id: uid(), type: "list", style: "bulleted", items: ["First point", "Second point"] }),
  quote: (): QuoteBlock => ({ id: uid(), type: "quote", text: "A relevant quote.", cite: "Source" }),
  accordion: (): AccordionBlock => ({
    id: uid(),
    type: "accordion",
    items: [
      { id: uid(), title: "Section 1", content: "Details for section 1." },
      { id: uid(), title: "Section 2", content: "Details for section 2." },
    ],
  }),
  tabs: (): TabsBlock => ({
    id: uid(),
    type: "tabs",
    items: [
      { id: uid(), label: "Tab A", content: "Content A" },
      { id: uid(), label: "Tab B", content: "Content B" },
    ],
  }),
  divider: (): DividerBlock => ({ id: uid(), type: "divider" }),
  toc: (): TocBlock => ({ id: uid(), type: "toc" }),
  callout: (): CalloutBlock => ({ id: uid(), type: "callout", variant: "info", title: "Heads up", text: "Useful context goes here." }),
  video: (): VideoBlock => ({ id: uid(), type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
  audio: (): AudioBlock => ({ id: uid(), type: "audio", src: "https://www.w3schools.com/html/horse.mp3", title: "Audio clip" }),
  truefalse: (): TrueFalseBlock => ({ id: uid(), type: "truefalse", question: "Statement goes here.", correct: true, feedbackCorrect: "Correct!", feedbackIncorrect: "Not quite." }),
  shortanswer: (): ShortAnswerBlock => ({ id: uid(), type: "shortanswer", question: "Your question?", answer: "answer", acceptable: [], caseSensitive: false, trimWhitespace: true }),
  document: (): DocumentBlock => ({ id: uid(), type: "document", src: "", fileType: "pdf", title: "" }),
} as const;

export type BlockType = keyof typeof factories;
