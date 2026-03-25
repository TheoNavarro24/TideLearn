import { z } from "zod";
import { uid } from "./uid.js";

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
  url: string;
};

export type AudioBlock = {
  id: string;
  type: "audio";
  src: string;
  title?: string;
};

export type DocumentBlock = {
  id: string;
  type: "document";
  src: string;
  fileType: "pdf" | "docx" | "xlsx" | "pptx";
  title?: string;
};

export type ButtonBlock = {
  id: string;
  type: "button";
  label: string;
  url: string;
  variant: "primary" | "secondary" | "outline";
  openInNewTab: boolean;
};

export type EmbedBlock = {
  id: string;
  type: "embed";
  url: string;
  title: string;
  height: number;
};

export type FlashcardBlock = {
  id: string;
  type: "flashcard";
  front: string;
  back: string;
  hint?: string;
};

export type TimelineBlock = {
  id: string;
  type: "timeline";
  items: { id: string; date: string; title: string; description?: string }[];
};

export type ProcessBlock = {
  id: string;
  type: "process";
  steps: { id: string; title: string; description?: string }[];
};

export type ChartBlock = {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie";
  title?: string;
  labels: string[];
  datasets: { label: string; values: number[] }[];
};

export type SortingBlock = {
  id: string;
  type: "sorting";
  prompt: string;
  buckets: { id: string; label: string }[];
  items: { id: string; text: string; bucketId: string }[];
  showFeedback: boolean;
};

export type HotspotBlock = {
  id: string;
  type: "hotspot";
  src: string;
  alt: string;
  hotspots: { id: string; x: number; y: number; label: string; description?: string }[];
};

export type BranchingBlock = {
  id: string;
  type: "branching";
  prompt: string;
  choices: { id: string; label: string; content: string }[];
};

export type MultipleResponseBlock = {
  type: "multipleresponse";
  id: string;
  question: string;
  options: string[];
  correctIndices: number[];
  showFeedback?: boolean;
  feedbackMessage?: string;
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
  | DocumentBlock
  | ButtonBlock
  | EmbedBlock
  | FlashcardBlock
  | TimelineBlock
  | ProcessBlock
  | ChartBlock
  | SortingBlock
  | HotspotBlock
  | BranchingBlock
  | MultipleResponseBlock;

export type MCQQuestion = {
  kind: "mcq";
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  feedback?: string;
  bloomLevel?: "K" | "C" | "UN" | "AP" | "AN" | "EV";
  source?: string;
};

export type MultipleResponseQuestion = {
  kind: "multipleresponse";
  id: string;
  text: string;
  options: string[];
  correctIndices: number[];
  feedback?: string;
};

export type FillInBlankQuestion = {
  kind: "fillinblank";
  id: string;
  text: string;
  blanks: Array<{ id: string; acceptable: string[]; caseSensitive?: boolean }>;
  feedback?: string;
};

export type MatchingQuestion = {
  kind: "matching";
  id: string;
  text: string;
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pairs: Array<{ leftId: string; rightId: string }>;
  feedback?: string;
};

export type SortingQuestion = {
  kind: "sorting";
  id: string;
  text: string;
  buckets: Array<{ id: string; label: string }>;
  items: Array<{ id: string; text: string; bucketId: string }>;
  feedback?: string;
};

export type AssessmentQuestion =
  | MCQQuestion
  | MultipleResponseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | SortingQuestion;

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

// Zod schemas
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

export const codeBlockSchema = z.object({
  id: z.string(),
  type: z.literal("code"),
  language: z.string().min(1),
  code: z.string().min(1),
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

export const buttonBlockSchema = z.object({
  id: z.string(),
  type: z.literal("button"),
  label: z.string().min(1),
  url: z.string().min(1),
  variant: z.union([z.literal("primary"), z.literal("secondary"), z.literal("outline")]),
  openInNewTab: z.boolean(),
});

export const embedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("embed"),
  url: z.string().min(1),
  title: z.string().min(1),
  height: z.number().int().min(100).max(2000),
});

export const flashcardBlockSchema = z.object({
  id: z.string(),
  type: z.literal("flashcard"),
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().optional(),
});

export const timelineBlockSchema = z.object({
  id: z.string(),
  type: z.literal("timeline"),
  items: z.array(z.object({
    id: z.string(), date: z.string().min(1), title: z.string().min(1), description: z.string().optional(),
  })).min(1),
});

export const processBlockSchema = z.object({
  id: z.string(),
  type: z.literal("process"),
  steps: z.array(z.object({
    id: z.string(), title: z.string().min(1), description: z.string().optional(),
  })).min(1),
});

export const chartBlockSchema = z.object({
  id: z.string(),
  type: z.literal("chart"),
  chartType: z.union([z.literal("bar"), z.literal("line"), z.literal("pie")]),
  title: z.string().optional(),
  labels: z.array(z.string().min(1)).min(1),
  datasets: z.array(z.object({
    label: z.string().min(1), values: z.array(z.number()).min(1),
  })).min(1),
});

export const sortingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("sorting"),
  prompt: z.string().min(1),
  buckets: z.array(z.object({
    id: z.string(), label: z.string().min(1),
  })).min(2),
  items: z.array(z.object({
    id: z.string(), text: z.string().min(1), bucketId: z.string(),
  })).min(2),
  showFeedback: z.boolean(),
});

export const hotspotBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hotspot"),
  src: z.string().min(1),
  alt: z.string().min(1),
  hotspots: z.array(z.object({
    id: z.string(), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
    label: z.string().min(1), description: z.string().optional(),
  })),
});

export const branchingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("branching"),
  prompt: z.string().min(1),
  choices: z.array(z.object({
    id: z.string(), label: z.string().min(1), content: z.string(),
  })).min(2),
});

export const multipleResponseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("multipleresponse"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndices: z.array(z.number().int().min(0)).min(2),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  textBlockSchema,
  imageBlockSchema,
  quizBlockSchema,
  codeBlockSchema,
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
  buttonBlockSchema,
  embedBlockSchema,
  flashcardBlockSchema,
  timelineBlockSchema,
  processBlockSchema,
  chartBlockSchema,
  sortingBlockSchema,
  hotspotBlockSchema,
  branchingBlockSchema,
  multipleResponseBlockSchema,
]);

const contentLessonSchema = z.object({
  kind: z.literal("content"),
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
}).passthrough();

const mcqQuestionSchema = z.object({
  kind: z.literal("mcq"),
  id: z.string(),
  text: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  feedback: z.string().optional(),
  bloomLevel: z.enum(["K", "C", "UN", "AP", "AN", "EV"]).optional(),
  source: z.string().optional(),
});

const multipleResponseQuestionSchema = z.object({
  kind: z.literal("multipleresponse"),
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()),
  correctIndices: z.array(z.number()),
  feedback: z.string().optional(),
});

const fillInBlankQuestionSchema = z.object({
  kind: z.literal("fillinblank"),
  id: z.string(),
  text: z.string(),
  blanks: z.array(z.object({
    id: z.string(),
    acceptable: z.array(z.string()),
    caseSensitive: z.boolean().optional(),
  })),
  feedback: z.string().optional(),
});

const matchingQuestionSchema = z.object({
  kind: z.literal("matching"),
  id: z.string(),
  text: z.string(),
  left: z.array(z.object({ id: z.string(), label: z.string() })),
  right: z.array(z.object({ id: z.string(), label: z.string() })),
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
  feedback: z.string().optional(),
});

const sortingQuestionSchema = z.object({
  kind: z.literal("sorting"),
  id: z.string(),
  text: z.string(),
  buckets: z.array(z.object({ id: z.string(), label: z.string() })),
  items: z.array(z.object({ id: z.string(), text: z.string(), bucketId: z.string() })),
  feedback: z.string().optional(),
});

// Permissive question schema: defaults kind to "mcq" for legacy questions
const assessmentQuestionSchemaPermissive = z.union([
  mcqQuestionSchema,
  multipleResponseQuestionSchema,
  fillInBlankQuestionSchema,
  matchingQuestionSchema,
  sortingQuestionSchema,
  // Legacy MCQ without kind field — default it
  z.object({
    id: z.string(),
    text: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
  }).passthrough().transform((q: any) => ({ kind: "mcq" as const, ...q })),
]);

const assessmentLessonSchema = z.object({
  kind: z.literal("assessment"),
  id: z.string(),
  title: z.string(),
  questions: z.array(assessmentQuestionSchemaPermissive),
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
  button: (): ButtonBlock => ({
    id: uid(), type: "button", label: "Learn more", url: "https://", variant: "primary", openInNewTab: false,
  }),
  embed: (): EmbedBlock => ({
    id: uid(), type: "embed", url: "https://", title: "Embedded content", height: 400,
  }),
  flashcard: (): FlashcardBlock => ({
    id: uid(), type: "flashcard", front: "Question or term", back: "Answer or definition",
  }),
  timeline: (): TimelineBlock => ({
    id: uid(), type: "timeline",
    items: [
      { id: uid(), date: "2024", title: "First milestone", description: "Something important happened." },
      { id: uid(), date: "2025", title: "Second milestone", description: "Then this happened." },
    ],
  }),
  process: (): ProcessBlock => ({
    id: uid(), type: "process",
    steps: [
      { id: uid(), title: "Step 1", description: "Describe the first step." },
      { id: uid(), title: "Step 2", description: "Describe the second step." },
      { id: uid(), title: "Step 3", description: "Describe the final step." },
    ],
  }),
  chart: (): ChartBlock => ({
    id: uid(), type: "chart", chartType: "bar", title: "Chart title",
    labels: ["Category A", "Category B", "Category C"],
    datasets: [{ label: "Series 1", values: [40, 65, 30] }],
  }),
  sorting: (): SortingBlock => {
    const bucketA = uid();
    const bucketB = uid();
    return {
      id: uid(), type: "sorting",
      prompt: "Sort each item into the correct category.",
      buckets: [
        { id: bucketA, label: "Category A" },
        { id: bucketB, label: "Category B" },
      ],
      items: [
        { id: uid(), text: "Item 1", bucketId: bucketA },
        { id: uid(), text: "Item 2", bucketId: bucketA },
        { id: uid(), text: "Item 3", bucketId: bucketB },
        { id: uid(), text: "Item 4", bucketId: bucketB },
      ],
      showFeedback: true,
    };
  },
  hotspot: (): HotspotBlock => ({
    id: uid(), type: "hotspot", src: "", alt: "", hotspots: [],
  }),
  branching: (): BranchingBlock => ({
    id: uid(), type: "branching",
    prompt: "What would you do in this situation?",
    choices: [
      { id: uid(), label: "Option A", content: "<p>Content for Option A.</p>" },
      { id: uid(), label: "Option B", content: "<p>Content for Option B.</p>" },
    ],
  }),
} as const;

export type BlockType = keyof typeof factories;

// Re-export uid for use in other modules
export { uid } from "./uid.js";
