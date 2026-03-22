import type { Block, AssessmentQuestion } from "../../src/lib/types.js";

export const ALL_BLOCKS: Block[] = [
  { id: "b-heading",     type: "heading",     text: "Test Heading" },
  { id: "b-text",        type: "text",        text: "<p>Test paragraph</p>" },
  { id: "b-image",       type: "image",       src: "https://picsum.photos/800/400", alt: "Test image" },
  { id: "b-video",       type: "video",       url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { id: "b-audio",       type: "audio",       src: "https://www.w3schools.com/html/horse.mp3", title: "Audio clip" },
  { id: "b-document",    type: "document",    src: "https://www.w3.org/WAI/WCAG21/wcag21.pdf", fileType: "pdf", title: "WCAG 2.1" },
  { id: "b-quiz",        type: "quiz",        question: "What is 2+2?", options: ["3", "4", "5", "6"], correctIndex: 1 },
  { id: "b-truefalse",   type: "truefalse",   question: "The sky is blue.", correct: true, showFeedback: true, feedbackCorrect: "Yes!", feedbackIncorrect: "No!" },
  { id: "b-shortanswer", type: "shortanswer", question: "Capital of France?", answer: "Paris", acceptable: ["paris"], caseSensitive: false, trimWhitespace: true },
  { id: "b-list",        type: "list",        style: "bulleted", items: ["Alpha", "Beta", "Gamma"] },
  { id: "b-callout",     type: "callout",     variant: "warning", title: "Note", text: "<p>Pay attention.</p>" },
  { id: "b-accordion",   type: "accordion",   items: [{ id: "a1", title: "Q1", content: "Answer 1" }, { id: "a2", title: "Q2", content: "Answer 2" }] },
  { id: "b-tabs",        type: "tabs",        items: [{ id: "t1", label: "Tab A", content: "Content A" }, { id: "t2", label: "Tab B", content: "Content B" }] },
  { id: "b-quote",       type: "quote",       text: "To be or not to be.", cite: "Shakespeare" },
  { id: "b-code",        type: "code",        language: "typescript", code: "const x = 42;" },
  { id: "b-divider",     type: "divider" },
  { id: "b-toc",         type: "toc" },
];

export const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1",
    text: "What does PASS stand for?",
    options: ["Pull Aim Squeeze Sweep", "Press Activate Spray Stop", "Point Aim Shoot Spray", "Push Aim Spray Sweep"],
    correctIndex: 0,
    bloomLevel: "K",
    source: "Module 1",
    feedback: "PASS is the acronym for the fire extinguisher technique.",
  },
  {
    id: "q2",
    text: "When should you evacuate?",
    options: ["Never", "Only if told by a manager", "Immediately on alarm", "After finishing current task"],
    correctIndex: 2,
    bloomLevel: "AP",
    source: "Module 2",
  },
];
