import { describe, it, expect } from "vitest";
import { getMimeType, SUPPORTED_EXTENSIONS } from "../mime.js";

describe("getMimeType", () => {
  it("returns text/html for .html", () => {
    expect(getMimeType("/path/to/file.html")).toBe("text/html");
  });
  it("returns text/html for .htm", () => {
    expect(getMimeType("/path/to/file.htm")).toBe("text/html");
  });
  it("returns image/png for .png (case-insensitive)", () => {
    expect(getMimeType("/path/to/file.PNG")).toBe("image/png");
  });
  it("returns image/jpeg for .jpg and .jpeg", () => {
    expect(getMimeType("/path/to/file.jpg")).toBe("image/jpeg");
    expect(getMimeType("/path/to/file.jpeg")).toBe("image/jpeg");
  });
  it("returns video/mp4 for .mp4", () => {
    expect(getMimeType("/path/to/file.mp4")).toBe("video/mp4");
  });
  it("returns audio/mpeg for .mp3", () => {
    expect(getMimeType("/path/to/file.mp3")).toBe("audio/mpeg");
  });
  it("returns application/pdf for .pdf", () => {
    expect(getMimeType("/path/to/file.pdf")).toBe("application/pdf");
  });
  it("returns null for unknown extensions", () => {
    expect(getMimeType("/path/to/file.xyz")).toBeNull();
    expect(getMimeType("/path/to/file.exe")).toBeNull();
  });
  it("returns audio/mp4 for .m4a", () => {
    expect(getMimeType("/path/to/file.m4a")).toBe("audio/mp4");
  });
  it("returns audio/mp4 for .M4A (case-insensitive)", () => {
    expect(getMimeType("/path/to/file.M4A")).toBe("audio/mp4");
  });
  it("returns audio/ogg for .ogg", () => {
    expect(getMimeType("/path/to/file.ogg")).toBe("audio/ogg");
  });
});

describe("SUPPORTED_EXTENSIONS", () => {
  it("is a non-empty array of strings starting with dot", () => {
    expect(SUPPORTED_EXTENSIONS.length).toBeGreaterThan(0);
    expect(SUPPORTED_EXTENSIONS.every(e => e.startsWith("."))).toBe(true);
  });
});
