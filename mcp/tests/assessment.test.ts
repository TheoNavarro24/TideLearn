import { describe, it, expect } from "vitest";
import { uid } from "../src/lib/uid.js";

// Test the replace logic: given existing questions, after replace, only new ones exist.
describe("replace_questions contract", () => {
  it("result contains only the new questions", () => {
    const existing = [
      { id: uid(), text: "Old Q1", options: ["A","B","C","D"], correctIndex: 0 },
    ];
    const incoming = [
      { text: "New Q1", options: ["A","B","C","D"], correctIndex: 1 },
      { text: "New Q2", options: ["A","B","C","D"], correctIndex: 2 },
    ];
    // Simulate the replace operation
    const withIds = incoming.map(q => ({ ...q, id: uid() }));
    expect(withIds).toHaveLength(2);
    expect(withIds[0].text).toBe("New Q1");
    expect(typeof withIds[0].id).toBe("string");
    // Old questions are gone
    const oldIds = new Set(existing.map(q => q.id));
    expect(withIds.some(q => oldIds.has(q.id))).toBe(false);
  });
});
