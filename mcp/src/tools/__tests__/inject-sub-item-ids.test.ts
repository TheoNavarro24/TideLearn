import { describe, it, expect } from "vitest";
import { injectSubItemIds } from "../semantic.js";

describe("injectSubItemIds", () => {
  it("injects ids into accordion items when missing", () => {
    const block = { type: "accordion", items: [{ title: "S1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
    expect(typeof result.items[0].id).toBe("string");
    expect(result.items[0].id.length).toBeGreaterThan(0);
  });

  it("preserves existing accordion item ids", () => {
    const block = { type: "accordion", items: [{ id: "keep-me", title: "S1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("keep-me");
  });

  it("injects ids into tabs items when missing", () => {
    const block = { type: "tabs", items: [{ label: "T1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
  });

  it("injects ids into timeline items when missing", () => {
    const block = { type: "timeline", items: [{ date: "2024", title: "Launch" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
    expect(typeof result.items[0].id).toBe("string");
  });

  it("preserves existing timeline item ids", () => {
    const block = { type: "timeline", items: [{ id: "keep", date: "2024", title: "Launch" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("keep");
  });

  it("injects ids into process steps when missing", () => {
    const block = { type: "process", steps: [{ title: "Plan" }, { title: "Execute" }] };
    const result = injectSubItemIds(block);
    expect(result.steps[0].id).toBeDefined();
    expect(result.steps[1].id).toBeDefined();
    expect(result.steps[0].id).not.toBe(result.steps[1].id);
  });

  it("injects ids into sorting buckets and items when missing", () => {
    const block = {
      type: "sorting",
      prompt: "Sort.",
      showFeedback: true,
      buckets: [{ label: "A" }, { label: "B" }],
      items: [{ text: "Item 1", bucketId: "placeholder" }, { text: "Item 2", bucketId: "placeholder" }],
    };
    const result = injectSubItemIds(block);
    expect(result.buckets[0].id).toBeDefined();
    expect(result.buckets[1].id).toBeDefined();
    expect(result.items[0].id).toBeDefined();
    expect(result.items[1].id).toBeDefined();
  });

  it("preserves existing sorting bucket and item ids", () => {
    const block = {
      type: "sorting",
      prompt: "Sort.",
      showFeedback: true,
      buckets: [{ id: "bk1", label: "A" }, { id: "bk2", label: "B" }],
      items: [{ id: "i1", text: "Item 1", bucketId: "bk1" }, { id: "i2", text: "Item 2", bucketId: "bk2" }],
    };
    const result = injectSubItemIds(block);
    expect(result.buckets[0].id).toBe("bk1");
    expect(result.items[0].id).toBe("i1");
  });

  it("injects ids into hotspot hotspots when missing", () => {
    const block = {
      type: "hotspot",
      src: "https://example.com/img.jpg",
      alt: "Diagram",
      hotspots: [{ x: 25, y: 40, label: "Part A" }],
    };
    const result = injectSubItemIds(block);
    expect(result.hotspots[0].id).toBeDefined();
  });

  it("injects ids into branching choices when missing", () => {
    const block = {
      type: "branching",
      prompt: "What do you do?",
      choices: [{ label: "A", content: "<p>A</p>" }, { label: "B", content: "<p>B</p>" }],
    };
    const result = injectSubItemIds(block);
    expect(result.choices[0].id).toBeDefined();
    expect(result.choices[1].id).toBeDefined();
  });

  it("is a no-op for blocks without sub-items", () => {
    const block = { type: "text", text: "Hello" };
    const result = injectSubItemIds(block);
    expect(result).toEqual(block);
  });

  it("handles undefined items gracefully", () => {
    const block = { type: "accordion" };
    const result = injectSubItemIds(block);
    expect(result.items).toEqual([]);
  });
});
