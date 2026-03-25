# RC4: Page Component Refactoring — Code Quality (B+ → A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the three largest page components from 775-873 lines each into thin orchestrators (~250-300 lines) by extracting focused hooks and sub-components.

**What the code analysis found:**

| Page | Lines | useState | useEffect | Handlers | Extractable sections |
|------|-------|----------|-----------|----------|---------------------|
| Editor.tsx | 873 | 11 | 3 | ~12 (block ops, autosave, import/export, keyboard) | Sidebar, TopBar, block ops, autosave, picker, import/export |
| View.tsx | 786 | 10 | 5 | ~6 (navigation, quiz tracking, progress, SCORM) | Sidebar, BottomNav, SCORM bridge, quiz answers, progress, navigation |
| Courses.tsx | 776 | 8 | 3 | ~8 (CRUD, import, cover upload, cloud sync) | Header, CourseCard already 300 lines as sub-fn, course list, search, cloud sync |

**Architecture:** Each page follows the same decomposition strategy:
1. Extract **business logic** into custom hooks in `src/hooks/`
2. Extract **UI sections** (sidebar, topbar, nav) into sibling components in `src/pages/`
3. Parent page becomes thin orchestrator: loads data, coordinates state, renders sub-components

**Prerequisites:** RC2 (tests) and RC3 (block modernisation) should be done first — tests catch regressions, modernised blocks reduce inline style noise in extracted components.

---

## Target Summary

| Parent | Current | Target | Hooks | Components |
|--------|---------|--------|-------|------------|
| `Editor.tsx` | 873 | ~280 | 4 hooks | 2 components |
| `View.tsx` | 786 | ~290 | 4 hooks | 2 components |
| `Courses.tsx` | 776 | ~260 | 3 hooks | 1 component (CourseCard already exists inline) |

---

## Phase A: Editor.tsx Decomposition

### Task 1: Extract useBlockOperations hook

**Files:** Create `src/hooks/useBlockOperations.ts`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Read Editor.tsx**

Identify block manipulation functions (~lines 163-209): `addBlock`, `updateBlock`, `insertBlockAt`, `moveBlock`, `duplicateBlock`. Note they depend on the undo/redo dispatch and selected lesson state.

- [ ] **Step 2: Create the hook**

```ts
// src/hooks/useBlockOperations.ts
export function useBlockOperations(
  lesson: ContentLesson | null,
  dispatch: (updater: (course: Course) => Course) => void,
  courseData: Course | null,
  selectedLessonId: string | null,
) {
  const addBlock = (kind: string) => { ... };
  const updateBlock = (blockId: string, updater: (b: Block) => Block) => { ... };
  const insertBlockAt = (kind: string, index: number) => { ... };
  const moveBlock = (blockId: string, direction: "up" | "down") => { ... };
  const duplicateBlock = (blockId: string) => { ... };

  return { addBlock, updateBlock, insertBlockAt, moveBlock, duplicateBlock };
}
```

The hook receives course state and dispatch, returns pure manipulation functions. Does NOT hold its own state.

- [ ] **Step 3: Wire up in Editor.tsx, delete old function definitions**

- [ ] **Step 4: Run tests + build**

```bash
npm test 2>&1 && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBlockOperations.ts src/pages/Editor.tsx
git commit -m "refactor: extract useBlockOperations hook from Editor"
```

---

### Task 2: Extract useCourseAutosave hook

**Files:** Create `src/hooks/useCourseAutosave.ts`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Identify autosave logic (~lines 221-264)**

Find: `isSaving` state, `saveTimer` ref, the debounced save `useEffect` (1000ms), `saveNow()` function that writes to localStorage + cloud.

- [ ] **Step 2: Create the hook**

```ts
export function useCourseAutosave(
  courseId: string | null,
  courseData: Course | null,
  userId: string | null,
) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout>();

  // useEffect: debounced save on courseData change
  // saveNow: immediate save

  return { isSaving, saveNow };
}
```

- [ ] **Step 3: Wire up, delete old autosave state/effects**

- [ ] **Step 4: Tests + build, commit**

```bash
git add src/hooks/useCourseAutosave.ts src/pages/Editor.tsx
git commit -m "refactor: extract useCourseAutosave hook from Editor"
```

---

### Task 3: Extract useBlockPicker hook

**Files:** Create `src/hooks/useBlockPicker.ts`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Identify picker logic**

Find: `pickerState`, `pickerSearch`, `pickerRef`, `pickerSearchRef`, the filtered registry `useMemo`, close-on-outside-click `useEffect`, focus-search-input `useEffect`.

- [ ] **Step 2: Create the hook**

```ts
export function useBlockPicker(selectedLesson: ContentLesson | null) {
  const [pickerState, setPickerState] = useState<{ rowIndex: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);
  const filteredRegistry = useMemo(() => { ... }, [pickerSearch]);

  // useEffect: close on outside click
  // useEffect: focus search input when opened

  return { pickerState, setPickerState, pickerSearch, setPickerSearch, filteredRegistry, pickerRef, pickerSearchRef };
}
```

- [ ] **Step 3: Wire up, delete old picker state/effects, commit**

```bash
git add src/hooks/useBlockPicker.ts src/pages/Editor.tsx
git commit -m "refactor: extract useBlockPicker hook from Editor"
```

---

### Task 4: Extract useEditorKeyboard hook

**Files:** Create `src/hooks/useEditorKeyboard.ts`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Identify keyboard shortcut logic (~lines 267-308)**

Find: "/" for block picker, Ctrl/Cmd+Z for undo, Ctrl/Cmd+Y for redo. Two `useEffect` blocks with `window.addEventListener("keydown", ...)`.

- [ ] **Step 2: Create the hook**

```ts
export function useEditorKeyboard(opts: {
  onSlash: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canOpenPicker: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { ... };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opts]);
}
```

- [ ] **Step 3: Wire up, delete old keyboard effects, commit**

```bash
git add src/hooks/useEditorKeyboard.ts src/pages/Editor.tsx
git commit -m "refactor: extract useEditorKeyboard hook from Editor"
```

---

### Task 5: Extract EditorSidebar component

**Files:** Create `src/pages/EditorSidebar.tsx`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Identify sidebar JSX**

The sidebar renders: lesson list with kind indicators, add-lesson buttons (content + assessment), remove-lesson button, lesson reordering controls.

- [ ] **Step 2: Create the component with typed props**

```tsx
interface EditorSidebarProps {
  lessons: Lesson[];
  selectedLessonId: string | null;
  onSelectLesson: (id: string) => void;
  onAddLesson: (kind: "content" | "assessment") => void;
  onRemoveLesson: (id: string) => void;
  courseTitle: string;
}

export function EditorSidebar({ ... }: EditorSidebarProps) { ... }
```

- [ ] **Step 3: Replace inline sidebar JSX in Editor.tsx with `<EditorSidebar ... />`**

- [ ] **Step 4: Tests + build, commit**

```bash
git add src/pages/EditorSidebar.tsx src/pages/Editor.tsx
git commit -m "refactor: extract EditorSidebar component from Editor"
```

---

### Task 6: Extract EditorTopBar component

**Files:** Create `src/pages/EditorTopBar.tsx`; Modify `src/pages/Editor.tsx`

- [ ] **Step 1: Identify top bar JSX**

Breadcrumb, lesson title, undo/redo buttons, preview button, autosave indicator, publish button.

- [ ] **Step 2: Create the component with typed props**

Props: `courseTitle`, `lessonTitle`, `onLessonTitleChange`, `canUndo`, `canRedo`, `onUndo`, `onRedo`, `onPreview`, `isSaving`, `onPublish`, `courseId`.

- [ ] **Step 3: Replace inline JSX, build, commit**

```bash
git add src/pages/EditorTopBar.tsx src/pages/Editor.tsx
git commit -m "refactor: extract EditorTopBar component from Editor"
```

---

### Task 7: Verify Editor.tsx line count

- [ ] **Step 1: Count lines**

```bash
wc -l src/pages/Editor.tsx
```

Expected: ~250-300 lines.

- [ ] **Step 2: Run full test suite**

```bash
npm test 2>&1
```

---

## Phase B: View.tsx Decomposition

### Task 8: Extract useScormBridge hook

**Files:** Create `src/hooks/useScormBridge.ts`; Modify `src/pages/View.tsx`

- [ ] **Step 1: Identify SCORM bridge logic (~lines 215-283)**

Find: `window.parent !== window` detection, "ready" message posting, "progress" message posting with completion percentage and quiz scores, "resume" message listener.

- [ ] **Step 2: Create the hook**

```ts
export function useScormBridge(opts: {
  courseTitle: string;
  lessonsCount: number;
  lessonsCompleted: number;
  quizScores: Record<string, boolean>;
}) {
  const isInFrame = window.parent !== window;
  // useEffect: post "ready" on mount
  // useEffect: post "progress" when completion changes
  // useEffect: listen for "resume" messages
  return { isInFrame };
}
```

- [ ] **Step 3: Wire up, delete old SCORM effects, commit**

```bash
git add src/hooks/useScormBridge.ts src/pages/View.tsx
git commit -m "refactor: extract useScormBridge hook from View"
```

---

### Task 9: Extract useQuizAnswers hook

**Files:** Create `src/hooks/useQuizAnswers.ts`; Modify `src/pages/View.tsx`

- [ ] **Step 1: Identify quiz answer tracking (~lines 137-159)**

Find: `answers` state (Record<string, boolean>), "quiz:answered" custom event listener, localStorage persistence under "courseAnswers:" key.

- [ ] **Step 2: Create the hook**

```ts
export function useQuizAnswers(courseId: string | null) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  // useEffect: listen for "quiz:answered" events
  // useEffect: persist to localStorage
  return { answers, clearAnswers };
}
```

- [ ] **Step 3: Wire up, delete old answer state/effects, commit**

```bash
git add src/hooks/useQuizAnswers.ts src/pages/View.tsx
git commit -m "refactor: extract useQuizAnswers hook from View"
```

---

### Task 10: Extract useLessonNavigation hook

**Files:** Create `src/hooks/useLessonNavigation.ts`; Modify `src/pages/View.tsx`

- [ ] **Step 1: Identify navigation logic**

Find: `currentLessonId`, `activeId`, `isPaged` state, the `go()` function (~line 350), URL hash sync (~lines 290-308), intersection observer for scrollspy (~lines 310-348).

- [ ] **Step 2: Create the hook**

```ts
export function useLessonNavigation(lessons: Lesson[], courseId: string | null) {
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPaged, setIsPaged] = useState(true);

  const go = (lessonId: string) => { ... };
  const goNext = () => { ... };
  const goPrevious = () => { ... };

  // useEffect: URL hash sync
  // useEffect: intersection observer for scroll mode

  return { currentLessonId, activeId, isPaged, setIsPaged, go, goNext, goPrevious, currentIndex };
}
```

- [ ] **Step 3: Wire up, delete old navigation state/effects, commit**

```bash
git add src/hooks/useLessonNavigation.ts src/pages/View.tsx
git commit -m "refactor: extract useLessonNavigation hook from View"
```

---

### Task 11: Extract ViewSidebar and ViewBottomNav components

**Files:** Create `src/pages/ViewSidebar.tsx`, `src/pages/ViewBottomNav.tsx`; Modify `src/pages/View.tsx`

- [ ] **Step 1: Identify sidebar JSX (~lines 503-558)**

Lesson list with progress dots, completion markers, click to navigate.

- [ ] **Step 2: Identify bottom nav JSX (~lines 733-782)**

Prev/next buttons for paged mode.

- [ ] **Step 3: Create both components with typed props**

ViewSidebar props: `lessons`, `currentLessonId`, `completed`, `activeId`, `onSelectLesson`, `sidebarOpen`, `onToggleSidebar`.
ViewBottomNav props: `currentIndex`, `lessonCount`, `onNext`, `onPrevious`, `currentLessonTitle`.

- [ ] **Step 4: Replace inline JSX, build, test, commit**

```bash
git add src/pages/ViewSidebar.tsx src/pages/ViewBottomNav.tsx src/pages/View.tsx
git commit -m "refactor: extract ViewSidebar and ViewBottomNav from View"
```

---

### Task 12: Verify View.tsx line count

```bash
wc -l src/pages/View.tsx
```

Expected: ~250-300 lines.

---

## Phase C: Courses.tsx Decomposition

### Task 13: Extract useCourseList hook

**Files:** Create `src/hooks/useCourseList.ts`; Modify `src/pages/Courses.tsx`

- [ ] **Step 1: Identify course CRUD logic**

Find: `courses` state, `refreshCourses()` (~line 438), `onCreate` (~line 511), `onDuplicate` (~line 545), `onExport` (~line 558), `onExportScorm` (~line 571), migration logic (~lines 479-482).

- [ ] **Step 2: Create the hook**

```ts
export function useCourseList(userId: string | null) {
  const [courses, setCourses] = useState<CourseIndexItem[]>([]);

  const refreshCourses = async () => { ... };
  const createCourse = async (title: string) => { ... };
  const deleteCourse = async (id: string) => { ... };
  const duplicateCourse = async (id: string) => { ... };

  // useEffect: refresh on mount and auth change
  // useEffect: legacy migration

  return { courses, refreshCourses, createCourse, deleteCourse, duplicateCourse };
}
```

- [ ] **Step 3: Wire up, delete old course state/effects, commit**

```bash
git add src/hooks/useCourseList.ts src/pages/Courses.tsx
git commit -m "refactor: extract useCourseList hook from Courses"
```

---

### Task 14: Extract useCourseSearch hook

**Files:** Create `src/hooks/useCourseSearch.ts`; Modify `src/pages/Courses.tsx`

- [ ] **Step 1: Identify search/filter logic**

Find: `searchTerm`, `debouncedSearch` (300ms debounce), filtered courses computation.

- [ ] **Step 2: Create the hook**

```ts
export function useCourseSearch(courses: CourseIndexItem[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // useEffect: 300ms debounce
  const filteredCourses = useMemo(() => { ... }, [courses, debouncedSearch]);

  return { searchTerm, setSearchTerm, filteredCourses };
}
```

- [ ] **Step 3: Wire up, delete old search state, commit**

```bash
git add src/hooks/useCourseSearch.ts src/pages/Courses.tsx
git commit -m "refactor: extract useCourseSearch hook from Courses"
```

---

### Task 15: Extract CourseCard to its own file

**Files:** Create `src/pages/CourseCard.tsx`; Modify `src/pages/Courses.tsx`

- [ ] **Step 1: Identify CourseCard (~300 lines, currently inline function in Courses.tsx)**

It's already a separate function but defined inside the same file. Move it to its own file with explicit typed props.

- [ ] **Step 2: Move to own file, add explicit Props interface**

```tsx
interface CourseCardProps {
  course: CourseIndexItem;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onExportScorm: (id: string) => void;
  onDelete: (id: string) => void;
  onCoverUpload: (id: string, file: File) => void;
  onToggleVisibility: (id: string) => void;
}
```

- [ ] **Step 3: Also move DropItem helper and EmptyState if they exist as inline functions**

- [ ] **Step 4: Build, test, commit**

```bash
git add src/pages/CourseCard.tsx src/pages/Courses.tsx
git commit -m "refactor: extract CourseCard component from Courses"
```

---

### Task 16: Verify Courses.tsx line count

```bash
wc -l src/pages/Courses.tsx
```

Expected: ~250-300 lines.

---

## Phase D: Final Verification

### Task 17: Full build + test + line count audit

- [ ] **Step 1: Build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 2: Run all tests**

```bash
npm test 2>&1
cd mcp && npm test 2>&1 | tail -5
```

- [ ] **Step 3: Line count audit**

```bash
wc -l src/pages/Editor.tsx src/pages/View.tsx src/pages/Courses.tsx
```

Expected: all three under 300 lines.

- [ ] **Step 4: Count new files**

```bash
ls -1 src/hooks/ | wc -l
ls -1 src/pages/Editor*.tsx src/pages/View*.tsx src/pages/Course*.tsx
```

Expected: ~11 hooks, ~6 extracted page components.

- [ ] **Step 5: Visual verify**

Open the app. Test: editor (add block, undo, save), viewer (navigate lessons, answer quiz), courses page (search, create, delete). All functionality preserved.
