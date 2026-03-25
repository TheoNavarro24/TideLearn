# Phase 2B Tier 2 — Multiple Response Block + Question

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Tier 1 (union migration) must be merged before starting this plan.

**Goal:** Add `multipleresponse` as a content block and assessment question type, with validation, Leitner grading, and full MCP support.

**Architecture:** Follow the exact same pattern as existing Phase 1 blocks (quiz, truefalse): TypeScript type + Zod schema + factory in `src/types/course.ts`, editor form + viewer in `src/components/blocks/editor/` and `view/`, registry entry, grading function in `src/lib/assessment.ts`, renderer in `AssessmentView.tsx`, MCP block + question + preview support. Validation baked in from day one.

**Tech Stack:** TypeScript, React, Zod, Tailwind, Vitest (MCP tests)

---

## File Map

| File | Change |
|------|--------|
| `src/types/course.ts` | Add `MultipleResponseBlock` type, schema, factory |
| `mcp/src/lib/types.ts` | Add `MultipleResponseBlock` schema |
| `src/components/blocks/editor/MultipleResponseForm.tsx` | New — editor form |
| `src/components/blocks/view/MultipleResponseView.tsx` | New — learner-facing view |
| `src/components/blocks/registry.ts` | Add registry entry |
| `src/lib/assessment.ts` | Add `gradeMultipleResponse` |
| `src/pages/AssessmentView.tsx` | Add `multipleresponse` renderer in question screen |
| `mcp/src/tools/blocks.ts` | Add `multipleresponse` to `add_block` description + schema |
| `mcp/src/tools/assessment.ts` | `multipleresponse` already in union (Tier 1) — verify only |
| `mcp/src/tools/preview.ts` | Add `renderBlock` case + create `renderQuestion` function |
| `mcp/src/tools/__tests__/render-block.test.ts` | Add multipleresponse test case |
| `mcp/src/tools/__tests__/question-schema.test.ts` | Add grading test |

---

### Task 1: Add `MultipleResponseBlock` type + schema + factory

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add `MultipleResponseBlock` type to the Block union**

After the `BranchingBlock` type definition and before `export type Block = ...`, add:

```typescript
export type MultipleResponseBlock = {
  type: "multipleresponse";
  id: string;
  question: string;
  options: string[];
  correctIndices: number[];
  showFeedback?: boolean;
  feedbackMessage?: string;
};
```

Add `MultipleResponseBlock` to the `Block` union:
```typescript
// Add | MultipleResponseBlock before the semicolon on the BranchingBlock line
| MultipleResponseBlock;
```

- [ ] **Step 2: Add `multipleResponseBlockSchema` Zod schema**

After `branchingBlockSchema` in the strict schemas section, add:

```typescript
export const multipleResponseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("multipleresponse"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndices: z.array(z.number().int().min(0)).min(2),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

Add to `blockSchema` discriminated union (after `branchingBlockSchema`):
```typescript
multipleResponseBlockSchema,
```

- [ ] **Step 3: Add permissive variant**

After `branchingBlockSchemaPermissive`, add:
```typescript
const multipleResponseBlockSchemaPermissive = z.object({
  id: z.string(), type: z.literal("multipleresponse"),
  question: z.string(),
  options: z.array(z.string()),
  correctIndices: z.array(z.number()),
  showFeedback: z.boolean().optional(),
  feedbackMessage: z.string().optional(),
});
```

Add to `blockSchemaPermissive` discriminated union.

- [ ] **Step 4: Add factory**

In the `factories` object, add:
```typescript
multipleresponse: (): MultipleResponseBlock => ({
  id: uid(),
  type: "multipleresponse",
  question: "Select all that apply.",
  options: ["Option A", "Option B", "Option C"],
  correctIndices: [-1, -1], // must be set before publish
  showFeedback: true,
}),
```

- [ ] **Step 5: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Type errors on registry (missing `MultipleResponseBlock` import) — that's expected; fix next.

---

### Task 2: Mirror schema in `mcp/src/lib/types.ts`

**Files:**
- Modify: `mcp/src/lib/types.ts`

- [ ] **Step 1: Add `MultipleResponseBlock` type + schema**

Mirror exactly what was done in Task 1: add the TypeScript type, the Zod schema, add to `Block` union and `blockSchema` discriminated union.

---

### Task 3: Create `MultipleResponseForm.tsx` editor

**Files:**
- Create: `src/components/blocks/editor/MultipleResponseForm.tsx`

- [ ] **Step 1: Write the editor form**

```tsx
import { MultipleResponseBlock } from "@/types/course";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";

type Props = { block: MultipleResponseBlock; onChange: (b: MultipleResponseBlock) => void };

export function MultipleResponseForm({ block, onChange }: Props) {
  function setOption(i: number, value: string) {
    const options = [...block.options];
    options[i] = value;
    onChange({ ...block, options });
  }

  function addOption() {
    if (block.options.length >= 6) return;
    onChange({ ...block, options: [...block.options, ""] });
  }

  function removeOption(i: number) {
    if (block.options.length <= 2) return;
    const options = block.options.filter((_, idx) => idx !== i);
    const correctIndices = block.correctIndices
      .filter((ci) => ci !== i)
      .map((ci) => (ci > i ? ci - 1 : ci));
    onChange({ ...block, options, correctIndices });
  }

  function toggleCorrect(i: number) {
    const has = block.correctIndices.includes(i);
    const correctIndices = has
      ? block.correctIndices.filter((ci) => ci !== i)
      : [...block.correctIndices, i];
    onChange({ ...block, correctIndices });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Question</FieldLabel>
        <Input
          value={block.question}
          onChange={(e) => onChange({ ...block, question: e.target.value })}
          placeholder="Select all that apply..."
        />
      </div>

      <div>
        <FieldLabel required>Options (mark all correct answers)</FieldLabel>
        <div className="space-y-2">
          {block.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                checked={block.correctIndices.includes(i)}
                onCheckedChange={() => toggleCorrect(i)}
                aria-label={`Mark option ${i + 1} as correct`}
              />
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(i)}
                disabled={block.options.length <= 2}
                aria-label="Remove option"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {block.options.length < 6 && (
          <Button variant="outline" size="sm" className="mt-2" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" /> Add option
          </Button>
        )}
        {block.correctIndices.length < 2 && (
          <p className="text-xs text-destructive mt-1">Mark at least 2 correct answers</p>
        )}
      </div>
    </div>
  );
}
```

Note: `FieldLabel` is the existing component at `src/components/ui/FieldLabel.tsx` — check the exact import path from an existing form like `QuizForm.tsx`.

---

### Task 4: Create `MultipleResponseView.tsx` learner view

**Files:**
- Create: `src/components/blocks/view/MultipleResponseView.tsx`

- [ ] **Step 1: Write the interactive viewer**

```tsx
import { useState } from "react";
import { MultipleResponseBlock } from "@/types/course";

type Props = { block: MultipleResponseBlock };

export function MultipleResponseView({ block }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(i: number) {
    if (submitted) return;
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i]
    );
  }

  function submit() {
    if (selected.length === 0) return;
    setSubmitted(true);
  }

  const isCorrect =
    submitted &&
    block.correctIndices.every((ci) => selected.includes(ci)) &&
    selected.every((s) => block.correctIndices.includes(s));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">{block.question}</p>
      <p className="text-xs text-muted-foreground">Select all that apply</p>
      <div className="space-y-2">
        {block.options.map((opt, i) => {
          const isSelected = selected.includes(i);
          const isCorrectOption = block.correctIndices.includes(i);
          let className = "flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-colors ";
          if (submitted) {
            if (isCorrectOption) className += "border-[var(--accent-hex)] bg-[var(--accent-bg)] text-[var(--accent-hex)] font-medium";
            else if (isSelected) className += "border-destructive bg-destructive/10 text-destructive";
            else className += "border-border text-muted-foreground";
          } else {
            className += isSelected ? "border-[var(--accent-hex)] bg-[var(--accent-bg)]" : "border-border hover:border-[var(--accent-hex)]";
          }
          return (
            <button key={i} className={className} onClick={() => toggle(i)}>
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-[var(--accent-hex)] border-[var(--accent-hex)]" : "border-current"}`}>
                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              {opt}
            </button>
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={submit}
          disabled={selected.length === 0}
          className="px-4 py-2 rounded bg-[var(--accent-hex)] text-white text-sm font-semibold disabled:opacity-40"
        >
          Check answers
        </button>
      )}
      {submitted && (
        <p className={`text-sm font-semibold ${isCorrect ? "text-[var(--accent-hex)]" : "text-destructive"}`}>
          {isCorrect ? "Correct!" : "Not quite — correct answers highlighted"}
        </p>
      )}
      {submitted && block.showFeedback && block.feedbackMessage && (
        <p className="text-sm text-muted-foreground">{block.feedbackMessage}</p>
      )}
    </div>
  );
}
```

---

### Task 5: Add registry entry

**Files:**
- Modify: `src/components/blocks/registry.ts`

- [ ] **Step 1: Add imports at the top of registry.ts**

```typescript
import { MultipleResponseBlock } from "@/types/course";
import { MultipleResponseForm } from "./editor/MultipleResponseForm";
import { MultipleResponseView } from "./view/MultipleResponseView";
import { CheckSquare2 } from "lucide-react"; // or ListChecks — use whichever is available
```

- [ ] **Step 2: Add registry entry**

In the `registry` array, after the `branching` entry, add:
```typescript
{
  type: "multipleresponse",
  label: "Multiple Response",
  icon: CheckSquare2,
  create: factories.multipleresponse,
  Editor: MultipleResponseForm as EditorRenderer<MultipleResponseBlock>,
  View: MultipleResponseView as ViewRenderer<MultipleResponseBlock>,
  category: "Knowledge",
},
```

- [ ] **Step 3: Add `MultipleResponseBlock` to the `BlockType` import at the top of registry.ts**

The first import line already lists all block types — add `MultipleResponseBlock` to it.

- [ ] **Step 4: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 6: Add grading function to `src/lib/assessment.ts`

**Files:**
- Modify: `src/lib/assessment.ts`

- [ ] **Step 1: Add `gradeMultipleResponse` to `src/lib/assessment.ts`**

Add after the `defaultQuestionProgress` function:

```typescript
/** Grade a multiple-response answer. Correct only if all correct indices selected and no incorrect ones. */
export function gradeMultipleResponse(
  correctIndices: number[],
  selected: number[]
): boolean {
  const correctSet = new Set(correctIndices);
  const selectedSet = new Set(selected);
  return (
    correctIndices.every((ci) => selectedSet.has(ci)) &&
    selected.every((s) => correctSet.has(s))
  );
}
```

---

### Task 7: Add `multipleresponse` renderer in `AssessmentView.tsx`

**Files:**
- Modify: `src/pages/AssessmentView.tsx`

The current question screen (lines 230–318) renders MCQ directly. We need to:
1. Add state for multiple-response selection (checkboxes)
2. Switch on `currentQ.kind` to render the right UI
3. Wire grading to `gradeMultipleResponse`

- [ ] **Step 1: Add selectedMultiple state**

After the `const [selected, setSelected] = useState<number | null>(null);` line, add:
```typescript
const [selectedMultiple, setSelectedMultiple] = useState<number[]>([]);
```

Reset it in `startStudy`, `startExam`, `startDrill`, **and `handleNext`**:
```typescript
setSelectedMultiple([]);
```

`handleNext` advances between questions in a session — without this reset, `selectedMultiple` carries over from the previous question and the learner sees their prior selections.

**Note:** `bloomBreakdown` (accesses `q.bloomLevel`) and `generateExamSession`/`generateSourceBalanced` (access `q.source`) both access MCQ-only fields. Tier 1 narrowed these to `kind === "mcq"` — confirm Tier 1 is merged and the build is clean before adding this renderer.

- [ ] **Step 2: Update `handleReveal` to support multiple response**

```typescript
function handleReveal() {
  if (currentQ.kind === "multipleresponse") {
    if (selectedMultiple.length === 0) return;
  } else {
    if (selected === null) return;
  }
  if (mode === "study" && confidence === null) return;
  setRevealed(true);

  let correct: boolean;
  if (currentQ.kind === "multipleresponse") {
    correct = gradeMultipleResponse(currentQ.correctIndices, selectedMultiple);
  } else if (currentQ.kind === "mcq") {
    correct = selected === currentQ.correctIndex;
  } else {
    correct = false; // placeholder until Tier 3/4 add full renderers
  }

  if (correct) {
    setSessionCorrect((n) => n + 1);
    setSessionCorrectIds((prev) => new Set([...prev, currentQ.id]));
  }
  updateQuestion(currentQ.id, (p) => advanceBox(p, correct, confidence ?? undefined));
}
```

Import `gradeMultipleResponse` at the top of the file.

- [ ] **Step 3: Update the question screen render to switch on `kind`**

Replace the question body (the `<ul>` of options at ~line 250) with a kind switch:

```tsx
{currentQ.kind === "mcq" && (
  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
    {currentQ.options.map((opt, i) => {
      const isSelected = selected === i;
      const isCorrect = i === currentQ.correctIndex;
      let bg = "#fff", border = "1.5px solid hsl(var(--border))", color = "#334155";
      if (revealed && isCorrect) { bg = "var(--accent-bg)"; border = "1.5px solid var(--accent-hex)"; color = "var(--accent-hex)"; }
      else if (isSelected) { bg = "var(--canvas-white)"; border = "1.5px solid var(--accent-hex)"; color = "var(--accent-hex)"; }
      return (
        <li key={i} style={{ marginBottom: 8 }}>
          <button
            onClick={() => { if (!revealed) setSelected(i); }}
            style={{ width: "100%", textAlign: "left", padding: "11px 14px", border, borderRadius: 8, background: bg, color, fontSize: 14, fontWeight: isSelected || (revealed && isCorrect) ? 600 : 400, cursor: revealed ? "default" : "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${color}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        </li>
      );
    })}
  </ul>
)}

{currentQ.kind === "multipleresponse" && (
  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px" }}>
    <li style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Select all that apply</li>
    {currentQ.options.map((opt, i) => {
      const isSelected = selectedMultiple.includes(i);
      const isCorrect = currentQ.correctIndices.includes(i);
      let border = "1.5px solid hsl(var(--border))";
      let bg = "#fff";
      let color = "#334155";
      if (revealed && isCorrect) { bg = "var(--accent-bg)"; border = "1.5px solid var(--accent-hex)"; color = "var(--accent-hex)"; }
      else if (revealed && isSelected && !isCorrect) { bg = "#fef2f2"; border = "1.5px solid #ef4444"; color = "#ef4444"; }
      else if (isSelected) { bg = "var(--canvas-white)"; border = "1.5px solid var(--accent-hex)"; color = "var(--accent-hex)"; }
      return (
        <li key={i} style={{ marginBottom: 8 }}>
          <button
            onClick={() => {
              if (revealed) return;
              setSelectedMultiple((prev) =>
                prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i]
              );
            }}
            style={{ width: "100%", textAlign: "left", padding: "11px 14px", border, borderRadius: 8, background: bg, color, fontSize: 14, cursor: revealed ? "default" : "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${color}`, flexShrink: 0, background: isSelected ? "var(--accent-hex)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </span>
            {opt}
          </button>
        </li>
      );
    })}
  </ul>
)}

{currentQ.kind !== "mcq" && currentQ.kind !== "multipleresponse" && (
  <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
    [This question type will be interactive in a future update]
  </p>
)}
```

- [ ] **Step 4: Update the "Check answer" button disabled condition**

```typescript
// BEFORE:
disabled={selected === null || (isStudy && confidence === null)}

// AFTER:
disabled={
  (currentQ.kind === "mcq" ? selected === null : false) ||
  (currentQ.kind === "multipleresponse" ? selectedMultiple.length === 0 : false) ||
  (isStudy && confidence === null)
}
```

- [ ] **Step 5: Update the revealed correct/incorrect display**

```tsx
{revealed && (
  <span style={{ fontSize: 13, fontWeight: 600, color: (() => {
    if (currentQ.kind === "mcq") return selected === currentQ.correctIndex ? "var(--accent-hex)" : "#ef4444";
    if (currentQ.kind === "multipleresponse") return gradeMultipleResponse(currentQ.correctIndices, selectedMultiple) ? "var(--accent-hex)" : "#ef4444";
    return "#64748b";
  })() }}>
    {(() => {
      if (currentQ.kind === "mcq") return selected === currentQ.correctIndex ? "Correct!" : "Incorrect";
      if (currentQ.kind === "multipleresponse") return gradeMultipleResponse(currentQ.correctIndices, selectedMultiple) ? "Correct!" : "Incorrect";
      return "";
    })()}
  </span>
)}
```

- [ ] **Step 6: Update mistake notebook to handle multipleresponse**

In the notebook screen (around line 366), `q.options[q.correctIndex]` is MCQ-only. Narrow it:

```tsx
// For the correct answer display in the notebook:
{q.kind === "mcq" && (
  <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>✓ {q.options[q.correctIndex]}</p>
)}
{q.kind === "multipleresponse" && (
  <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>
    ✓ {q.correctIndices.map((ci) => q.options[ci]).join(", ")}
  </p>
)}
```

- [ ] **Step 7: Build to verify**

Run: `cd /Users/theonavarro/TideLearn && npm run build`

Expected: Clean build.

---

### Task 8: MCP — add `multipleresponse` to `add_block`

**Files:**
- Modify: `mcp/src/tools/blocks.ts`

- [ ] **Step 1: Update `add_block` tool description and input schema**

In `blocks.ts`, find the `add_block` tool registration. Add `multipleresponse` to the block type description and to the `type` enum in the input schema.

Update the description to include:
```
multipleresponse: { question, options (array, 2-6), correctIndices (array of ≥2 ints), showFeedback?, feedbackMessage? }
```

---

### Task 9: MCP — add `renderBlock` + `renderQuestion` to `preview.ts`

**Files:**
- Modify: `mcp/src/tools/preview.ts`

- [ ] **Step 1: Add `multipleresponse` case to `renderBlock`**

In the `renderBlock` switch (after `branching`), add:
```typescript
case "multipleresponse":
  return `<div style="background:#f8f8f8;padding:1em;margin:1em 0"><strong>Multiple Response:</strong> ${esc(block.question)}<p style="font-size:0.875em;color:#666;margin:0.25em 0">Select all that apply:</p><ul>${block.options.map((o, i) => `<li>${block.correctIndices.includes(i) ? "✓ " : ""}${esc(o)}</li>`).join("")}</ul>${block.correctIndices.length < 2 ? "<p><em style='color:#f59e0b'>(fewer than 2 correct answers set)</em></p>" : ""}</div>`;
```

- [ ] **Step 2: Create `renderQuestion` function**

After the `renderBlock` function definition, add:

```typescript
export function renderQuestion(q: any): string {
  switch (q.kind ?? "mcq") {
    case "mcq":
      return `
    <div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0">
      <p style="font-weight:600;margin:0 0 0.5em">${esc(q.text)}</p>
      <ul style="margin:0 0 0.5em 1.25em;padding:0">
        ${(q.options ?? []).map((opt: string, idx: number) =>
          `<li style="${idx === q.correctIndex ? "color:#0d9488;font-weight:600" : ""}">${idx === q.correctIndex ? "✓ " : ""}${esc(opt)}</li>`
        ).join("")}
      </ul>
      ${q.feedback ? `<p style="font-size:0.875em;color:#64748b;margin:0;font-style:italic">Feedback: ${esc(q.feedback)}</p>` : ""}
      ${q.bloomLevel ? `<span style="font-size:0.75em;background:#e0fdf4;color:#0d9488;padding:2px 6px;border-radius:4px">${esc(q.bloomLevel)}</span>` : ""}
      ${q.source ? `<span style="font-size:0.75em;background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:4px;margin-left:4px">${esc(q.source)}</span>` : ""}
    </div>`;
    case "multipleresponse":
      return `
    <div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0">
      <p style="font-weight:600;margin:0 0 0.25em">${esc(q.text)}</p>
      <p style="font-size:0.8em;color:#64748b;margin:0 0 0.5em">Select all that apply</p>
      <ul style="margin:0 0 0.5em 1.25em;padding:0">
        ${(q.options ?? []).map((opt: string, idx: number) =>
          `<li style="${(q.correctIndices ?? []).includes(idx) ? "color:#0d9488;font-weight:600" : ""}">${(q.correctIndices ?? []).includes(idx) ? "✓ " : ""}${esc(opt)}</li>`
        ).join("")}
      </ul>
      ${q.feedback ? `<p style="font-size:0.875em;color:#64748b;margin:0;font-style:italic">Feedback: ${esc(q.feedback)}</p>` : ""}
    </div>`;
    case "fillinblank":
      return `<div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0"><p style="font-weight:600;margin:0 0 0.5em">${esc(q.text)}</p><p style="font-size:0.875em;color:#64748b">[Fill-in-the-blank — ${(q.blanks ?? []).length} gap(s)]</p></div>`;
    case "matching":
      return `<div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0"><p style="font-weight:600;margin:0 0 0.5em">${esc(q.text)}</p><p style="font-size:0.875em;color:#64748b">[Matching — ${(q.left ?? []).length} pair(s)]</p></div>`;
    case "sorting":
      return `<div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0"><p style="font-weight:600;margin:0 0 0.5em">${esc(q.text)}</p><p style="font-size:0.875em;color:#64748b">[Sorting — ${(q.buckets ?? []).length} bucket(s), ${(q.items ?? []).length} item(s)]</p></div>`;
    default:
      return `<div style="background:#f8fffe;border:1px solid #e0fdf4;border-radius:8px;padding:1em;margin:0.75em 0"><p style="font-style:italic;color:#94a3b8">[Unknown question kind: ${esc(q.kind ?? "unknown")}]</p></div>`;
  }
}
```

- [ ] **Step 3: Update `renderAssessmentLesson` to use `renderQuestion`**

Find the `questions.map(...)` call inside `renderAssessmentLesson` (search for `questions.map` in `preview.ts`). Replace the existing inline question render with:

```typescript
return questions.map((q: any, i: number) =>
  `<div style="margin-bottom:0.5em"><span style="font-size:0.8em;color:#64748b;font-weight:600">${i + 1}.</span>${renderQuestion(q)}</div>`
).join("\n");
```

---

### Task 10: MCP tests

**Files:**
- Modify: `mcp/src/tools/__tests__/render-block.test.ts`

- [ ] **Step 1: Add test for multipleresponse renderBlock**

```typescript
it("multipleresponse: renders question with correct answers marked", () => {
  const block = {
    id: "1", type: "multipleresponse",
    question: "Pick two", options: ["A", "B", "C"], correctIndices: [0, 2],
  };
  const result = renderBlock(block as any);
  expect(result).toContain("Multiple Response");
  expect(result).toContain("Pick two");
  expect(result).toContain("✓ A");
  expect(result).toContain("✓ C");
  expect(result).not.toContain("✓ B");
});
```

- [ ] **Step 2: Run MCP tests**

Run: `cd /Users/theonavarro/TideLearn/mcp && npm test`

Expected: All pass.

---

### Task 11: Final build + commit

- [ ] **Step 1: Final build**

Run: `cd /Users/theonavarro/TideLearn && npm run build && cd mcp && npm run build`

Expected: Both clean.

- [ ] **Step 2: Commit**

```bash
cd /Users/theonavarro/TideLearn
git add src/types/course.ts mcp/src/lib/types.ts \
  src/components/blocks/editor/MultipleResponseForm.tsx \
  src/components/blocks/view/MultipleResponseView.tsx \
  src/components/blocks/registry.ts \
  src/lib/assessment.ts \
  src/pages/AssessmentView.tsx \
  mcp/src/tools/blocks.ts \
  mcp/src/tools/preview.ts \
  mcp/src/tools/__tests__/render-block.test.ts \
  mcp/src/tools/__tests__/question-schema.test.ts
git commit -m "feat(2b-tier2): add multiple response block + question type

MultipleResponseBlock with editor (checkbox options, mark ≥2 correct),
interactive viewer, registry entry, Leitner grading, AssessmentView
renderer. MCP: add_block support, renderBlock + renderQuestion cases."
```
