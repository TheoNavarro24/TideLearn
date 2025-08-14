export type HeadingBlock = { id: string; type: "heading"; text: string };
export type TextBlock = { id: string; type: "text"; text: string };
export type ImageBlock = { id: string; type: "image"; src: string; alt: string };
export type QuizBlock = {
  id: string;
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
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

export type TrueFalseBlock = {
  id: string;
  type: "truefalse";
  question: string;
  correct: boolean;
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
};

export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | QuizBlock
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
  | AudioBlock;

export type Lesson = { id: string; title: string; blocks: Block[] };
export type Course = { schemaVersion: 1; title: string; lessons: Lesson[] };

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
  image: (): ImageBlock => ({ id: uid(), type: "image", src: "", alt: "" }),
  quiz: (): QuizBlock => ({
    id: uid(),
    type: "quiz",
    question: "Your question?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: 0,
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
} as const;

export type BlockType = keyof typeof factories;
