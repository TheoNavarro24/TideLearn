# Assessment Editor WYSIWYG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prereq:** Consistency Foundation plan (`docs/superpowers/plans/2026-04-18-1-consistency-foundation.md`) should be merged first — this plan consumes the `--tl-*` tokens and the paper-default palette.

**File overlap with sibling plans (merge-conflict risk):**
- `src/pages/Editor.tsx` — Consistency Foundation edits the canvas container (`:264`), lesson-header bar (`:267-283`), max-width nesting (`:286-294`), and empty state (`:334-338`). This plan doesn't touch `Editor.tsx` directly, so no conflict.
- No shared files with Non-Editor Polish plan.

Can run in parallel with Non-Editor Polish (different files). Rebase on Consistency Foundation when it lands.

**Goal:** Bring assessment lessons in line with the WYSIWYG+Inspector pattern already shipped for content lessons. Question cards live on the canvas (visually match what the learner sees); clicking a card opens a right-side `QuestionInspector` drawer that mirrors `BlockInspector`. Lesson-level config collapses into a compact chip bar. All inline hex / `Inter` styling is tokenised.

**Architecture:**
- **QuestionForm stays the inspector body** (MCQ only today — extending it to the other 4 question kinds is separate scope). Just strip its inline styling.
- **QuestionCard becomes the canvas "block"** — mirrors `BlockItem` (`selected`/`onSelect` props, ring-on-selected, no inline edit/delete buttons).
- **QuestionInspector mirrors BlockInspector exactly** — fixed right-0, 320px, header + form body + footer with move/duplicate/delete.
- **AssessmentConfigBar** replaces the current full-width config form with a compact chip row (pass-score + exam-size + question-count).
- **AssessmentEditor** becomes the orchestrator — `selectedQuestionId` state, add/move/duplicate/remove handlers, `AlertDialog` for delete confirmation.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS custom properties, Vitest, shadcn/ui (`AlertDialog`)

---

## Design Reference

In `docs/Refined v2 _standalone_.html`, assessment lessons use the same visual language as content lessons: each question is a block-card on the canvas; click → inspector slides in from the right. No inline "expand-to-edit" behaviour. No teal-gradient Save buttons. No `Inter` font override.

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/components/assessment/QuestionInspector.tsx` | Right-side drawer — mirrors `BlockInspector` |
| `src/components/assessment/AssessmentConfigBar.tsx` | Compact chip row: pass-score + exam-size + in-bank count |
| `src/__tests__/components/assessment/QuestionCard.test.tsx` | Renders question; fires onSelect; no inline Edit/Delete |
| `src/__tests__/components/assessment/QuestionInspector.test.tsx` | Renders form; close/remove/move wiring |
| `src/__tests__/components/assessment/AssessmentEditor.test.tsx` | Click question → inspector opens; add question → preselected |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/assessment/QuestionForm.tsx` | Strip inline hex + `Inter` fontFamily; use Tailwind + tokens. Form logic unchanged. |
| `src/components/assessment/QuestionCard.tsx` | Full rewrite: add `selected`/`onSelect`, remove inline Edit/Delete buttons, tokenise styling, match BlockItem visual language. |
| `src/components/assessment/AssessmentEditor.tsx` | Significant rewrite: `selectedQuestionId` state, inspector wiring, chip-bar config, AlertDialog delete confirmation. |
| `src/components/assessment/JsonImport.tsx` | Tokenise if it has any inline hex (drive-by polish). |

---

## Task 1 — Tokenise QuestionForm (no behaviour change)

Strip all inline hex / `Inter` styling from `QuestionForm.tsx` so it's ready to live inside the inspector drawer. Behaviour unchanged.

**Files:**
- Modify: `src/components/assessment/QuestionForm.tsx` (whole file — style-only edits)

Token map:
- `#0d2926` → `var(--ink)`
- `#94a3b8` → `var(--text-muted)`
- `#e0fdf4` → `hsl(var(--border))`
- `#f8fffe` → `hsl(var(--muted))` (or transparent if background was purely chrome)
- `#0d9488` / `#0891b2` → `var(--accent-hex)`
- `#fff` → `var(--canvas-white)`
- Any `fontFamily: "Inter, sans-serif"` → delete (DM Sans is already the body font)

- [ ] **Step 1: Replace `inputStyle`/`labelStyle` with Tailwind + tokens**

Delete the `inputStyle` and `labelStyle` CSSProperties objects. Replace every `style={inputStyle}` / `style={labelStyle}` usage with:

```tsx
// Inputs / textareas:
className="w-full px-2.5 py-2 rounded-md text-sm outline-none transition-colors"
style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}

// Labels:
className="text-xs font-semibold mb-1 block"
style={{ color: "var(--accent-hex)" }}
```

- [ ] **Step 2: Replace the teal-gradient Save/Cancel buttons**

Find the action row at the bottom of `QuestionForm`. Replace the gradient `background: "linear-gradient(135deg,#0d9488,#0891b2)"` with tokens:

```tsx
// Primary (Save):
className="text-xs font-bold rounded-md px-4 py-2 border-none cursor-pointer"
style={{ background: "var(--accent-hex)", color: "#0a1c18" }}

// Secondary (Cancel):
className="text-xs font-medium rounded-md px-4 py-2 border cursor-pointer"
style={{ background: "transparent", color: "var(--text-muted)", borderColor: "hsl(var(--border))" }}
```

(`#0a1c18` is an intentional brand constant — the contrast colour for text-on-accent.)

- [ ] **Step 3: Grep for leftover hex literals and migrate via the token map**

```bash
grep -n '#' src/components/assessment/QuestionForm.tsx | grep -vE "(#0a1c18|#\{|href=|placeholder)"
```

Apply the token map; remove any `fontFamily: "Inter, ..."`.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/assessment/QuestionForm.tsx
git commit -m "refactor: tokenise QuestionForm styling"
```

---

## Task 2 — Tokenise QuestionCard + give it BlockItem-style selection

`QuestionCard` becomes the canvas "block" for questions. Removes its inline Edit/Delete buttons (those move to the inspector). Add `selected` / `onSelect` props. Mirror `BlockItem` visual language.

**Files:**
- Modify: `src/components/assessment/QuestionCard.tsx` (full rewrite)
- Create: `src/__tests__/components/assessment/QuestionCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/__tests__/components/assessment/QuestionCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { QuestionCard } from "@/components/assessment/QuestionCard";
import { uid } from "@/types/course";

const q = {
  id: uid(),
  kind: "mcq" as const,
  text: "What is 2+2?",
  options: ["3", "4", "5", "6"] as [string, string, string, string],
  correctIndex: 1,
};

describe("QuestionCard", () => {
  test("renders question text and correct option", () => {
    render(<QuestionCard question={q} index={0} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText(/✓/)).toBeInTheDocument();
  });

  test("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<QuestionCard question={q} index={0} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("shows selected ring when selected=true", () => {
    const { container } = render(<QuestionCard question={q} index={0} selected onSelect={vi.fn()} />);
    expect(container.querySelector(".question-card")?.className).toContain("ring-2");
  });

  test("renders no inline Edit or Delete buttons", () => {
    render(<QuestionCard question={q} index={0} selected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify failure**

```bash
npx vitest run src/__tests__/components/assessment/QuestionCard.test.tsx 2>&1 | tail -20
```

- [ ] **Step 3: Rewrite QuestionCard**

```tsx
import { cn } from "@/lib/utils";
import type { AssessmentQuestion } from "@/types/course";

type Props = {
  question: AssessmentQuestion;
  index: number;
  selected: boolean;
  onSelect: () => void;
};

export function QuestionCard({ question, index, selected, onSelect }: Props) {
  const isMcq = question.kind === "mcq";
  const correctAnswer = isMcq ? question.options[question.correctIndex] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Question ${index + 1} — click to edit`}
      className={cn(
        "question-card w-full text-left flex items-start gap-3 rounded-lg px-4 py-3 mb-2 cursor-pointer transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
        selected ? "ring-2 ring-[var(--accent-hex)]" : "hover:ring-1 hover:ring-[hsl(var(--border))]"
      )}
      style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))" }}
    >
      <span className="text-[11px] font-bold min-w-[22px] pt-0.5" style={{ color: "var(--text-muted)" }}>
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: "var(--ink)" }}>
          {question.text}
        </p>
        {correctAnswer && (
          <p className="text-[11px]" style={{ color: "var(--accent-hex)" }}>
            ✓ {correctAnswer}
          </p>
        )}
        {!isMcq && (
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {question.kind}
          </p>
        )}
        {(question.bloomLevel || question.source) && (
          <div className="flex gap-1.5 mt-1">
            {question.bloomLevel && (
              <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}>
                {question.bloomLevel}
              </span>
            )}
            {question.source && (
              <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "hsl(var(--muted))", color: "var(--text-muted)" }}>
                {question.source}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/__tests__/components/assessment/QuestionCard.test.tsx 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

Note: the full app build is temporarily broken after this commit because `AssessmentEditor.tsx` still passes the old `onEdit`/`onDelete` props. That is resolved in Task 5. Commit here keeps the plan tidy; if you prefer a green tree at every commit, do Task 5 immediately after.

```bash
git add src/components/assessment/QuestionCard.tsx src/__tests__/components/assessment/QuestionCard.test.tsx
git commit -m "refactor: QuestionCard — WYSIWYG select pattern, tokenised styling"
```

---

## Task 3 — Create QuestionInspector

Mirror `BlockInspector.tsx` exactly. Header = question kind + close; body = `QuestionForm` keyed on question id; footer = move/duplicate/delete.

**Files:**
- Create: `src/components/assessment/QuestionInspector.tsx`
- Create: `src/__tests__/components/assessment/QuestionInspector.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/__tests__/components/assessment/QuestionInspector.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { QuestionInspector } from "@/components/assessment/QuestionInspector";
import { uid } from "@/types/course";

const q = {
  id: uid(),
  kind: "mcq" as const,
  text: "What?",
  options: ["a", "b", "c", "d"] as [string, string, string, string],
  correctIndex: 0,
};

function renderInspector(overrides = {}) {
  const props = {
    question: q,
    idx: 1,
    total: 3,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return { ...render(<QuestionInspector {...props} />), props };
}

describe("QuestionInspector", () => {
  test("renders question kind label", () => {
    renderInspector();
    expect(screen.getByText(/mcq/i)).toBeInTheDocument();
  });

  test("close button calls onClose", () => {
    const { props } = renderInspector();
    fireEvent.click(screen.getByLabelText(/close inspector/i));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test("delete button calls onRemove with question id", () => {
    const { props } = renderInspector();
    fireEvent.click(screen.getByLabelText(/delete question/i));
    expect(props.onRemove).toHaveBeenCalledWith(q.id);
  });

  test("move up disabled when idx=0", () => {
    renderInspector({ idx: 0 });
    expect(screen.getByLabelText(/move question up/i)).toBeDisabled();
  });

  test("move down disabled at end", () => {
    renderInspector({ idx: 2, total: 3 });
    expect(screen.getByLabelText(/move question down/i)).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — verify failure**

```bash
npx vitest run src/__tests__/components/assessment/QuestionInspector.test.tsx 2>&1 | tail -15
```

- [ ] **Step 3: Create QuestionInspector**

```tsx
// src/components/assessment/QuestionInspector.tsx
import { useEffect } from "react";
import { X, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentQuestion } from "@/types/course";
import { QuestionForm } from "./QuestionForm";

interface QuestionInspectorProps {
  question: AssessmentQuestion;
  idx: number;
  total: number;
  onClose: () => void;
  onSave: (q: AssessmentQuestion) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function QuestionInspector({
  question, idx, total,
  onClose, onSave, onMove, onDuplicate, onRemove,
}: QuestionInspectorProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const footerBtnBase = "w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none";
  const footerBtnStyle = { background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" } as const;

  return (
    <aside
      className={cn(
        "fixed right-0 top-[var(--topbar-h)] bottom-0 z-40",
        "w-[320px] flex flex-col",
        "border-l shadow-[var(--shadow-popup)]",
        "animate-in slide-in-from-right duration-200"
      )}
      style={{ background: "var(--canvas-white)", borderColor: "hsl(var(--border))" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
        <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: "var(--accent-hex)" }}>
          {question.kind}
        </span>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="flex items-center justify-center w-6 h-6 rounded transition-colors border-none cursor-pointer"
          style={{ background: "transparent", color: "var(--text-muted)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {question.kind === "mcq" ? (
          <QuestionForm
            key={question.id}
            initial={question}
            onSave={onSave}
            onCancel={onClose}
          />
        ) : (
          <div className="flex flex-col gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <p>
              <strong style={{ color: "var(--ink)" }}>{question.kind}</strong> questions
              can&apos;t be edited in this inspector yet — only MCQ questions are supported here.
            </p>
            <p>
              Use the TideLearn MCP tool <code className="font-mono">update_question</code>,
              or remove and re-import via the JSON panel below the canvas.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex gap-1">
          <button
            onClick={() => onMove(question.id, "up")}
            disabled={idx === 0}
            aria-label="Move question up"
            className={cn(footerBtnBase, idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(question.id, "down")}
            disabled={idx === total - 1}
            aria-label="Move question down"
            className={cn(footerBtnBase, idx === total - 1 ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(question.id)}
            aria-label="Duplicate question"
            className={cn(footerBtnBase, "hover:border-[var(--accent-hex)]")}
            style={footerBtnStyle}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => onRemove(question.id)}
          aria-label="Delete question"
          className={cn(footerBtnBase, "hover:bg-red-50 hover:border-red-300 hover:text-red-500")}
          style={footerBtnStyle}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/__tests__/components/assessment/QuestionInspector.test.tsx 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add src/components/assessment/QuestionInspector.tsx src/__tests__/components/assessment/QuestionInspector.test.tsx
git commit -m "feat: QuestionInspector drawer mirrors BlockInspector"
```

---

## Task 4 — Create AssessmentConfigBar (compact chip row)

Replace the full-width horizontal config form at the top of `AssessmentEditor` with a compact chip row: "Pass N% · Exam size N · N questions in bank".

**Files:**
- Create: `src/components/assessment/AssessmentConfigBar.tsx`

- [ ] **Step 1: Create AssessmentConfigBar**

```tsx
// src/components/assessment/AssessmentConfigBar.tsx
import type { AssessmentLesson } from "@/types/course";

type Props = {
  lesson: AssessmentLesson;
  onChange: (next: AssessmentLesson) => void;
};

export function AssessmentConfigBar({ lesson, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap mb-4 px-3 py-2 rounded-md text-xs"
      style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
    >
      <label className="flex items-center gap-1.5">
        <span className="font-semibold" style={{ color: "var(--accent-hex)" }}>Pass</span>
        <input
          type="number"
          min={0}
          max={100}
          value={lesson.config.passingScore ?? 80}
          onChange={(e) => onChange({ ...lesson, config: { ...lesson.config, passingScore: Number(e.target.value) } })}
          aria-label="Passing score percentage"
          className="w-14 px-2 py-1 rounded text-xs outline-none"
          style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", color: "var(--ink)" }}
        />
        <span style={{ color: "var(--text-muted)" }}>%</span>
      </label>

      <span style={{ color: "var(--text-muted)" }}>·</span>

      <label className="flex items-center gap-1.5">
        <span className="font-semibold" style={{ color: "var(--accent-hex)" }}>Exam size</span>
        <input
          type="number"
          min={1}
          max={lesson.questions.length || 100}
          value={lesson.config.examSize ?? 20}
          onChange={(e) => onChange({ ...lesson, config: { ...lesson.config, examSize: Number(e.target.value) } })}
          aria-label="Exam size — number of questions"
          className="w-14 px-2 py-1 rounded text-xs outline-none"
          style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", color: "var(--ink)" }}
        />
      </label>

      <span style={{ color: "var(--text-muted)" }}>·</span>

      <span style={{ color: "var(--text-muted)" }}>
        {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/assessment/AssessmentConfigBar.tsx
git commit -m "feat: AssessmentConfigBar compact chip row"
```

---

## Task 5 — Wire it all together in AssessmentEditor

Replace the inline-form paradigm with WYSIWYG + inspector. Add question-level `selectedQuestionId` state, move/duplicate handlers, `AlertDialog` delete confirmation. Drop all inline hex / `Inter` styling.

**Files:**
- Modify: `src/components/assessment/AssessmentEditor.tsx` (significant rewrite)
- Modify: `src/components/assessment/JsonImport.tsx` (token drive-by if it has inline hex)
- Create: `src/__tests__/components/assessment/AssessmentEditor.test.tsx`

- [ ] **Step 1: Write the integration test**

```tsx
// src/__tests__/components/assessment/AssessmentEditor.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { AssessmentEditor } from "@/components/assessment/AssessmentEditor";
import { uid } from "@/types/course";

const lesson = {
  kind: "assessment" as const,
  id: uid(),
  title: "Quiz",
  config: { passingScore: 80, examSize: 20 },
  questions: [
    { id: uid(), kind: "mcq" as const, text: "Q1", options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 0 },
    { id: uid(), kind: "mcq" as const, text: "Q2", options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 0 },
  ],
};

describe("AssessmentEditor", () => {
  test("renders question cards", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
  });

  test("clicking a question opens the inspector", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Question 1.*click to edit/i }));
    expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
  });

  test("no inline QuestionForm appears by default", () => {
    render(<AssessmentEditor lesson={lesson} onChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/enter your question/i)).not.toBeInTheDocument();
  });

  test("clicking + Add question opens inspector without persisting a draft", () => {
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={lesson} onChange={onChange} />);
    fireEvent.click(screen.getByText(/add question/i));
    // Draft is ephemeral — lesson is unchanged until user saves the inspector form.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
  });

  test("closing the inspector on a draft discards it (no empty question added)", () => {
    const onChange = vi.fn();
    render(<AssessmentEditor lesson={lesson} onChange={onChange} />);
    fireEvent.click(screen.getByText(/add question/i));
    fireEvent.click(screen.getByLabelText(/close inspector/i));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify failure**

```bash
npx vitest run src/__tests__/components/assessment/AssessmentEditor.test.tsx 2>&1 | tail -20
```

- [ ] **Step 3: Rewrite AssessmentEditor**

```tsx
// src/components/assessment/AssessmentEditor.tsx
import { useState } from "react";
import type { AssessmentLesson, AssessmentQuestion } from "@/types/course";
import { uid } from "@/types/course";
import { QuestionCard } from "./QuestionCard";
import { QuestionInspector } from "./QuestionInspector";
import { AssessmentConfigBar } from "./AssessmentConfigBar";
import { JsonImport } from "./JsonImport";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Props = {
  lesson: AssessmentLesson;
  onChange: (updated: AssessmentLesson) => void;
};

function emptyMcq(): AssessmentQuestion {
  return {
    id: uid(),
    kind: "mcq",
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function AssessmentEditor({ lesson, onChange }: Props) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Draft question for the "+ Add question" flow — lives in UI state until the
  // user clicks Save in the inspector, so bailing doesn't leave an empty MCQ
  // stranded in the lesson.
  const [draftQuestion, setDraftQuestion] = useState<AssessmentQuestion | null>(null);

  const questions = lesson.questions;

  function update(changes: Partial<Omit<AssessmentLesson, "kind" | "id">>) {
    onChange({ ...lesson, ...changes });
  }

  function handleSave(q: AssessmentQuestion) {
    const exists = questions.some((x) => x.id === q.id);
    if (!exists) {
      // Saving the draft for the first time — promote it into the real list.
      update({ questions: [...questions, q] });
      setDraftQuestion(null);
      setSelectedQuestionId(q.id);
      return;
    }
    update({ questions: questions.map((x) => (x.id === q.id ? q : x)) });
  }

  function handleAddQuestion() {
    const q = emptyMcq();
    setDraftQuestion(q);
    setSelectedQuestionId(q.id);
    // Note: NOT calling update() here — the draft is ephemeral until saved.
  }

  function handleCloseInspector() {
    // If the user closes the inspector without saving a draft, discard it.
    if (draftQuestion && selectedQuestionId === draftQuestion.id) {
      setDraftQuestion(null);
    }
    setSelectedQuestionId(null);
  }

  function handleMove(id: string, dir: "up" | "down") {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ questions: next });
  }

  function handleDuplicate(id: string) {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    const copy: AssessmentQuestion = { ...q, id: uid() };
    const idx = questions.findIndex((x) => x.id === id);
    const next = [...questions.slice(0, idx + 1), copy, ...questions.slice(idx + 1)];
    update({ questions: next });
    setSelectedQuestionId(copy.id);
  }

  function handleRemove(id: string) {
    setDeleteTargetId(id);
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    update({ questions: questions.filter((q) => q.id !== deleteTargetId) });
    if (selectedQuestionId === deleteTargetId) setSelectedQuestionId(null);
    setDeleteTargetId(null);
  }

  function handleImport(imported: AssessmentQuestion[]) {
    update({ questions: [...questions, ...imported] });
  }

  // Resolve selection: prefer an already-saved question; fall back to the
  // ephemeral draft when its id matches.
  const selectedIdx = selectedQuestionId ? questions.findIndex((q) => q.id === selectedQuestionId) : -1;
  const selectedQuestion: AssessmentQuestion | null =
    selectedIdx >= 0
      ? questions[selectedIdx]
      : draftQuestion && draftQuestion.id === selectedQuestionId
        ? draftQuestion
        : null;
  // For the inspector footer: draft shows as "new" (idx=total so Up works, Down is disabled).
  const inspectorIdx = selectedIdx >= 0 ? selectedIdx : questions.length;
  const inspectorTotal = selectedIdx >= 0 ? questions.length : questions.length + 1;

  return (
    <>
      <div className="max-w-[var(--reading-max-w)] mx-auto flex flex-col pb-8">
        <AssessmentConfigBar lesson={lesson} onChange={onChange} />

        {questions.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            No questions yet. Add your first question below.
          </p>
        )}

        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            selected={selectedQuestionId === q.id}
            onSelect={() => setSelectedQuestionId(q.id)}
          />
        ))}

        <button
          onClick={handleAddQuestion}
          className="mt-2 self-start text-xs font-bold rounded-md px-4 py-2 border-none cursor-pointer"
          style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
        >
          + Add question
        </button>

        <JsonImport onImport={handleImport} />
      </div>

      {selectedQuestion && (
        <QuestionInspector
          key={selectedQuestion.id}
          question={selectedQuestion}
          idx={inspectorIdx}
          total={inspectorTotal}
          onClose={handleCloseInspector}
          onSave={handleSave}
          onMove={handleMove}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
        />
      )}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The question will be permanently removed from this lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 4: Tokenise JsonImport if needed (drive-by)**

```bash
grep -n '#' src/components/assessment/JsonImport.tsx | grep -vE "(#0a1c18|#\{|href=|placeholder)" | head
```

If any inline hex exists, apply the same token map from Task 1 Step 3. If the file is clean, skip.

- [ ] **Step 5: Run all assessment tests**

```bash
npx vitest run src/__tests__/components/assessment/ 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 6: Run full test suite + MCP**

```bash
npx vitest run 2>&1 | tail -20
cd mcp && npm test 2>&1 | tail -10 && cd ..
```

Expected: all green (238 MCP tests still passing).

- [ ] **Step 7: Visual verification with Control Chrome**

`npm run dev` (if not running), navigate to a course with an assessment lesson:

```js
// Click an assessment lesson in the sidebar
// Click a question card → inspector should slide in
document.querySelector('aside[class*="fixed right-0"]')
// Expected: element found

// Config bar is chip-style (not a full-width form)
document.querySelector('[aria-label="Passing score percentage"]')
// Expected: input element
```

- [ ] **Step 8: Commit**

```bash
git add src/components/assessment/ src/__tests__/components/assessment/
git commit -m "feat: AssessmentEditor WYSIWYG + QuestionInspector drawer"
```

---

## Final verification

- [ ] **Step 1** — lint + build:

```bash
npm run lint 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

- [ ] **Step 2** — residual-hex grep to catch misses:

```bash
grep -rn --include='*.tsx' --include='*.ts' -E '#[0-9a-fA-F]{6}' src/components/assessment 2>&1 | head -30
```

Expected: only `#0a1c18` (brand text-on-accent constant) and any commented-out lines. Investigate anything else.

- [ ] **Step 3** — update CLAUDE.md audit progress:

```markdown
- [x] **Assessment Editor WYSIWYG** (merged to main) — `QuestionInspector` drawer mirrors `BlockInspector`; `QuestionCard` has WYSIWYG select affordance; `AssessmentConfigBar` replaces the full-width config form with a chip row; all inline hex / `Inter` styling replaced with tokens.
```

- [ ] **Step 4** — open PR.

```bash
gh pr create --title "Assessment editor: WYSIWYG cards + QuestionInspector drawer" --body "$(cat <<'EOF'
## Summary
- `QuestionCard` becomes the canvas "block" (selected/onSelect, ring-on-selected)
- New `QuestionInspector` — right-side drawer, mirrors `BlockInspector`
- New `AssessmentConfigBar` — compact chip row replaces the full-width config form
- `QuestionForm` + `QuestionCard` + `AssessmentEditor` fully tokenised (no inline hex, no `Inter` fontFamily)
- `AlertDialog` confirms question deletion

## Test plan
- [ ] New tests pass: QuestionCard, QuestionInspector, AssessmentEditor
- [ ] Full frontend Vitest suite passes
- [ ] MCP 238 tests still green
- [ ] Visual: click question → inspector opens; + Add question preselects new question; chip bar updates; delete shows confirmation dialog

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes for Implementation

- **Tests live in `src/__tests__/`** — Vitest `include` is `src/__tests__/**/*.test.{ts,tsx}`.
- **`AssessmentQuestion` is a discriminated union.** `QuestionCard` and `QuestionInspector` must handle all kinds, not only MCQ. `QuestionCard` only renders the correct-option preview when `question.kind === "mcq"`; other kinds (`fillinblank`, `matching`, `sorting`, `multipleresponse`) get a kind tag. **Do not** call `question.options[question.correctIndex]` without the kind narrow — TypeScript will catch it; runtime will crash if you cast around it.
- **`QuestionForm` only supports MCQ today.** If you open the inspector on a non-MCQ question and the form looks broken, that's pre-existing behaviour — not a regression. Extending QuestionForm to the other 4 kinds is separate scope.
- **Inspector overlap:** `QuestionInspector` uses the same fixed-right-320px positioning as `BlockInspector`. Only one can be open at a time because a user is either on a content lesson or an assessment lesson, never both. No conflict.
- **`animate-in slide-in-from-right`** comes from `tailwindcss-animate`. If it doesn't exist, swap for a simpler `transition-transform` pattern matching whatever `BlockInspector` currently uses.
