import { describe, it, expect } from "vitest";
import { ALLOWED_TYPES } from "@/lib/upload";

describe("ALLOWED_TYPES", () => {
  it("includes audio/m4a in audio category", () => {
    expect(ALLOWED_TYPES.audio).toContain("audio/m4a");
  });
  it("includes audio/x-m4a in audio category", () => {
    expect(ALLOWED_TYPES.audio).toContain("audio/x-m4a");
  });
});
