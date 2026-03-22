import { describe, it, expect } from "vitest";
import { checkRestructureOrder } from "../src/tools/semantic.js";

describe("checkRestructureOrder", () => {
  it("returns null when all lesson IDs are present", () => {
    const existing = ["l1", "l2", "l3"];
    const provided = ["l3", "l1", "l2"];
    expect(checkRestructureOrder(existing, provided)).toBeNull();
  });

  it("returns missing IDs when lesson_order is incomplete", () => {
    const existing = ["l1", "l2", "l3"];
    const provided = ["l1", "l2"];
    const result = checkRestructureOrder(existing, provided);
    expect(result).not.toBeNull();
    expect(result).toContain("l3");
  });

  it("returns null for empty course", () => {
    expect(checkRestructureOrder([], [])).toBeNull();
  });
});
