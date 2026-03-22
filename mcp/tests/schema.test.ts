import { describe, it, expect } from "vitest";
import { blockSchema } from "../src/lib/types.js";
import { injectSubItemIds } from "../src/tools/semantic.js";
import { ALL_BLOCKS } from "./fixtures/blocks.js";

describe("strict block validation", () => {
  it("rejects heading with empty text", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "heading", text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with empty question", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "", options: ["A", "B"], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with fewer than 2 options", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A"], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects quiz with empty option strings", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A", ""], correctIndex: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts quiz with correctIndex -1", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "quiz", question: "Q?", options: ["A", "B"], correctIndex: -1 });
    expect(result.success).toBe(true);
  });

  it("rejects image with empty src", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "image", src: "", alt: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects list with no items", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "list", style: "bulleted", items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects accordion with empty title", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "accordion", items: [{ id: "i1", title: "", content: "x" }] });
    expect(result.success).toBe(false);
  });

  it("accepts accordion with empty content (content is optional-ish)", () => {
    const result = blockSchema.safeParse({ id: "b1", type: "accordion", items: [{ id: "i1", title: "T", content: "" }] });
    expect(result.success).toBe(true);
  });
});

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

describe("blockSchema — all 17 block types", () => {
  ALL_BLOCKS.forEach((block) => {
    it(`accepts valid ${block.type} block`, () => {
      const result = blockSchema.safeParse(block);
      expect(result.success).toBe(true);
    });
  });
});

describe("blockSchema — invalid cases", () => {
  it("rejects quiz with string correctIndex", () => {
    expect(blockSchema.safeParse({ id: "q1", type: "quiz", question: "Q?", options: ["A","B","C","D"], correctIndex: "1" }).success).toBe(false);
  });
  it("rejects truefalse with string correct", () => {
    expect(blockSchema.safeParse({ id: "tf1", type: "truefalse", question: "Q?", correct: "true" }).success).toBe(false);
  });
  it("rejects accordion item missing title", () => {
    expect(blockSchema.safeParse({ id: "a1", type: "accordion", items: [{ id: "i1", content: "C" }] }).success).toBe(false);
  });
  it("rejects tabs item missing label", () => {
    expect(blockSchema.safeParse({ id: "t1", type: "tabs", items: [{ id: "i1", content: "C" }] }).success).toBe(false);
  });
  it("rejects image missing alt", () => {
    expect(blockSchema.safeParse({ id: "i1", type: "image", src: "https://example.com/img.jpg" }).success).toBe(false);
  });
  it("rejects callout with invalid variant", () => {
    expect(blockSchema.safeParse({ id: "c1", type: "callout", variant: "purple", text: "Hey" }).success).toBe(false);
  });
  it("rejects list with invalid style", () => {
    expect(blockSchema.safeParse({ id: "l1", type: "list", style: "ordered", items: ["A"] }).success).toBe(false);
  });
  it("rejects code block missing language", () => {
    expect(blockSchema.safeParse({ id: "c1", type: "code", code: "const x = 1" }).success).toBe(false);
  });
  it("rejects unknown block type", () => {
    expect(blockSchema.safeParse({ id: "x1", type: "banner", text: "Hello" }).success).toBe(false);
  });
});
