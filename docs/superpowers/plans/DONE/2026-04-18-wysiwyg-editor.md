# WYSIWYG Editor + Inspector Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the TideLearn editor from an inline-form paradigm to a WYSIWYG canvas (blocks look exactly as learners see them) with a right-side inspector drawer that slides open on block click.

**Architecture:** The canvas switches from rendering `EditorComp` (edit forms) inline to rendering `View` components (learner view). Clicking any block opens a `BlockInspector` drawer on the right, which renders the `EditorComp` plus move/duplicate/delete controls. The editor sidebar gets a light theme with course-hierarchy display. The top bar becomes a pure breadcrumb + control bar (no editable lesson title input).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS custom properties (Rockpool tokens), Vitest for tests

---

## Design Reference

From the Refined v2 design (confirmed by Theo: "I love this" + "I like that the inspection box pops up, and that the main content in view looks like what the learner sees"):

- Canvas: blocks rendered by `spec.View` (WYSIWYG, not editor forms)
- Click block → `BlockInspector` slides in from the right (~320px drawer)
- Inspector: block-type label + close button (header) | `EditorComp` form (body) | move/duplicate/delete (footer)
- Sidebar: light/white background, course name → lesson title → block count → numbered lesson list
- TopBar: "CourseTitle / LessonTitle" breadcrumb (static) + undo/redo + Saved + Preview + Publish

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/pages/BlockInspector.tsx` | Right-side inspector drawer — header, form body, footer controls |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/AppShell.tsx` | Add optional `lightSidebar?: boolean` prop to support light-theme sidebar |
| `src/pages/BlockItem.tsx` | Render `spec.View` instead of `EditorComp`; add `selected`/`onSelect` props; remove inline controls |
| `src/pages/Editor.tsx` | Add `selectedBlockId` state; wire inspector open/close; lesson title editing via sidebar |
| `src/pages/EditorSidebar.tsx` | Light theme colors; add lesson-info header (title, block count); click-to-edit lesson title |
| `src/pages/EditorTopBar.tsx` | Remove editable lesson title input; static "Course / Lesson" breadcrumb |

### Test Files
> **Note:** Vitest `include` glob is `src/__tests__/**/*.test.{ts,tsx}`. Test files MUST live under `src/__tests__/`, NOT alongside source files.

| File | Coverage |
|------|---------|
| `src/__tests__/pages/BlockInspector.test.tsx` | Inspector renders correct type label, close button calls onClose, footer buttons fire callbacks |
| `src/__tests__/pages/BlockItem.test.tsx` | Block renders View component (not EditorComp); clicking calls onSelect |

---

## Task 1 — AppShell: `lightSidebar` prop

**Files:**
- Modify: `src/components/AppShell.tsx:22-25`

- [ ] **Step 1: Add `lightSidebar` prop to `AppShellProps` interface and `<aside>` styling**

```tsx
// In AppShellProps:
lightSidebar?: boolean;

// In AppShell({ children, sidebar, topBar, lightSidebar }):
// aside element (currently line 22):
<aside
  className="hidden md:flex w-[var(--sidebar-w-editor)] flex-col flex-shrink-0"
  style={{
    background: lightSidebar ? "var(--canvas-white)" : "var(--sidebar)",
    borderRight: lightSidebar
      ? "1px solid hsl(var(--border))"
      : "1px solid var(--accent-bg)",
  }}
>
```

- [ ] **Step 2: Run build to verify no TypeScript errors**

```bash
cd /Users/theonavarro/TideLearn && npm run build 2>&1 | tail -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add lightSidebar prop to AppShell for editor light theme"
```

---

## Task 2 — EditorSidebar: light theme + lesson info + click-to-edit title

**Files:**
- Modify: `src/pages/EditorSidebar.tsx` (full rewrite of styling)

The new sidebar structure:
1. **Header**: "← All courses" link (muted, small) — kept from current
2. **Lesson info**: course name (uppercase, muted) → lesson title (bold, click-to-edit) → "N blocks · ~N min read"
3. **"LESSONS" section label**: teal accent, uppercase small
4. **Lesson list**: same numbered list, updated colors for light bg
5. **Footer**: `+ Lesson` / `+ Assessment` / `↓ Export SCORM` — same as now

The `EditorSidebar` receives a new `blockCount` prop so it can display "N blocks".

- [ ] **Step 1: Add `blockCount` and `onLessonTitleChange` props + lesson title edit state**

```tsx
interface EditorSidebarProps {
  courseTitle: string;
  lessons: Lesson[];
  selectedLessonId: string;
  blockCount: number;                                  // NEW
  onSelectLesson: (id: string) => void;
  onAddLesson: (kind: "content" | "assessment") => void;
  onExportScorm: () => void;
  onLessonTitleChange: (id: string, title: string) => void; // NEW (moved from TopBar)
}
```

- [ ] **Step 2: Rewrite `EditorSidebar` with light theme and lesson info header**

```tsx
export function EditorSidebar({
  courseTitle, lessons, selectedLessonId, blockCount,
  onSelectLesson, onAddLesson, onExportScorm, onLessonTitleChange,
}: EditorSidebarProps) {
  const navigate = useNavigate();
  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const startEdit = () => {
    setTitleDraft(selectedLesson?.title ?? "");
    setEditingTitle(true);
  };
  const commitEdit = () => {
    if (selectedLesson && titleDraft.trim()) {
      onLessonTitleChange(selectedLesson.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const readTime = Math.max(1, Math.round(blockCount * 0.3)); // rough estimate

  return (
    <div className="lesson-list flex flex-col h-full overflow-hidden">
      {/* Back link */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-1 text-[11px] bg-transparent border-none cursor-pointer p-0 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ← All courses
        </button>
      </div>

      {/* Lesson info header */}
      <div className="px-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        {/* Course name */}
        <div className="text-[9px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
          {courseTitle}
        </div>
        {/* Lesson title — click to edit */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingTitle(false); }}
            className="font-display text-sm font-semibold w-full bg-transparent border-b outline-none"
            style={{ color: "var(--ink)", borderColor: "var(--accent-hex)" }}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename lesson"
            className="font-display text-sm font-semibold text-left w-full bg-transparent border-none cursor-text p-0 truncate"
            style={{ color: "var(--ink)" }}
          >
            {selectedLesson?.title ?? ""}
          </button>
        )}
        {/* Block count */}
        {selectedLesson?.kind === "content" && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {blockCount} block{blockCount !== 1 ? "s" : ""} · ~{readTime} min read
          </div>
        )}
      </div>

      {/* Lessons section */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="text-[9px] font-bold tracking-[0.1em] uppercase" style={{ color: "var(--accent-hex)" }}>
          Lessons
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {lessons.map((l, idx) => {
          const isActive = l.id === selectedLessonId;
          return (
            <button
              key={l.id}
              onClick={() => onSelectLesson(l.id)}
              className="flex items-center gap-2 w-full text-left border-none rounded-md py-[6px] px-2.5 cursor-pointer mb-0.5 transition-colors text-xs font-medium"
              style={{
                background: isActive ? "rgba(64,200,160,0.08)" : "transparent",
                color: isActive ? "var(--accent-hex)" : "var(--ink)",
              }}
            >
              <span className="text-xs font-mono font-bold min-w-[16px]" style={{ color: isActive ? "var(--accent-hex)" : "var(--text-muted)" }}>
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{l.title}</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {l.kind === "content" ? "doc" : "quiz"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer: add + export */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => onAddLesson("content")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            + Lesson
          </button>
          <button
            onClick={() => onAddLesson("assessment")}
            className="flex-1 border rounded-md text-[11px] font-medium py-1.5 cursor-pointer transition-colors"
            style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)", background: "transparent", borderStyle: "dashed" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            + Assessment
          </button>
        </div>
        <button
          onClick={onExportScorm}
          className="w-full text-left text-[11px] font-medium py-1.5 px-2 rounded-md cursor-pointer transition-colors border-none"
          style={{ color: "var(--text-muted)", background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(64,200,160,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          ↓ Export SCORM
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update Editor.tsx to pass new props to EditorSidebar and remove `onLessonTitleChange` from EditorTopBar**

In `Editor.tsx` (around line 229–237):
```tsx
<EditorSidebar
  courseTitle={courseTitle}
  lessons={lessons}
  selectedLessonId={selectedLessonId}
  blockCount={blocks.length}                         // NEW
  onSelectLesson={setSelectedLessonId}
  onAddLesson={addLesson}
  onExportScorm={exportSCORM12}
  onLessonTitleChange={updateLessonTitle}            // MOVED from TopBar
/>
```

And pass `lightSidebar` to AppShell:
```tsx
<AppShell
  lightSidebar                                       // NEW
  sidebar={<EditorSidebar ... />}
  topBar={<EditorTopBar ... />}
>
```

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/EditorSidebar.tsx src/pages/Editor.tsx src/components/AppShell.tsx
git commit -m "feat: editor sidebar light theme with lesson info and click-to-edit title"
```

---

## Task 3 — EditorTopBar: breadcrumb-only, remove editable title

**Files:**
- Modify: `src/pages/EditorTopBar.tsx` (lines 1–112)

The top bar no longer has an editable lesson title. It shows a static breadcrumb "CourseTitle / LessonTitle" and all existing controls (undo/redo, preview, save status, publish).

- [ ] **Step 1: Remove `lessonTitle`, `onLessonTitleChange` from props; add display-only `lessonTitle`**

```tsx
interface EditorTopBarProps {
  courseTitle: string;
  lessonTitle: string;          // display only (no longer editable here)
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  publishUrl: string;
  isSaving: boolean;
  onPublish: () => void;
  // REMOVED: onLessonTitleChange
}
```

- [ ] **Step 2: Replace the two-line breadcrumb+input with a single breadcrumb row**

```tsx
// Replace the entire left section (lines 34–55) with:
<div className="flex items-center gap-1.5 flex-1 min-w-0">
  <button
    onClick={() => navigate("/courses")}
    className="text-xs bg-transparent border-none cursor-pointer p-0 transition-colors shrink-0"
    style={{ color: "var(--text-muted)" }}
    onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-hex)")}
    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
  >
    {courseTitle || "My Courses"}
  </button>
  <span className="text-xs" style={{ color: "var(--text-muted)" }}>/</span>
  <span className="text-xs font-semibold truncate" style={{ color: "var(--ink)" }}>
    {lessonTitle}
  </span>
</div>
```

- [ ] **Step 3: Update Editor.tsx — remove `onLessonTitleChange` from TopBar props**

In `Editor.tsx` (around line 239–252), remove the `onLessonTitleChange` prop from `<EditorTopBar>`.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/EditorTopBar.tsx src/pages/Editor.tsx
git commit -m "feat: editor top bar — static breadcrumb replaces editable lesson title"
```

---

## Task 4 — BlockItem: WYSIWYG rendering + selection

**Files:**
- Modify: `src/pages/BlockItem.tsx` (full rewrite — 65 lines → ~60 lines)

**What changes:**
- Remove `EditorComp` prop entirely
- Accept `ViewComp: React.ComponentType<{ block: Block }>` instead
- Remove inline block type chip div
- Remove inline block controls (↑↓⧉✕) — they move to the inspector
- Add `selected?: boolean` and `onSelect?: () => void` props
- Canvas block: click → `onSelect()`; selected → teal ring outline; cursor: pointer

**What stays:**
- Hover border (subtle) to hint interactivity
- Layout and padding

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/pages/BlockItem.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockItem } from "./BlockItem";
import { getSpec } from "@/components/blocks/registry";
import { uid } from "@/types/course";

const headingBlock = { id: uid(), type: "heading" as const, text: "Hello" };
const spec = getSpec("heading");

test("renders View component (not editor form)", () => {
  render(<BlockItem block={headingBlock} spec={spec} selected={false} onSelect={vi.fn()} />);
  // View renders the heading text, not a label chip or input
  expect(screen.getByText("Hello")).toBeInTheDocument();
});

test("calls onSelect when clicked", () => {
  const onSelect = vi.fn();
  render(<BlockItem block={headingBlock} spec={spec} selected={false} onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button"));
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("has selected ring class when selected=true", () => {
  const { container } = render(<BlockItem block={headingBlock} spec={spec} selected onSelect={vi.fn()} />);
  const card = container.querySelector(".block-card");
  expect(card?.className).toContain("ring-2");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/theonavarro/TideLearn && npx vitest run src/__tests__/pages/BlockItem.test.tsx 2>&1 | tail -30
```

Expected: FAIL (BlockItem still uses EditorComp, no `onSelect`)

- [ ] **Step 3: Rewrite BlockItem**

```tsx
import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

interface BlockItemProps {
  block: Block;
  spec: ReturnType<typeof getSpec>;
  selected: boolean;
  onSelect: () => void;
}

export function BlockItem({ block, spec, selected, onSelect }: BlockItemProps) {
  const ViewComp = spec.View as React.ComponentType<{ block: Block }>;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${spec.label} block — click to edit`}
      className={cn(
        "block-item block-card w-full text-left relative mb-0",
        "border-[1.5px] rounded-lg p-4 px-5 cursor-pointer",
        "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
        selected
          ? "ring-2 ring-[var(--accent-hex)] border-transparent"
          : "border-transparent hover:border-[hsl(var(--border))]"
      )}
      style={{ background: "var(--canvas-white)" }}
    >
      <ViewComp block={block} />
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/pages/BlockItem.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Update Editor.tsx — remove EditorComp from BlockItem usage, add onSelect**

In `Editor.tsx` lines 299–305:
```tsx
{blocks.map((b, idx) => {
  const spec = getSpec(b.type);
  return (
    <div key={b.id} className={cn("transition-opacity", pickerState !== null && pickerState.rowIndex <= idx && "opacity-25")}>
      <BlockItem
        block={b}
        spec={spec}
        selected={selectedBlockId === b.id}           // NEW
        onSelect={() => setSelectedBlockId(b.id)}     // NEW
        // REMOVED: idx, total, EditorComp, onMove, onDuplicate, onRemove, onUpdate
      />
      ...
    </div>
  );
})}
```

Add `selectedBlockId` state at top of `Editor()`:
```tsx
const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
```

Clear selection when switching lessons (in the lesson change handler):
```tsx
const handleSelectLesson = (id: string) => {
  setSelectedLessonId(id);
  setSelectedBlockId(null);
};
// Pass handleSelectLesson everywhere setSelectedLessonId was used
```

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/BlockItem.tsx src/pages/BlockItem.test.tsx src/pages/Editor.tsx
git commit -m "feat: WYSIWYG canvas — BlockItem renders View component with click-to-select"
```

---

## Task 5 — BlockInspector: new right-side drawer

**Files:**
- Create: `src/pages/BlockInspector.tsx`
- Create: `src/pages/BlockInspector.test.tsx`

**Inspector layout (fixed right, 320px):**
- **Header**: block type label (teal, uppercase, small) + X close button
- **Body**: `EditorComp` form (scrollable)
- **Footer**: ↑ Move up | ↓ Move down | ⧉ Duplicate | ✕ Delete
- **Animation**: `translate-x-0` open / `translate-x-full` closed (transition-transform 200ms)
- **Overlay**: subtle backdrop on mobile only
- **Escape key**: closes inspector

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/pages/BlockInspector.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockInspector } from "./BlockInspector";
import { getSpec } from "@/components/blocks/registry";
import { uid } from "@/types/course";

const block = { id: uid(), type: "text" as const, text: "Hello" };
const spec = getSpec("text");

function renderInspector(overrides = {}) {
  const props = {
    block, spec,
    idx: 1, total: 3,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return { ...render(<BlockInspector {...props} />), props };
}

test("renders block type label", () => {
  renderInspector();
  expect(screen.getByText(/text/i)).toBeInTheDocument();
});

test("close button calls onClose", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/close inspector/i));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("delete button calls onRemove with block id", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/delete block/i));
  expect(props.onRemove).toHaveBeenCalledWith(block.id);
});

test("duplicate button calls onDuplicate", () => {
  const { props } = renderInspector();
  fireEvent.click(screen.getByLabelText(/duplicate block/i));
  expect(props.onDuplicate).toHaveBeenCalledWith(block.id);
});

test("move up disabled when idx=0", () => {
  renderInspector({ idx: 0 });
  expect(screen.getByLabelText(/move block up/i)).toBeDisabled();
});

test("move down disabled when idx=total-1", () => {
  renderInspector({ idx: 2, total: 3 });
  expect(screen.getByLabelText(/move block down/i)).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/pages/BlockInspector.test.tsx 2>&1 | tail -20
```

Expected: FAIL (file doesn't exist)

- [ ] **Step 3: Create BlockInspector component**

```tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@/types/course";
import type { getSpec } from "@/components/blocks/registry";

interface BlockInspectorProps {
  block: Block;
  spec: ReturnType<typeof getSpec>;
  idx: number;
  total: number;
  onClose: () => void;
  onUpdate: (id: string, updater: (b: Block) => Block) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function BlockInspector({
  block, spec, idx, total,
  onClose, onUpdate, onMove, onDuplicate, onRemove,
}: BlockInspectorProps) {
  const EditorComp = spec.Editor as React.ComponentType<{
    block: Block;
    onChange: (updated: Block) => void;
  }>;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <aside
      className={cn(
        "fixed right-0 top-[var(--topbar-h)] bottom-0 z-40",
        "w-[320px] flex flex-col",
        "border-l shadow-[var(--shadow-popup)]",
        "animate-in slide-in-from-right duration-200"
      )}
      style={{
        background: "var(--canvas-white)",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span
          className="text-[10px] font-extrabold uppercase tracking-wide"
          style={{ color: "var(--accent-hex)" }}
        >
          {spec.label}
        </span>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="flex items-center justify-center w-6 h-6 rounded transition-colors border-none cursor-pointer"
          style={{ background: "transparent", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: EditorComp form */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <EditorComp
          block={block}
          onChange={(updated) => onUpdate(block.id, () => updated)}
        />
      </div>

      {/* Footer: block controls */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="flex gap-1">
          {[
            { label: "↑", ariaLabel: "Move block up", action: () => onMove(block.id, "up"), disabled: idx === 0 },
            { label: "↓", ariaLabel: "Move block down", action: () => onMove(block.id, "down"), disabled: idx === total - 1 },
            { label: "⧉", ariaLabel: "Duplicate block", action: () => onDuplicate(block.id), disabled: false },
          ].map(btn => (
            <button
              key={btn.ariaLabel}
              onClick={btn.action}
              disabled={btn.disabled}
              aria-label={btn.ariaLabel}
              className={cn(
                "w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)] focus-visible:outline-none",
                btn.disabled ? "opacity-30 cursor-not-allowed" : "hover:border-[var(--accent-hex)]"
              )}
              style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { onRemove(block.id); onClose(); }}
          aria-label="Delete block"
          className="w-7 h-7 border rounded text-xs flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none hover:bg-red-50 hover:border-red-300 hover:text-red-500"
          style={{ background: "transparent", borderColor: "hsl(var(--border))", color: "var(--ink)" }}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/__tests__/pages/BlockInspector.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/BlockInspector.tsx src/pages/BlockInspector.test.tsx
git commit -m "feat: BlockInspector drawer — header, form body, move/dupe/delete footer"
```

---

## Task 6 — Wire BlockInspector into Editor

**Files:**
- Modify: `src/pages/Editor.tsx`

The inspector lives outside AppShell's main content area (fixed positioned). It renders when `selectedBlockId !== null`. The canvas does not change its width — the inspector overlays it.

- [ ] **Step 1: Import BlockInspector in Editor.tsx**

```tsx
import { BlockInspector } from "@/pages/BlockInspector";
```

- [ ] **Step 2: Add inspector rendering after `</AppShell>`**

After the `</AppShell>` closing tag (around line 334), before the `{publishOpen && ...}` block:

```tsx
{/* Block Inspector */}
{(() => {
  if (!selectedBlockId || !selectedContentLesson) return null;
  const selIdx = blocks.findIndex(b => b.id === selectedBlockId);
  if (selIdx === -1) return null;
  const selBlock = blocks[selIdx];
  const selSpec = getSpec(selBlock.type);
  return (
    <BlockInspector
      key={selectedBlockId}
      block={selBlock}
      spec={selSpec}
      idx={selIdx}
      total={blocks.length}
      onClose={() => setSelectedBlockId(null)}
      onUpdate={updateBlock}
      onMove={moveBlock}
      onDuplicate={(id) => { duplicateBlock(id); }}
      onRemove={(id) => { removeBlock(id); setSelectedBlockId(null); }}
    />
  );
})()}
```

- [ ] **Step 3: Build — verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Run all frontend tests**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: All tests pass (238 MCP + frontend suite)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Editor.tsx
git commit -m "feat: wire BlockInspector into Editor — click block opens inspector drawer"
```

---

## Task 7 — Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev &
```

- [ ] **Step 2: Open app in browser and navigate to a course with blocks**

Use Control Chrome to check `http://localhost:8080/editor?courseId=<any-course-id>` or the one in tab 2075501936.

- [ ] **Step 3: Verify with Control Chrome**

```js
// Check sidebar is light-themed
document.querySelector("aside").style.background
// Expected: var(--canvas-white) or "rgb(248, 251, 255)"

// Check a block renders as WYSIWYG (no "HEADING" chip visible)
document.querySelector(".block-card .text-xs.font-extrabold.uppercase")
// Expected: null (chip removed from canvas)

// Check inspector doesn't exist before clicking
document.querySelector("[data-inspector]") // or check fixed aside
```

- [ ] **Step 4: Click a block — verify inspector slides in from right**

- [ ] **Step 5: Verify lesson title editing in sidebar (click lesson title)**

- [ ] **Step 6: Commit any visual fixes if needed**

---

## Task 8 — Cleanup, run full test suite, commit

- [ ] **Step 1: Run all tests**

```bash
npx vitest run 2>&1 | tail -20
cd mcp && npm test 2>&1 | tail -20
```

- [ ] **Step 2: Run linter**

```bash
npm run lint 2>&1 | tail -20
```

Fix any lint warnings.

- [ ] **Step 3: Final commit**

```bash
git add -p  # review all changes
git commit -m "feat: WYSIWYG editor + inspector drawer + light sidebar (Refined v2)"
```

---

## Notes for Implementation

- **View component types**: `spec.View` is typed as `ViewRenderer` in registry. Cast as `React.ComponentType<{ block: Block }>` inside BlockItem.
- **Assessment lessons**: `AssessmentEditor` is unchanged — the WYSIWYG + inspector only applies to `kind === "content"` lessons. No changes needed.
- **AddBlockRow**: Unchanged. Block insertion points (the `+` rows between blocks) remain as-is.
- **BlockPicker**: Unchanged. The `/` shortcut and picker behavior are unaffected.
- **Block controls removal**: The ↑↓⧉✕ buttons are REMOVED from BlockItem (moved to inspector). This is the biggest behavioral change — users must click a block to access these controls.
- **Mobile**: Inspector is fixed-positioned and may overlap the canvas fully on mobile. This is acceptable for now.
- **animate-in / slide-in-from-right**: These are Tailwind v3 animation utilities from `tailwindcss-animate`. If not available, use `transition-transform translate-x-0` CSS instead.
- **`key={selectedBlockId}` on inspector**: Forces a full remount when a different block is selected, resetting any local state in the EditorComp. Side effect: `animate-in slide-in-from-right` re-plays on every block switch. If this feels jarring, wrap the inspector in a persistent container and only animate it in when transitioning from `null → block`, not `block A → block B`.
- **`onChange` in inspector**: The plan uses `onUpdate(block.id, () => updated)` — the updater ignores its argument. This is safe here (no concurrent updates in this sync context) but differs from elsewhere in the codebase where updaters use the received block. This is intentional for simplicity.
