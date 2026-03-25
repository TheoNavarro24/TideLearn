import { describe, it, expect } from "vitest";
import { renderCourseToHtml } from "../preview.js";
import type { Course } from "../../lib/types.js";

function courseWithBlock(block: any): Course {
  return {
    schemaVersion: 1,
    title: "Test",
    lessons: [{ kind: "content", id: "l1", title: "L1", blocks: [{ id: "b1", ...block }] }],
  } as Course;
}

describe("renderBlock — Phase 2A block types", () => {
  it("renders button block with label and URL", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "button", label: "Learn More", url: "https://example.com", variant: "primary", openInNewTab: true,
    }));
    expect(html).toContain("Learn More");
    expect(html).toContain("https://example.com");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders embed block with title", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "embed", url: "https://example.com/widget", title: "Interactive Demo", height: 400,
    }));
    expect(html).toContain("Interactive Demo");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders flashcard block with front and back", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "flashcard", front: "What is TDD?", back: "Test-Driven Development",
    }));
    expect(html).toContain("What is TDD?");
    expect(html).toContain("Test-Driven Development");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders timeline block with items", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "timeline", items: [
        { id: "i1", date: "2024", title: "Launch", description: "We launched." },
        { id: "i2", date: "2025", title: "Growth" },
      ],
    }));
    expect(html).toContain("2024");
    expect(html).toContain("Launch");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders process block with steps", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "process", steps: [
        { id: "s1", title: "Plan", description: "Make a plan." },
        { id: "s2", title: "Execute" },
      ],
    }));
    expect(html).toContain("Plan");
    expect(html).toContain("Execute");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders chart block with title and data", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "chart", chartType: "bar", title: "Sales Data",
      labels: ["Q1", "Q2"], datasets: [{ label: "Revenue", values: [100, 200] }],
    }));
    expect(html).toContain("Sales Data");
    expect(html).toContain("bar");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders sorting block with prompt and buckets", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "sorting", prompt: "Sort these items.", showFeedback: true,
      buckets: [{ id: "bk1", label: "Fruits" }, { id: "bk2", label: "Vegetables" }],
      items: [{ id: "i1", text: "Apple", bucketId: "bk1" }, { id: "i2", text: "Carrot", bucketId: "bk2" }],
    }));
    expect(html).toContain("Sort these items.");
    expect(html).toContain("Fruits");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders hotspot block with image info", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "hotspot", src: "https://example.com/diagram.png", alt: "Architecture Diagram",
      hotspots: [{ id: "h1", x: 25, y: 40, label: "Database", description: "The primary DB." }],
    }));
    expect(html).toContain("Architecture Diagram");
    expect(html).toContain("Database");
    expect(html).not.toContain("[Unknown block type]");
  });

  it("renders branching block with prompt and choices", () => {
    const html = renderCourseToHtml(courseWithBlock({
      type: "branching", prompt: "What would you do?",
      choices: [
        { id: "c1", label: "Option A", content: "<p>Outcome A</p>" },
        { id: "c2", label: "Option B", content: "<p>Outcome B</p>" },
      ],
    }));
    expect(html).toContain("What would you do?");
    expect(html).toContain("Option A");
    expect(html).not.toContain("[Unknown block type]");
  });
});
