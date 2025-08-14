/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { sanitize } from "../sanitize";

describe("sanitize", () => {
  it("strips dangerous XSS content", () => {
    const dirty = '<img src=x onerror=alert(1)><svg><script>alert(1)</script></svg>';
    const clean = sanitize(dirty);
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<script>");
    expect(clean).toContain("<img");
  });
});

