import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withAuth, ok, err } from "../lib/supabase.js";
import { type Course, type Block } from "../lib/types.js";

// ─── Pure rendering helpers ──────────────────────────────────────────────────

function renderBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h2 style="font-size:1.4em;margin:1em 0 0.5em">${esc(block.text)}</h2>`;
    case "text":
      return `<div style="margin:0.5em 0">${block.text}</div>`;
    case "image":
      return `<figure style="margin:1em 0"><img src="${esc(block.src)}" alt="${esc(block.alt)}" style="max-width:100%"/><figcaption>${esc(block.alt)}</figcaption></figure>`;
    case "video":
      return `<p style="background:#f0f0f0;padding:0.5em">[Video: ${esc(block.url)}]</p>`;
    case "audio":
      return `<p style="background:#f0f0f0;padding:0.5em">[Audio: ${esc(block.title ?? block.src)}]</p>`;
    case "list": {
      const tag = block.style === "numbered" ? "ol" : "ul";
      return `<${tag} style="margin:0.5em 0 0.5em 1.5em">${block.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
    }
    case "quote":
      return `<blockquote style="border-left:3px solid #ccc;padding-left:1em;margin:1em 0;font-style:italic">${esc(block.text)}${block.cite ? `<footer>— ${esc(block.cite)}</footer>` : ""}</blockquote>`;
    case "callout": {
      const colors: Record<string, string> = { info: "#dbeafe", success: "#dcfce7", warning: "#fef9c3", danger: "#fee2e2" };
      return `<div style="background:${colors[block.variant] ?? "#f0f0f0"};padding:1em;margin:1em 0;border-radius:4px">${block.title ? `<strong>${esc(block.title)}</strong><br/>` : ""}${block.text}</div>`;
    }
    case "code":
      return `<pre style="background:#1e1e1e;color:#d4d4d4;padding:1em;margin:1em 0;overflow:auto"><code>${esc(block.code)}</code></pre>`;
    case "quiz":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Quiz:</strong> ${esc(block.question)}<ul>${block.options.map((o, i) => `<li>${i === block.correctIndex ? "✓ " : ""}${esc(o)}</li>`).join("")}</ul></div>`;
    case "truefalse":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>True/False:</strong> ${esc(block.question)} <em>(Answer: ${block.correct ? "True" : "False"})</em></div>`;
    case "shortanswer":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Short Answer:</strong> ${esc(block.question)} <em>(Expected: ${esc(block.answer)})</em></div>`;
    case "accordion":
      return `<details style="margin:0.5em 0"><summary style="cursor:pointer;font-weight:bold">Accordion (${block.items.length} sections)</summary><ul>${block.items.map((i) => `<li><strong>${esc(i.title)}</strong>: ${i.content}</li>`).join("")}</ul></details>`;
    case "tabs":
      return `<div style="border:1px solid #ccc;padding:1em;margin:1em 0">[Tabs: ${block.items.map((t) => esc(t.label)).join(" | ")}]</div>`;
    case "divider":
      return `<hr style="margin:1em 0"/>`;
    case "toc":
      return `<div style="background:#f0f0f0;padding:0.5em;margin:1em 0">[Table of Contents — auto-generated]</div>`;
    case "document":
      return `<div style="background:#f8f8f8;padding:1em;margin:1em 0;border-radius:4px;display:flex;align-items:center;gap:0.75em">
    <span style="font-size:1.5em">📄</span>
    <div>
      ${block.title ? `<strong>${esc(block.title)}</strong><br/>` : ""}
      <a href="${esc(block.src)}" target="_blank" style="color:#6366f1;font-size:0.875em">${esc(block.src)}</a>
      <span style="font-size:0.75em;color:#888;margin-left:0.5em">(${esc(block.fileType.toUpperCase())})</span>
    </div>
  </div>`;
    default:
      return `<p>[Unknown block type]</p>`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderCourseToHtml(course: Course): string {
  const lessonHtml = course.lessons
    .map(
      (lesson, i) => {
        const contentHtml = (lesson as any).kind === "assessment"
          ? `<div style="background:#f0fdf4;padding:1em;border-radius:4px;border:1px solid #ccfbf1">
      <strong>Assessment lesson</strong> — ${(lesson as any).questions?.length ?? 0} questions
     </div>`
          : (lesson as any).blocks.map(renderBlock).join("\n");
        return `
      <section style="margin-bottom:2em;padding:1em;border:1px solid #e0e0e0;border-radius:6px">
        <h1 style="font-size:1.6em;margin:0 0 1em;border-bottom:2px solid #333;padding-bottom:0.25em">
          Lesson ${i + 1}: ${esc(lesson.title)}
        </h1>
        ${contentHtml}
      </section>`;
      }
    )
    .join("\n");

  const contentLessons = course.lessons.filter(l => (l as any).kind !== "assessment");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${esc(course.title)}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2em auto;padding:0 1em;line-height:1.6;color:#222}</style>
  </head><body>
    <header style="margin-bottom:2em"><h1 style="font-size:2em">${esc(course.title)}</h1>
    <p>${course.lessons.length} lessons · ${contentLessons.reduce((n, l) => n + (l as any).blocks.length, 0)} blocks</p></header>
    ${lessonHtml}
  </body></html>`;
}

const KNOWLEDGE_TYPES = new Set(["quiz", "truefalse", "shortanswer"]);
const MEDIA_TYPES = new Set(["image", "video", "audio"]);

export function analyzeCourse(course: Course) {
  const block_type_breakdown: Record<string, number> = {};
  let block_count = 0;
  let assessment_count = 0;
  let word_count = 0;
  const gaps: Array<{ type: string; lesson_id: string; message: string }> = [];

  for (const lesson of course.lessons) {
    if ((lesson as any).kind === "assessment") {
      const qCount = (lesson as any).questions?.length ?? 0;
      assessment_count += qCount;
      continue;
    }

    let hasAssessment = false;
    let hasMedia = false;
    const cl = lesson as any;

    for (const block of cl.blocks) {
      block_count++;
      block_type_breakdown[block.type] = (block_type_breakdown[block.type] ?? 0) + 1;
      if (KNOWLEDGE_TYPES.has(block.type)) { assessment_count++; hasAssessment = true; }
      if (MEDIA_TYPES.has(block.type)) hasMedia = true;
      if ("text" in block && typeof (block as any).text === "string") {
        word_count += (block as any).text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
      }
    }

    if (!hasAssessment) gaps.push({ type: "no_assessment", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no knowledge checks` });
    if (!hasMedia) gaps.push({ type: "no_media", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has no media blocks` });
    if (cl.blocks.length > 10) gaps.push({ type: "too_long", lesson_id: lesson.id, message: `Lesson "${lesson.title}" has ${cl.blocks.length} blocks (max recommended: 10)` });
  }

  return {
    lesson_count: course.lessons.length,
    block_count,
    block_type_breakdown,
    assessment_count,
    estimated_read_minutes: Math.max(1, Math.round(word_count / 200)),
    gaps,
  };
}

// ─── MCP tool registration ────────────────────────────────────────────────────

export function registerPreviewTools(server: McpServer) {
  server.tool(
    "preview_course",
    "Render a course to HTML so you can read and assess its content, layout, and flow",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        const html = renderCourseToHtml(data.content as Course);
        return { content: [{ type: "text", text: html }] };
      })
  );

  server.tool(
    "review_course",
    "Analyse a course structure and return lesson/block counts, assessment coverage, estimated read time, and content gaps",
    { course_id: z.string().uuid() },
    async ({ course_id }) =>
      withAuth(async (client, userId) => {
        const { data, error } = await client
          .from("courses")
          .select("content")
          .eq("id", course_id)
          .eq("user_id", userId)
          .single();

        if (error || !data) return err("course_not_found", `No course with id ${course_id}`);
        return ok(analyzeCourse(data.content as Course));
      })
  );
}
