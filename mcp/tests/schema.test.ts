import { describe, it, expect } from "vitest";
import { blockSchema } from "../src/lib/types.js";
import { injectSubItemIds } from "../src/tools/semantic.js";

describe("blockSchema — document block", () => {
  it("accepts a valid document block", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.pdf",
      fileType: "pdf",
      title: "Annual Report",
    });
    expect(result.success).toBe(true);
  });

  it("accepts document block without optional title", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.pdf",
      fileType: "docx",
    });
    expect(result.success).toBe(true);
  });

  it("rejects document block with unknown fileType", () => {
    const result = blockSchema.safeParse({
      id: "abc",
      type: "document",
      src: "https://example.com/file.xyz",
      fileType: "xyz",
    });
    expect(result.success).toBe(false);
  });
});

describe("blockSchema — feedback fields", () => {
  it("accepts quiz block with showFeedback and feedbackMessage", () => {
    const result = blockSchema.safeParse({
      id: "q1",
      type: "quiz",
      question: "What is X?",
      options: ["A", "B", "C", "D"],
      correctIndex: 1,
      showFeedback: true,
      feedbackMessage: "Well done!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).feedbackMessage).toBe("Well done!");
    }
  });

  it("accepts truefalse block with showFeedback (only this field is currently missing)", () => {
    const result = blockSchema.safeParse({
      id: "tf1",
      type: "truefalse",
      question: "Is X true?",
      correct: true,
      showFeedback: true,
      feedbackCorrect: "Yes!",
      feedbackIncorrect: "No!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).showFeedback).toBe(true);
    }
  });

  it("accepts shortanswer block with showFeedback and feedbackMessage", () => {
    const result = blockSchema.safeParse({
      id: "sa1",
      type: "shortanswer",
      question: "Define X.",
      answer: "definition",
      showFeedback: true,
      feedbackMessage: "Close enough.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).showFeedback).toBe(true);
    }
  });
});

describe("injectSubItemIds", () => {
  it("injects ids into accordion items", () => {
    const block = {
      type: "accordion",
      items: [{ title: "S1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(typeof result.items[0].id).toBe("string");
  });

  it("injects ids into tabs items", () => {
    const block = {
      type: "tabs",
      items: [{ label: "T1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(typeof result.items[0].id).toBe("string");
  });

  it("leaves non-container blocks unchanged", () => {
    const block = { type: "text", text: "<p>hello</p>" };
    const result = injectSubItemIds(block);
    expect(result).toEqual(block);
  });

  it("preserves existing sub-item ids", () => {
    const block = {
      type: "accordion",
      items: [{ id: "existing-id", title: "S1", content: "C1" }],
    };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("existing-id");
  });
});
