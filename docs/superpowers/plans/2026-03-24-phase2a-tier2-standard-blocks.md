# Phase 2A Tier 2: Standard Blocks (Timeline, Process, Chart)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 standard content blocks — Timeline, Process Steps, Chart (bar/line/pie via Recharts) — fully wired from type through MCP.

**Architecture:** Same vertical-slice pattern as Tier 1. Recharts is already installed — no new dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Zod, Vitest.

**Prerequisite:** Tier 1 plan must be complete (Button, Embed, Flashcard merged).

---

## File Structure

**Modify:**
- `src/types/course.ts` — TS types, Zod schemas (strict + permissive), factories, Block union, blockSchema, blockSchemaPermissive
- `src/components/blocks/registry.ts` — 3 registry entries
- `mcp/src/lib/types.ts` — mirrored TS types + Zod schemas, Block union, blockSchema
- `mcp/src/resources/instructions.ts` — document new blocks
- `mcp/src/lib/__tests__/validate.test.ts` — schema validation tests

**Create:**
- `src/components/blocks/editor/TimelineForm.tsx`
- `src/components/blocks/editor/ProcessForm.tsx`
- `src/components/blocks/editor/ChartForm.tsx`
- `src/components/blocks/view/Timeline.tsx`
- `src/components/blocks/view/Process.tsx`
- `src/components/blocks/view/Chart.tsx`

---

## Key Patterns

Same as Tier 1 plan — see Key Patterns section there. In particular:
- `BlockType` auto-derives from `factories` keys
- MCP imports `uid` from `"./uid.js"` (not `@/types/course`)
- Use `RichTextRenderer` for HTML content — never inject raw HTML
- Permissive schemas drop `.min()` constraints

---

### Task 1: Type definitions, schemas, factories (frontend + MCP)

**Files:**
- Modify: `src/types/course.ts`
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Add TS types to `src/types/course.ts`**

```typescript
export type TimelineBlock = {
  id: string;
  type: "timeline";
  items: { id: string; date: string; title: string; description?: string }[];
};

export type ProcessBlock = {
  id: string;
  type: "process";
  steps: { id: string; title: string; description?: string }[];
};

export type ChartBlock = {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie";
  title?: string;
  labels: string[];
  datasets: { label: string; values: number[] }[];
};
```

- [ ] **Step 2: Add strict Zod schemas**

```typescript
export const timelineBlockSchema = z.object({
  id: z.string(),
  type: z.literal("timeline"),
  items: z.array(z.object({
    id: z.string(), date: z.string().min(1), title: z.string().min(1), description: z.string().optional(),
  })).min(1),
});

export const processBlockSchema = z.object({
  id: z.string(),
  type: z.literal("process"),
  steps: z.array(z.object({
    id: z.string(), title: z.string().min(1), description: z.string().optional(),
  })).min(1),
});

export const chartBlockSchema = z.object({
  id: z.string(),
  type: z.literal("chart"),
  chartType: z.union([z.literal("bar"), z.literal("line"), z.literal("pie")]),
  title: z.string().optional(),
  labels: z.array(z.string().min(1)).min(1),
  datasets: z.array(z.object({
    label: z.string().min(1), values: z.array(z.number()).min(1),
  })).min(1),
});
```

- [ ] **Step 3: Add permissive schemas, extend unions, add factories**

Permissive: drop `.min()` on strings/arrays.

Extend `Block` union: `| TimelineBlock | ProcessBlock | ChartBlock`

Factories:
```typescript
timeline: (): TimelineBlock => ({
  id: uid(), type: "timeline",
  items: [
    { id: uid(), date: "2024", title: "First milestone", description: "Something important happened." },
    { id: uid(), date: "2025", title: "Second milestone", description: "Then this happened." },
  ],
}),
process: (): ProcessBlock => ({
  id: uid(), type: "process",
  steps: [
    { id: uid(), title: "Step 1", description: "Describe the first step." },
    { id: uid(), title: "Step 2", description: "Describe the second step." },
    { id: uid(), title: "Step 3", description: "Describe the final step." },
  ],
}),
chart: (): ChartBlock => ({
  id: uid(), type: "chart", chartType: "bar", title: "Chart title",
  labels: ["Category A", "Category B", "Category C"],
  datasets: [{ label: "Series 1", values: [40, 65, 30] }],
}),
```

- [ ] **Step 4: Mirror to `mcp/src/lib/types.ts`** — TS types, strict schemas, Block union, blockSchema.

- [ ] **Step 5: Verify and commit**

```bash
npm run dev && cd mcp && npm test
git add src/types/course.ts mcp/src/lib/types.ts
git commit -m "feat(types): add Timeline, Process, Chart block types and schemas"
```

---

### Task 2: TimelineForm editor + TimelineView renderer

**Files:**
- Create: `src/components/blocks/editor/TimelineForm.tsx`
- Create: `src/components/blocks/view/Timeline.tsx`

- [ ] **Step 1: Create `TimelineForm.tsx`**

```typescript
import { TimelineBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: TimelineBlock; onChange: (b: TimelineBlock) => void };

export function TimelineForm({ block, onChange }: Props) {
  const updateItem = (index: number, field: string, value: string) => {
    const items = block.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    onChange({ ...block, items });
  };
  const addItem = () =>
    onChange({ ...block, items: [...block.items, { id: uid(), date: "", title: "", description: "" }] });
  const removeItem = (index: number) =>
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      {block.items.map((item, i) => (
        <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={item.date} onChange={(e) => updateItem(i, "date", e.target.value)}
              placeholder="Date or period" className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <input type="text" value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Event title" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            {block.items.length > 1 && (
              <button onClick={() => removeItem(i)} aria-label="Remove item" className="text-destructive text-sm px-2">✕</button>
            )}
          </div>
          <textarea value={item.description ?? ""} onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Description (optional)" rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
        </div>
      ))}
      <button onClick={addItem} className="text-sm text-[--color-teal-500] hover:text-[--color-teal-600]">+ Add event</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `Timeline.tsx` (view)**

```typescript
import { TimelineBlock } from "@/types/course";

export function TimelineView({ block }: { block: TimelineBlock }) {
  return (
    <div className="py-2">
      <div className="relative border-l-2 border-border ml-4 space-y-6 pl-6">
        {block.items.map((item) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-[--color-teal-500] border-2 border-background" />
            <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
            <h4 className="font-semibold text-sm mt-0.5">{item.title}</h4>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/TimelineForm.tsx src/components/blocks/view/Timeline.tsx
git commit -m "feat(blocks): add Timeline editor and view"
```

---

### Task 3: ProcessForm editor + ProcessView renderer

**Files:**
- Create: `src/components/blocks/editor/ProcessForm.tsx`
- Create: `src/components/blocks/view/Process.tsx`

- [ ] **Step 1: Create `ProcessForm.tsx`**

```typescript
import { ProcessBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: ProcessBlock; onChange: (b: ProcessBlock) => void };

export function ProcessForm({ block, onChange }: Props) {
  const updateStep = (index: number, field: string, value: string) => {
    const steps = block.steps.map((step, i) => i === index ? { ...step, [field]: value } : step);
    onChange({ ...block, steps });
  };
  const addStep = () =>
    onChange({ ...block, steps: [...block.steps, { id: uid(), title: "", description: "" }] });
  const removeStep = (index: number) =>
    onChange({ ...block, steps: block.steps.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-2 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[--color-teal-500] text-white text-xs flex items-center justify-center font-bold mt-1">{i + 1}</span>
          <div className="flex-1 space-y-1.5">
            <input type="text" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)}
              placeholder="Step title" className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <textarea value={step.description ?? ""} onChange={(e) => updateStep(i, "description", e.target.value)}
              placeholder="Description (optional)" rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
          </div>
          {block.steps.length > 1 && (
            <button onClick={() => removeStep(i)} aria-label="Remove step" className="text-destructive text-sm mt-1">✕</button>
          )}
        </div>
      ))}
      <button onClick={addStep} className="text-sm text-[--color-teal-500] hover:text-[--color-teal-600]">+ Add step</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `Process.tsx` (view)**

```typescript
import { ProcessBlock } from "@/types/course";

export function ProcessView({ block }: { block: ProcessBlock }) {
  return (
    <div className="py-2">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-4 items-start">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[--color-teal-500] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
            {i < block.steps.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[24px]" />}
          </div>
          <div className="pb-6">
            <h4 className="font-semibold text-sm">{step.title}</h4>
            {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/ProcessForm.tsx src/components/blocks/view/Process.tsx
git commit -m "feat(blocks): add Process Steps editor and view"
```

---

### Task 4: ChartForm editor + ChartView renderer

**Files:**
- Create: `src/components/blocks/editor/ChartForm.tsx`
- Create: `src/components/blocks/view/Chart.tsx`

- [ ] **Step 1: Create `ChartForm.tsx`**

Tabular data editor: rows = labels, columns = datasets. Chart type selector + optional title.

```typescript
import { ChartBlock } from "@/types/course";

type Props = { block: ChartBlock; onChange: (b: ChartBlock) => void };

export function ChartForm({ block, onChange }: Props) {
  const set = <K extends keyof ChartBlock>(k: K, v: ChartBlock[K]) => onChange({ ...block, [k]: v });
  const updateLabel = (i: number, value: string) => {
    const labels = [...block.labels]; labels[i] = value; onChange({ ...block, labels });
  };
  const updateDatasetValue = (di: number, vi: number, value: string) => {
    const datasets = block.datasets.map((ds, i) => {
      if (i !== di) return ds;
      const values = [...ds.values]; values[vi] = parseFloat(value) || 0;
      return { ...ds, values };
    });
    onChange({ ...block, datasets });
  };
  const updateDatasetLabel = (di: number, value: string) => {
    const datasets = block.datasets.map((ds, i) => i === di ? { ...ds, label: value } : ds);
    onChange({ ...block, datasets });
  };
  const addLabel = () => onChange({
    ...block, labels: [...block.labels, `Category ${block.labels.length + 1}`],
    datasets: block.datasets.map((ds) => ({ ...ds, values: [...ds.values, 0] })),
  });
  const removeLabel = (i: number) => onChange({
    ...block, labels: block.labels.filter((_, idx) => idx !== i),
    datasets: block.datasets.map((ds) => ({ ...ds, values: ds.values.filter((_, idx) => idx !== i) })),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Chart type</label>
          <select value={block.chartType} onChange={(e) => set("chartType", e.target.value as ChartBlock["chartType"])}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
            <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input type="text" value={block.title ?? ""} onChange={(e) => set("title", e.target.value || undefined)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Data</label>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                {block.datasets.map((ds, di) => (
                  <th key={di} className="text-left px-3 py-2 font-medium">
                    <input type="text" value={ds.label} onChange={(e) => updateDatasetLabel(di, e.target.value)}
                      className="w-full bg-transparent border-b border-input focus:outline-none text-sm" />
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {block.labels.map((label, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <input type="text" value={label} onChange={(e) => updateLabel(i, e.target.value)} className="w-full bg-transparent focus:outline-none text-sm" />
                  </td>
                  {block.datasets.map((ds, di) => (
                    <td key={di} className="px-3 py-1.5">
                      <input type="number" value={ds.values[i] ?? 0} onChange={(e) => updateDatasetValue(di, i, e.target.value)} className="w-full bg-transparent focus:outline-none text-sm" />
                    </td>
                  ))}
                  <td className="px-1">
                    {block.labels.length > 1 && <button onClick={() => removeLabel(i)} className="text-destructive text-xs" aria-label="Remove row">✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addLabel} className="text-sm text-[--color-teal-500] mt-2">+ Add row</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Chart.tsx` (view)**

Uses Recharts (already installed). Pie charts use first dataset only.

```typescript
import { ChartBlock } from "@/types/course";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#059669"];

export function ChartView({ block }: { block: ChartBlock }) {
  const data = block.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    block.datasets.forEach((ds) => { row[ds.label] = ds.values[i] ?? 0; });
    return row;
  });
  const pieData = block.labels.map((label, i) => ({
    name: label, value: block.datasets[0]?.values[i] ?? 0,
  }));

  return (
    <div className="py-4">
      {block.title && <p className="text-sm font-semibold text-center mb-3">{block.title}</p>}
      <ResponsiveContainer width="100%" height={300}>
        {block.chartType === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        ) : block.chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/editor/ChartForm.tsx src/components/blocks/view/Chart.tsx
git commit -m "feat(blocks): add Chart editor and view with Recharts bar/line/pie"
```

---

### Task 5: Registry entries + MCP tests + instructions

**Files:**
- Modify: `src/components/blocks/registry.ts`
- Modify: `mcp/src/lib/__tests__/validate.test.ts`
- Modify: `mcp/src/resources/instructions.ts`

- [ ] **Step 1: Add imports and registry entries**

Icons: `ListOrdered`, `Workflow`, `BarChart2`

```typescript
{ type: "timeline", label: "Timeline", icon: ListOrdered, create: factories.timeline,
  Editor: TimelineForm as EditorRenderer<TimelineBlock>, View: TimelineView as ViewRenderer<TimelineBlock>, category: "Interactive" },
{ type: "process", label: "Process Steps", icon: Workflow, create: factories.process,
  Editor: ProcessForm as EditorRenderer<ProcessBlock>, View: ProcessView as ViewRenderer<ProcessBlock>, category: "Interactive" },
{ type: "chart", label: "Chart", icon: BarChart2, create: factories.chart,
  Editor: ChartForm as EditorRenderer<ChartBlock>, View: ChartView as ViewRenderer<ChartBlock>, category: "Media" },
```

- [ ] **Step 2: Add MCP tests**

```typescript
describe("Tier 2 block schemas", () => {
  it("accepts a valid timeline", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "timeline", items: [
        { id: "i1", date: "2024", title: "Launch" }, { id: "i2", date: "2025", title: "Growth" }] }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects timeline with no items", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "timeline", items: [] }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
  it("accepts a valid process", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "process", steps: [{ id: "s1", title: "Plan" }, { id: "s2", title: "Execute" }] }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects process with no steps", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "process", steps: [] }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
  it("accepts a valid bar chart", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "chart", chartType: "bar", labels: ["A", "B"],
        datasets: [{ label: "S1", values: [10, 20] }] }] }] };
    expect(validateCourseJson(course).ok).toBe(true);
  });
  it("rejects chart with empty labels", () => {
    const course = { schemaVersion: 1, title: "T", lessons: [{ kind: "content", id: "l1", title: "L1",
      blocks: [{ id: "b1", type: "chart", chartType: "bar", labels: [],
        datasets: [{ label: "S1", values: [] }] }] }] };
    expect(validateCourseJson(course).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Update instructions** — timeline (items with date/title/description), process (steps with title/description), chart (chartType, labels, datasets; pie uses first dataset only, values must align with labels in length).

- [ ] **Step 4: Verify and commit**

```bash
npm run dev && npm run build && cd mcp && npm test
git add src/components/blocks/registry.ts mcp/src/lib/__tests__/validate.test.ts mcp/src/resources/instructions.ts
git commit -m "feat(tier2): wire Timeline, Process, Chart into registry + MCP tests/docs"
```

---

## What's Next

Continue to **Phase 2A Tier 3** plan: Sorting, Hotspot, Branching blocks (requires @dnd-kit install).
