import { describe, it, expect } from "vitest";
import { blockSchema } from "../src/lib/types.js";

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
