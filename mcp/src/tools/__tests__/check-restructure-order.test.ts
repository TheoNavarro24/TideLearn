import { describe, it, expect } from "vitest";
import { checkRestructureOrder } from "../semantic.js";

describe("checkRestructureOrder", () => {
  it("returns null when all ids are provided", () => {
    const result = checkRestructureOrder(["a", "b", "c"], ["a", "b", "c"]);
    expect(result).toBeNull();
  });

  it("returns null when ids are in different order", () => {
    const result = checkRestructureOrder(["a", "b", "c"], ["c", "a", "b"]);
    expect(result).toBeNull();
  });

  it("returns error message when ids are missing", () => {
    const result = checkRestructureOrder(["a", "b", "c"], ["a", "c"]);
    expect(result).not.toBeNull();
    expect(result).toContain("b");
    expect(result).toContain("Missing");
  });

  it("returns error listing all missing ids", () => {
    const result = checkRestructureOrder(["a", "b", "c", "d"], ["a"]);
    expect(result).not.toBeNull();
    expect(result).toContain("b");
    expect(result).toContain("c");
    expect(result).toContain("d");
  });

  it("returns null for empty arrays", () => {
    const result = checkRestructureOrder([], []);
    expect(result).toBeNull();
  });

  it("allows extra ids that are not in the existing set", () => {
    const result = checkRestructureOrder(["a", "b"], ["a", "b", "extra"]);
    expect(result).toBeNull();
  });
});
