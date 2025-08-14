import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    const hidden = false;
    const result = cn("p-2", "p-4", hidden && "hidden", undefined, "text-sm");
    expect(result).toBe("p-4 text-sm");
  });
});

