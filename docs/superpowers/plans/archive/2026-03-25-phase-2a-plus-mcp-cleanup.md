# Phase 2A+ MCP Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all MCP bugs, gaps, and stale documentation left over from Phase 1 and Phase 2A, and add test coverage for the pure functions and code paths that Phase 2B will extend.

**Architecture:** Seven focused tasks: fix frontend sorting schema, extend `injectSubItemIds` for 5 new block types, add `renderBlock` cases for 9 blocks, update tool descriptions and instructions, fix `update_assessment_config` silent no-op, and add comprehensive tests for all pure functions.

**Tech Stack:** TypeScript, Zod, Vitest

---

### Task 1: Fix frontend `sortingBlockSchema` (strict)

**Files:**
- Modify: `src/types/course.ts:406-414`

The strict `sortingBlockSchema` uses `correctPosition: number` and has no `buckets` field. The TypeScript type (`SortingBlock`, line 130–137), the permissive schema (line 561–567), the MCP schema, and both factories all use `buckets + bucketId`. The strict schema is the odd one out.

Note: The frontend has no Vitest setup (Vitest is only configured in `mcp/`). This fix is verified by the TypeScript build and by the MCP test suite which already validates sorting blocks with the correct `buckets + bucketId` shape.

- [ ] **Step 1: Fix the strict sortingBlockSchema to match the TypeScript type and MCP schema**

In `src/types/course.ts`, replace lines 406–414:

```typescript
// BEFORE (broken — uses correctPosition, no buckets):
export const sortingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("sorting"),
  prompt: z.string().min(1),
  items: z.array(z.object({
    id: z.string(), text: z.string().min(1), correctPosition: z.number().int().min(0),
  })).min(2),
  showFeedback: z.boolean(),
});

// AFTER (matches TypeScript type, permissive schema, and MCP):
export const sortingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("sorting"),
  prompt: z.string().min(1),
  buckets: z.array(z.object({
    id: z.string(), label: z.string().min(1),
  })).min(2),
  items: z.array(z.object({
    id: z.string(), text: z.string().min(1), bucketId: z.string(),
  })).min(2),
  showFeedback: z.boolean(),
});
```

- [ ] **Step 2: Run the frontend build to verify the schema change compiles correctly**

Run: `cd /Users/theonavarro/TideLearn && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Run the MCP test suite to confirm sorting block tests still pass**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`
Expected: All tests pass (the MCP's sorting block tests already use `buckets + bucketId`).

- [ ] **Step 4: Commit**

```bash
git add src/types/course.ts
git commit -m "fix: align strict sortingBlockSchema with TypeScript type (buckets + bucketId)

The strict sortingBlockSchema used correctPosition and had no buckets field,
diverging from the TypeScript type, permissive schema, MCP schema, and factory.
Now uses buckets + bucketId consistently everywhere."
```

---

### Task 2: Extend `injectSubItemIds` for Phase 2A block types

**Files:**
- Modify: `mcp/src/tools/semantic.ts:8-19`
- Create: `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts`

Currently `injectSubItemIds` only handles `accordion` and `tabs`. Five Phase 2A block types have nested items with required `id` fields: `timeline` (items), `process` (steps), `sorting` (buckets + items), `hotspot` (hotspots), `branching` (choices). When Claude omits sub-item IDs, `add_block` validation fails — unlike accordion/tabs where IDs are injected automatically.

- [ ] **Step 1: Write failing tests for the 5 missing block types**

Create `mcp/src/tools/__tests__/inject-sub-item-ids.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { injectSubItemIds } from "../semantic.js";

describe("injectSubItemIds", () => {
  it("injects ids into accordion items when missing", () => {
    const block = { type: "accordion", items: [{ title: "S1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
    expect(typeof result.items[0].id).toBe("string");
    expect(result.items[0].id.length).toBeGreaterThan(0);
  });

  it("preserves existing accordion item ids", () => {
    const block = { type: "accordion", items: [{ id: "keep-me", title: "S1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("keep-me");
  });

  it("injects ids into tabs items when missing", () => {
    const block = { type: "tabs", items: [{ label: "T1", content: "C1" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
  });

  it("injects ids into timeline items when missing", () => {
    const block = { type: "timeline", items: [{ date: "2024", title: "Launch" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBeDefined();
    expect(typeof result.items[0].id).toBe("string");
  });

  it("preserves existing timeline item ids", () => {
    const block = { type: "timeline", items: [{ id: "keep", date: "2024", title: "Launch" }] };
    const result = injectSubItemIds(block);
    expect(result.items[0].id).toBe("keep");
  });

  it("injects ids into process steps when missing", () => {
    const block = { type: "process", steps: [{ title: "Plan" }, { title: "Execute" }] };
    const result = injectSubItemIds(block);
    expect(result.steps[0].id).toBeDefined();
    expect(result.steps[1].id).toBeDefined();
    expect(result.steps[0].id).not.toBe(result.steps[1].id);
  });

  it("injects ids into sorting buckets and items when missing", () => {
    const block = {
      type: "sorting",
      prompt: "Sort.",
      showFeedback: true,
      buckets: [{ label: "A" }, { label: "B" }],
      items: [{ text: "Item 1", bucketId: "placeholder" }, { text: "Item 2", bucketId: "placeholder" }],
    };
    const result = injectSubItemIds(block);
    expect(result.buckets[0].id).toBeDefined();
    expect(result.buckets[1].id).toBeDefined();
    expect(result.items[0].id).toBeDefined();
    expect(result.items[1].id).toBeDefined();
  });

  it("preserves existing sorting bucket and item ids", () => {
    const block = {
      type: "sorting",
      prompt: "Sort.",
      showFeedback: true,
      buckets: [{ id: "bk1", label: "A" }, { id: "bk2", label: "B" }],
      items: [{ id: "i1", text: "Item 1", bucketId: "bk1" }, { id: "i2", text: "Item 2", bucketId: "bk2" }],
    };
    const result = injectSubItemIds(block);
    expect(result.buckets[0].id).toBe("bk1");
    expect(result.items[0].id).toBe("i1");
  });

  it("injects ids into hotspot hotspots when missing", () => {
    const block = {
      type: "hotspot",
      src: "https://example.com/img.jpg",
      alt: "Diagram",
      hotspots: [{ x: 25, y: 40, label: "Part A" }],
    };
    const result = injectSubItemIds(block);
    expect(result.hotspots[0].id).toBeDefined();
  });

  it("injects ids into branching choices when missing", () => {
    const block = {
      type: "branching",
      prompt: "What do you do?",
      choices: [{ label: "A", content: "<p>A</p>" }, { label: "B", content: "<p>B</p>" }],
    };
    const result = injectSubItemIds(block);
    expect(result.choices[0].id).toBeDefined();
    expect(result.choices[1].id).toBeDefined();
  });

  it("is a no-op for blocks without sub-items", () => {
    const block = { type: "text", text: "Hello" };
    const result = injectSubItemIds(block);
    expect(result).toEqual(block);
  });

  it("handles undefined items gracefully", () => {
    const block = { type: "accordion" };
    const result = injectSubItemIds(block);
    expect(result.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/inject-sub-item-ids.test.ts`
Expected: Tests for timeline, process, sorting, hotspot, branching FAIL. Accordion and tabs tests PASS.

- [ ] **Step 3: Extend `injectSubItemIds` to handle all block types with nested items**

In `mcp/src/tools/semantic.ts`, replace lines 8–19:

```typescript
export function injectSubItemIds(block: any): any {
  switch (block.type) {
    case "accordion":
    case "tabs":
      return {
        ...block,
        items: (block.items ?? []).map((item: any) => ({
          ...item,
          id: item.id ?? uid(),
        })),
      };
    case "timeline":
      return {
        ...block,
        items: (block.items ?? []).map((item: any) => ({
          ...item,
          id: item.id ?? uid(),
        })),
      };
    case "process":
      return {
        ...block,
        steps: (block.steps ?? []).map((step: any) => ({
          ...step,
          id: step.id ?? uid(),
        })),
      };
    case "sorting":
      return {
        ...block,
        buckets: (block.buckets ?? []).map((bucket: any) => ({
          ...bucket,
          id: bucket.id ?? uid(),
        })),
        items: (block.items ?? []).map((item: any) => ({
          ...item,
          id: item.id ?? uid(),
        })),
      };
    case "hotspot":
      return {
        ...block,
        hotspots: (block.hotspots ?? []).map((hs: any) => ({
          ...hs,
          id: hs.id ?? uid(),
        })),
      };
    case "branching":
      return {
        ...block,
        choices: (block.choices ?? []).map((choice: any) => ({
          ...choice,
          id: choice.id ?? uid(),
        })),
      };
    default:
      return block;
  }
}
```

Note: The `uid` import is already at the top of the file via `import { uid, lessonSchema, blockSchema, type Block } from "../lib/types.js";`.

- [ ] **Step 4: Run tests to verify they all pass**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/inject-sub-item-ids.test.ts`
Expected: All PASS

- [ ] **Step 5: Run the full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/tools/semantic.ts mcp/src/tools/__tests__/inject-sub-item-ids.test.ts
git commit -m "fix: extend injectSubItemIds for timeline, process, sorting, hotspot, branching

These 5 block types have nested items with required id fields but IDs were
not auto-injected like accordion/tabs. Now add_block and save_course inject
sub-item IDs for all 7 block types with nested items."
```

---

### Task 3: Add `renderBlock` cases for Phase 2A block types

**Files:**
- Modify: `mcp/src/tools/preview.ts:16-64`
- Create: `mcp/src/tools/__tests__/render-block.test.ts`

Currently all 9 Phase 2A block types fall through to `default: return '<p>[Unknown block type]</p>'` in `renderBlock`. Claude gets "[Unknown block type]" when previewing courses with these blocks.

- [ ] **Step 1: Write failing tests for the missing block type renderers**

Create `mcp/src/tools/__tests__/render-block.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
// renderBlock is not exported — we test via renderCourseToHtml
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/render-block.test.ts`
Expected: All 9 tests FAIL — they all contain "[Unknown block type]".

- [ ] **Step 3: Add render cases for all 9 Phase 2A block types**

In `mcp/src/tools/preview.ts`, add the following cases before the `default:` case (before line 62):

```typescript
    case "button":
      return `<div style="margin:1em 0"><a href="${esc(block.url)}" style="display:inline-block;padding:0.5em 1.5em;background:#40c8a0;color:#fff;border-radius:4px;text-decoration:none;font-weight:600"${block.openInNewTab ? ' target="_blank"' : ""}>${esc(block.label)}</a> <span style="font-size:0.75em;color:#888">[${esc(block.variant)}]</span></div>`;
    case "embed":
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:1em;margin:1em 0"><strong>${esc(block.title)}</strong><br/><a href="${esc(block.url)}" style="font-size:0.875em;color:#6366f1">${esc(block.url)}</a><br/><span style="font-size:0.75em;color:#888">Embedded content · ${block.height}px</span></div>`;
    case "flashcard":
      return `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:1em;margin:1em 0"><strong>Front:</strong> ${block.front}<br/><strong>Back:</strong> ${block.back}${block.hint ? `<br/><em style="color:#888">Hint: ${esc(block.hint)}</em>` : ""}</div>`;
    case "timeline":
      return `<div style="border-left:3px solid #40c8a0;padding-left:1em;margin:1em 0">${block.items.map((item: any) => `<div style="margin:0.5em 0"><strong>${esc(item.date)}</strong> — ${esc(item.title)}${item.description ? `<br/><span style="font-size:0.875em;color:#666">${esc(item.description)}</span>` : ""}</div>`).join("")}</div>`;
    case "process":
      return `<ol style="margin:1em 0;padding-left:1.5em">${block.steps.map((step: any) => `<li style="margin:0.5em 0"><strong>${esc(step.title)}</strong>${step.description ? ` — ${esc(step.description)}` : ""}</li>`).join("")}</ol>`;
    case "chart":
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:1em;margin:1em 0">${block.title ? `<strong>${esc(block.title)}</strong><br/>` : ""}[${esc(block.chartType)} chart · ${block.labels.length} labels · ${block.datasets.length} dataset(s)]<br/><span style="font-size:0.875em;color:#888">Labels: ${block.labels.map(esc).join(", ")}</span></div>`;
    case "sorting": {
      const bucketMap = new Map((block.buckets ?? []).map((b: any) => [b.id, b.label]));
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:1em;margin:1em 0"><strong>Sorting:</strong> ${esc(block.prompt)}<br/><em>Buckets:</em> ${block.buckets.map((b: any) => esc(b.label)).join(", ")}<br/><em>Items:</em><ul>${block.items.map((item: any) => `<li>${esc(item.text)} → ${esc(bucketMap.get(item.bucketId) ?? "?")}</li>`).join("")}</ul></div>`;
    }
    case "hotspot":
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:1em;margin:1em 0"><strong>Hotspot Image:</strong> ${esc(block.alt)}<br/><img src="${esc(block.src)}" alt="${esc(block.alt)}" style="max-width:100%"/>${block.hotspots.length > 0 ? `<ul>${block.hotspots.map((hs: any) => `<li>(${hs.x}%, ${hs.y}%) <strong>${esc(hs.label)}</strong>${hs.description ? `: ${esc(hs.description)}` : ""}</li>`).join("")}</ul>` : "<p><em>No hotspots defined.</em></p>"}</div>`;
    case "branching":
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:1em;margin:1em 0"><strong>Branching:</strong> ${esc(block.prompt)}<ul>${block.choices.map((c: any) => `<li><strong>${esc(c.label)}</strong>: ${c.content}</li>`).join("")}</ul></div>`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/render-block.test.ts`
Expected: All PASS

- [ ] **Step 5: Run the full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/tools/preview.ts mcp/src/tools/__tests__/render-block.test.ts
git commit -m "fix: add renderBlock cases for all 9 Phase 2A block types

preview_course was rendering button, embed, flashcard, timeline, process,
chart, sorting, hotspot, and branching as '[Unknown block type]'. Now all
26 block types produce meaningful HTML previews."
```

---

### Task 4: Update `add_block` tool description with Phase 2A types

**Files:**
- Modify: `mcp/src/tools/blocks.ts:82-105`

The inline docstring for `add_block` only lists 17 block types. The 9 Phase 2A types are missing.

- [ ] **Step 1: Update the add_block tool description**

In `mcp/src/tools/blocks.ts`, replace the tool description (lines 82–105) with:

```typescript
    `Add a block to a lesson. Omit the 'id' field — it is generated automatically.
Sub-item ids (in accordion, tabs, timeline, process, sorting, hotspot, branching) are also auto-generated — omit them.

BLOCK TYPES — pass exactly these fields in the 'block' object:

  heading     { type:"heading", text:"..." }
  text        { type:"text", text:"..." }
  image       { type:"image", src:"https://...", alt:"..." }
  video       { type:"video", url:"https://youtube.com/..." }
  audio       { type:"audio", src:"https://...", title?:"..." }
  code        { type:"code", language:"python", code:"..." }
  list        { type:"list", style:"bulleted"|"numbered", items:["item1","item2"] }
  quote       { type:"quote", text:"...", cite?:"Author" }
  callout     { type:"callout", variant:"info"|"success"|"warning"|"danger", title?:"...", text:"..." }
  accordion   { type:"accordion", items:[{ title:"...", content:"..." }] }
  tabs        { type:"tabs", items:[{ label:"...", content:"..." }] }
  quiz        { type:"quiz", question:"...", options:["A","B","C","D"], correctIndex:0 }
  truefalse   { type:"truefalse", question:"...", correct:true|false, feedbackCorrect?:"...", feedbackIncorrect?:"..." }
  shortanswer { type:"shortanswer", question:"...", answer:"...", acceptable?:["alt1"], caseSensitive?:false, trimWhitespace?:true }
  document    { type:"document", src:"https://...", fileType:"pdf"|"docx"|"xlsx"|"pptx", title?:"..." }
  divider     { type:"divider" }
  toc         { type:"toc" }
  button      { type:"button", label:"...", url:"https://...", variant:"primary"|"secondary"|"outline", openInNewTab:boolean }
  embed       { type:"embed", url:"https://...", title:"...", height:400 }
  flashcard   { type:"flashcard", front:"...", back:"...", hint?:"..." }
  timeline    { type:"timeline", items:[{ date:"2024", title:"...", description?:"..." }] }
  process     { type:"process", steps:[{ title:"...", description?:"..." }] }
  chart       { type:"chart", chartType:"bar"|"line"|"pie", title?:"...", labels:["A","B"], datasets:[{ label:"S1", values:[10,20] }] }
  sorting     { type:"sorting", prompt:"...", showFeedback:boolean, buckets:[{ label:"..." }], items:[{ text:"...", bucketId:"<bucket-id>" }] }
  hotspot     { type:"hotspot", src:"https://...", alt:"...", hotspots:[{ x:25, y:40, label:"...", description?:"..." }] }
  branching   { type:"branching", prompt:"...", choices:[{ label:"...", content:"<p>...</p>" }] }

position is 1-based and optional; omit to append at the end.`,
```

- [ ] **Step 2: Run the MCP build to verify no syntax errors**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/tools/blocks.ts
git commit -m "docs: add Phase 2A block types to add_block tool description

The inline docstring now lists all 26 block types with their fields,
and notes that sub-item IDs are auto-generated for all complex types."
```

---

### Task 5: Fix `update_assessment_config` silent no-op on content lessons

**Files:**
- Modify: `mcp/src/tools/assessment.ts:257-275`
- Create: `mcp/src/tools/__tests__/assessment-config.test.ts`

Currently if `lesson_id` points to a content lesson, the tool returns `{ updated: true }` but changes nothing. It should return an error.

- [ ] **Step 1: Fix the mutation to detect non-assessment lessons**

No unit test for this fix — the mutation logic lives inside the tool handler's Supabase callback, which requires integration testing with a mocked Supabase client (out of scope for this sprint). The fix follows the same pattern already used by all other assessment tools (`add_question`, `delete_question`, etc.), so it is well-established.

In `mcp/src/tools/assessment.ts`, replace lines 262–271:

```typescript
// BEFORE:
        const mutError = await mutateCourse(client, userId, course_id, (course) => ({
          ...course,
          lessons: course.lessons.map((l) => {
            if (l.id !== lesson_id || (l as any).kind !== "assessment") return l;
            const config = { ...(l as any).config };
            if (passingScore !== undefined) config.passingScore = passingScore;
            if (examSize !== undefined) config.examSize = examSize;
            return { ...l, config };
          }),
        }));
        if (mutError) return err(mutError, "Failed to update assessment config");
        return ok({ updated: true });

// AFTER:
        let notAssessment = false;
        let lessonNotFound = false;
        const mutError = await mutateCourse(client, userId, course_id, (course) => {
          const lesson = course.lessons.find((l) => l.id === lesson_id);
          if (!lesson) { lessonNotFound = true; return course; }
          if ((lesson as any).kind !== "assessment") { notAssessment = true; return course; }
          return {
            ...course,
            lessons: course.lessons.map((l) => {
              if (l.id !== lesson_id) return l;
              const config = { ...(l as any).config };
              if (passingScore !== undefined) config.passingScore = passingScore;
              if (examSize !== undefined) config.examSize = examSize;
              return { ...l, config };
            }),
          };
        });
        if (lessonNotFound) return err("lesson_not_found", `No lesson with id ${lesson_id}`);
        if (notAssessment) return err("not_assessment", "Lesson is not an assessment lesson");
        if (mutError) return err(mutError, "Failed to update assessment config");
        return ok({ updated: true });
```

- [ ] **Step 2: Run MCP build**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run the full MCP test suite**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/tools/assessment.ts
git commit -m "fix: update_assessment_config now errors on non-assessment lessons

Previously returned { updated: true } when targeting a content lesson,
silently doing nothing. Now returns lesson_not_found or not_assessment
errors, matching the pattern used by all other assessment tools."
```

---

### Task 6: Update instructions resource

**Files:**
- Modify: `mcp/src/resources/instructions.ts`

Several items need updating:
1. Timeline/process/sorting/hotspot/branching instructions should clarify sub-item IDs are auto-generated (matching accordion/tabs)
2. The note about `add_block` sub-item auto-generation should cover all 7 types

- [ ] **Step 1: Update the instructions resource**

In `mcp/src/resources/instructions.ts`, make these targeted changes:

**Change 1** — In the Interactive section (around line 203–208), update the note:

Replace:
```
Note: item \`id\` fields are injected automatically — do not provide them.
```
With:
```
Note: item \`id\` fields are injected automatically — do not provide them. This applies to all block types with sub-items: accordion, tabs, timeline, process, sorting, hotspot, and branching.
```

**Change 2** — In the Timeline/Process/Chart section (around lines 230–233), update the timeline and process notes:

Replace:
```
timeline    { type: "timeline",  items: [{ date: "2024", title: "...", description?: "..." }] }
              ↑ items need id fields (auto-generated); minimum 1 item.
process     { type: "process",   steps: [{ title: "...", description?: "..." }] }
              ↑ steps need id fields (auto-generated); minimum 1 step.
```
With:
```
timeline    { type: "timeline",  items: [{ date: "2024", title: "...", description?: "..." }] }
              ↑ item id fields are injected automatically — do not provide them. Minimum 1 item.
process     { type: "process",   steps: [{ title: "...", description?: "..." }] }
              ↑ step id fields are injected automatically — do not provide them. Minimum 1 step.
```

**Change 3** — In the Interactive Scenarios section (around lines 241–254), update the notes:

Replace:
```
              ↑ buckets and items need id fields (auto-generated); minimum 2 buckets, 2 items.
```
With:
```
              ↑ bucket and item id fields are injected automatically — do not provide them. Minimum 2 buckets, 2 items.
```

Replace:
```
              ↑ hotspots need id fields (auto-generated); empty array is valid.
```
With:
```
              ↑ hotspot id fields are injected automatically — do not provide them. Empty array is valid.
```

Replace:
```
              ↑ choices need id fields (auto-generated); minimum 2 choices. content accepts HTML.
```
With:
```
              ↑ choice id fields are injected automatically — do not provide them. Minimum 2 choices. content accepts HTML.
```

- [ ] **Step 2: Run MCP build**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/resources/instructions.ts
git commit -m "docs: clarify sub-item ID auto-injection in MCP instructions

Updated all Phase 2A block type docs to use the same 'injected automatically
— do not provide them' language as accordion/tabs, now that injectSubItemIds
handles all 7 block types with nested items."
```

---

### Task 7: Add test coverage for pure functions

**Files:**
- Create: `mcp/src/tools/__tests__/inject-ids.test.ts`
- Create: `mcp/src/tools/__tests__/check-restructure-order.test.ts`
- Create: `mcp/src/tools/__tests__/analyze-course.test.ts`

These are the pure functions that Phase 2B will build on. Testing them now creates the safety net.

- [ ] **Step 1: Write tests for `injectIds` and `injectLessonIds`**

Create `mcp/src/tools/__tests__/inject-ids.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { injectIds, injectLessonIds } from "../semantic.js";

describe("injectIds", () => {
  it("injects ids into lessons and blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "text", text: "Hello" }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBeDefined();
    expect(result.lessons[0].kind).toBe("content");
    expect(result.lessons[0].blocks[0].id).toBeDefined();
  });

  it("preserves existing ids", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { id: "keep-lesson", title: "L1", blocks: [{ id: "keep-block", type: "text", text: "Hello" }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBe("keep-lesson");
    expect(result.lessons[0].blocks[0].id).toBe("keep-block");
  });

  it("handles assessment lessons", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { kind: "assessment", title: "Quiz", questions: [{ text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].id).toBeDefined();
    expect(result.lessons[0].kind).toBe("assessment");
    expect((result.lessons[0] as any).questions[0].id).toBeDefined();
  });

  it("defaults to kind: content when kind is missing", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [{ title: "L1", blocks: [{ type: "text", text: "Hello" }] }],
    };
    const result = injectIds(course);
    expect(result.lessons[0].kind).toBe("content");
  });

  it("injects sub-item ids into accordion blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "accordion", items: [{ title: "S1", content: "C1" }] }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].blocks[0].items[0].id).toBeDefined();
  });

  it("injects sub-item ids into timeline blocks", () => {
    const course = {
      schemaVersion: 1,
      title: "Test",
      lessons: [
        { title: "L1", blocks: [{ type: "timeline", items: [{ date: "2024", title: "Launch" }] }] },
      ],
    };
    const result = injectIds(course);
    expect(result.lessons[0].blocks[0].items[0].id).toBeDefined();
  });

  it("handles empty lessons array", () => {
    const course = { schemaVersion: 1, title: "Test", lessons: [] };
    const result = injectIds(course);
    expect(result.lessons).toEqual([]);
  });
});

describe("injectLessonIds", () => {
  it("injects ids into a content lesson", () => {
    const lesson = { title: "L1", blocks: [{ type: "text", text: "Hello" }] };
    const result = injectLessonIds(lesson);
    expect(result.id).toBeDefined();
    expect(result.kind).toBe("content");
    expect(result.blocks[0].id).toBeDefined();
  });

  it("injects ids into an assessment lesson", () => {
    const lesson = {
      kind: "assessment",
      title: "Quiz",
      questions: [{ text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 }],
    };
    const result = injectLessonIds(lesson);
    expect(result.id).toBeDefined();
    expect(result.kind).toBe("assessment");
    expect((result as any).questions[0].id).toBeDefined();
  });

  it("always generates a new lesson id (not preserving)", () => {
    const lesson = { id: "old-id", title: "L1", blocks: [] };
    const result = injectLessonIds(lesson);
    // injectLessonIds always assigns a new id (unlike injectIds which preserves)
    expect(result.id).toBeDefined();
    expect(result.id).not.toBe("old-id");
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/inject-ids.test.ts`
Expected: All PASS (these test existing behavior, not new behavior)

- [ ] **Step 3: Write tests for `checkRestructureOrder`**

Create `mcp/src/tools/__tests__/check-restructure-order.test.ts`:

```typescript
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
    // Note: this documents current behavior — extra ids are silently ignored.
    // This may be a gap, but we're documenting it, not changing it.
    const result = checkRestructureOrder(["a", "b"], ["a", "b", "extra"]);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/check-restructure-order.test.ts`
Expected: All PASS

- [ ] **Step 5: Write tests for `analyzeCourse`**

Create `mcp/src/tools/__tests__/analyze-course.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analyzeCourse } from "../preview.js";
import type { Course } from "../../lib/types.js";

function makeCourse(lessons: any[]): Course {
  return { schemaVersion: 1, title: "Test", lessons } as Course;
}

describe("analyzeCourse", () => {
  it("counts lessons and blocks", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "Hello" },
        { id: "b2", type: "heading", text: "Title" },
      ]},
    ]));
    expect(result.lesson_count).toBe(1);
    expect(result.block_count).toBe(2);
  });

  it("reports block type breakdown", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "A" },
        { id: "b2", type: "text", text: "B" },
        { id: "b3", type: "heading", text: "C" },
      ]},
    ]));
    expect(result.block_type_breakdown.text).toBe(2);
    expect(result.block_type_breakdown.heading).toBe(1);
  });

  it("counts assessment questions from assessment lessons", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "assessment", id: "l1", title: "Quiz", questions: [
        { id: "q1", text: "Q1", options: ["A","B","C","D"], correctIndex: 0 },
        { id: "q2", text: "Q2", options: ["A","B","C","D"], correctIndex: 1 },
      ], config: { passingScore: 80, examSize: 20 } },
    ]));
    expect(result.assessment_count).toBe(2);
  });

  it("counts inline knowledge checks as assessments", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "quiz", question: "Q?", options: ["A","B"], correctIndex: 0 },
        { id: "b2", type: "truefalse", question: "TF?", correct: true },
      ]},
    ]));
    expect(result.assessment_count).toBe(2);
  });

  it("flags lesson with no assessment when no assessment lesson exists", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Lesson 1", blocks: [
        { id: "b1", type: "text", text: "No quiz here" },
      ]},
    ]));
    expect(result.gaps.some(g => g.type === "no_assessment")).toBe(true);
  });

  it("does not flag no_assessment when a standalone assessment lesson exists", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Content", blocks: [
        { id: "b1", type: "text", text: "Content" },
      ]},
      { kind: "assessment", id: "l2", title: "Assessment", questions: [
        { id: "q1", text: "Q?", options: ["A","B","C","D"], correctIndex: 0 },
      ], config: {} },
    ]));
    expect(result.gaps.some(g => g.type === "no_assessment")).toBe(false);
  });

  it("flags lesson with no media", () => {
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: "Just text" },
      ]},
    ]));
    expect(result.gaps.some(g => g.type === "no_media")).toBe(true);
  });

  it("flags lesson with more than 10 blocks", () => {
    const blocks = Array.from({ length: 12 }, (_, i) => ({
      id: `b${i}`, type: "text", text: `Block ${i}`,
    }));
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "Long Lesson", blocks },
    ]));
    expect(result.gaps.some(g => g.type === "too_long")).toBe(true);
  });

  it("estimates read time from word count", () => {
    // ~200 words = 1 minute
    const words = Array(200).fill("word").join(" ");
    const result = analyzeCourse(makeCourse([
      { kind: "content", id: "l1", title: "L1", blocks: [
        { id: "b1", type: "text", text: words },
      ]},
    ]));
    expect(result.estimated_read_minutes).toBe(1);
  });

  it("handles empty course", () => {
    const result = analyzeCourse(makeCourse([]));
    expect(result.lesson_count).toBe(0);
    expect(result.block_count).toBe(0);
    expect(result.gaps).toEqual([]);
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `cd /Users/theonavarro/TideLearn/mcp && npx vitest run src/tools/__tests__/analyze-course.test.ts`
Expected: All PASS

- [ ] **Step 7: Run the full MCP test suite to confirm everything passes together**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`
Expected: All tests pass. The test count should now be significantly higher than the original ~20.

- [ ] **Step 8: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add mcp/src/tools/__tests__/inject-ids.test.ts mcp/src/tools/__tests__/check-restructure-order.test.ts mcp/src/tools/__tests__/analyze-course.test.ts
git commit -m "test: add coverage for injectIds, checkRestructureOrder, analyzeCourse

Pure function tests for the core MCP helpers. Creates a safety net for
Phase 2B changes to the question type system and course analysis."
```

---

## Post-Implementation Checklist

After all 7 tasks are complete:

- [ ] Run `cd /Users/theonavarro/TideLearn/mcp && npm test` — all tests pass
- [ ] Run `cd /Users/theonavarro/TideLearn && npm run build` — frontend builds cleanly
- [ ] Run `cd /Users/theonavarro/TideLearn/mcp && npm run build` — MCP builds cleanly
- [ ] In `CLAUDE.md`, update the MCP test count. Find `173+ Vitest tests` in the Quick Reference section and replace with the actual test count from the `npm test` output above.
- [ ] In `CLAUDE.md`, update the block type count. Find `28 block types` and replace with `26 block types` to match the actual registry count in `src/components/blocks/registry.ts`.

**Task dependency note:** Task 7 (tests for `injectIds` with timeline/process blocks) depends on Task 2 (`injectSubItemIds` extension) being completed first. Execute tasks sequentially as numbered.
