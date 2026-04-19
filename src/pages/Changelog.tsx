import { AppShell } from "@/components/AppShell";

interface Entry {
  date: string;
  label: string;
  type: "feat" | "fix" | "refactor" | "design" | "test" | "docs";
  items: string[];
}

const entries: Entry[] = [
  {
    date: "2026-04-19",
    label: "Consistency Foundation",
    type: "design",
    items: [
      "Added --tl-accent-border, --tl-accent-border-soft, --tl-sans, --tl-display, --tl-hair tokens",
      "Default palette switched to warm paper neutrals (canvas #f7f6f1, sidebar #faf9f4); learner header pinned to --sidebar-3",
      "BlockItem: replaced nested <button> with div[role=button] + keyboard handler (a11y fix)",
      "Canvas: removed redundant lesson-header bar; 'Remove lesson' moved to sidebar hover ✕ button",
      "Canvas max-width nesting flattened; AddBlockRow divider tokenised to --tl-accent-border-soft",
      "BlockInspector footer: emoji glyphs replaced with Lucide icons (ArrowUp, ArrowDown, Copy, Trash2)",
      "Empty canvas state: Sparkles icon + heading + /kbd keyboard hint",
    ],
  },
  {
    date: "2026-04-10",
    label: "Landing Page — Smooth Scroll",
    type: "feat",
    items: [
      "\"See what it does\" CTA now smooth-scrolls to the features section instead of jumping",
    ],
  },
  {
    date: "2026-03-26",
    label: "Phase 3A — Workflow Guidance Layer",
    type: "docs",
    items: [
      "9-step instructional design workflow (phase-3-workflow.md)",
      "Step 4: block skeleton selection guide",
      "Step 6: per-block field rules and feedback guide",
      "Step 7: MCP schema reference (step7-mcp-reference.md)",
      "Session boundary, media sourcing, and approval gate guidance",
      "Audit re-run rules and assessment question type guidance",
    ],
  },
  {
    date: "2026-03-25",
    label: "RC4 — Page Component Refactoring",
    type: "refactor",
    items: [
      "Editor.tsx decomposed into hooks and sub-components (873 → 380 lines)",
      "View.tsx decomposed — 4 hooks, ViewSidebar, ViewBottomNav extracted",
      "Courses.tsx decomposed into hooks and CourseCard (775 → 144 lines)",
      "11 custom hooks extracted across all three page components",
    ],
  },
  {
    date: "2026-03-25",
    label: "RC3 — Block Modernisation",
    type: "design",
    items: [
      "All block view and editor form components migrated from inline hex styles to Tailwind + CSS vars",
      "Quiz, TrueFalse, ShortAnswer, Callout, Document views migrated",
      "QuizForm, TrueFalseForm, ShortAnswerForm, ImageForm, VideoForm, AudioForm, DocumentForm migrated",
      "Quiz semantic colour tokens added to index.css (correct, incorrect, neutral)",
    ],
  },
  {
    date: "2026-03-25",
    label: "RC2 — Frontend Test Suite",
    type: "test",
    items: [
      "116 Vitest tests across 9 files",
      "Unit tests: courses.ts (CRUD, migration, roundtrip), assessment.ts (Leitner algorithm), scorm12.ts",
      "Component tests: QuizView interaction flow, CalloutView ARIA, AssessmentEditor delete dialog",
      "Integration tests: SCORM export zip, editor save/load roundtrip, viewer progress tracking",
      "Vitest + Testing Library setup added",
    ],
  },
  {
    date: "2026-03-25",
    label: "RC1 — Accessibility & UX Polish",
    type: "fix",
    items: [
      "Replaced window.confirm with accessible AlertDialog in AssessmentEditor",
      "Replaced window.prompt with accessible Dialog for link insertion",
      "Added keyboard support and focus management to HotspotForm image interaction",
      "aria-live regions added to all quiz and assessment result announcements",
      "Non-colour indicators (checkmarks) added to per-item quiz feedback",
      "Focus managed correctly after lesson navigation in viewer",
    ],
  },
  {
    date: "2026-03-25",
    label: "Phase 2B — Assessment Question Types",
    type: "feat",
    items: [
      "3 new block types: Multiple Response, Fill-in-the-Blank, Matching",
      "4 new question types for assessment lessons: multipleresponse, fillinblank, matching, sorting",
      "AssessmentQuestion migrated to discriminated union (kind field)",
      "Phase 2A validation catch-up: FieldLabel required, Zod schema tightening",
      "Full MCP tool support for all new question types",
    ],
  },
  {
    date: "2026-03-25",
    label: "Phase 2A+ — MCP Cleanup",
    type: "fix",
    items: [
      "Fixed sortingBlockSchema definition",
      "Extended injectSubItemIds for all Phase 2A complex block types",
      "Added renderBlock support for all Phase 2A types in preview tool",
      "Fixed update_assessment_config silent no-op bug",
      "Updated tool descriptions and instructions resource",
      "238 MCP Vitest tests added",
    ],
  },
  {
    date: "2026-03-24",
    label: "Phase 2A Tier 3 — Interactive Blocks",
    type: "feat",
    items: [
      "Sorting block: drag-and-drop ordering interaction",
      "Hotspot block: labelled image with clickable zones",
      "Branching block: scenario-based decision trees",
      "Full MCP tool support for all three block types",
    ],
  },
  {
    date: "2026-03-24",
    label: "Phase 2A Tier 2 — Standard Blocks",
    type: "feat",
    items: [
      "Timeline block: chronological event sequence",
      "Process block: numbered step-by-step guide",
      "Chart block: bar, line, and pie charts via Recharts",
      "Full MCP tool support for all three block types",
    ],
  },
  {
    date: "2026-03-24",
    label: "Phase 2A Tier 1 — Content Blocks",
    type: "feat",
    items: [
      "Button/CTA block: configurable call-to-action with URL",
      "Embed block: iframe embed for external content",
      "Flashcard block: flip-card with front/back faces",
      "Full MCP tool support for all three block types",
    ],
  },
  {
    date: "2026-03-24",
    label: "Gunmetal UI Overhaul",
    type: "design",
    items: [
      "Full Gunmetal design system: blue-grey sidebar, off-white canvas, mint accent",
      "AppShell, Auth, Settings pages redesigned",
      "Design token migration — removed .card-surface, .text-gradient, --color-teal-*",
      "Brand accent moved to var(--accent-hex) (#40c8a0)",
      "Accessibility hardening pass across all redesigned components",
    ],
  },
  {
    date: "2026-03-23",
    label: "A.5 — Courses Page Overhaul",
    type: "design",
    items: [
      "Courses.tsx migrated from style objects to Tailwind",
      "Responsive card grid layout",
      "Cover image aspect ratio fixed",
      "Empty state design added",
    ],
  },
  {
    date: "2026-03-23",
    label: "A.4 — Landing Page Overhaul",
    type: "design",
    items: [
      "Landing page migrated from inline styles to Tailwind",
      "Removed gradient text, glow effects, and monospace chips",
      "Responsive hero and feature grid",
      "Typography and brand voice tightened",
    ],
  },
  {
    date: "2026-03-23",
    label: "A.3 — Viewer Overhaul",
    type: "design",
    items: [
      "View.tsx migrated from inline styles to Tailwind",
      "Reading layout with correct max-width and line length",
      "Progress bar and lesson navigation redesigned",
      "P0/P1 accessibility issues fixed",
    ],
  },
  {
    date: "2026-03-23",
    label: "A.2 — Editor Overhaul",
    type: "design",
    items: [
      "Editor.tsx migrated from inline styles to Tailwind",
      "Block editor chrome, sidebar, and canvas spacing redesigned",
      "Responsive layout added",
      "P0/P1 accessibility issues fixed",
    ],
  },
  {
    date: "2026-03-23",
    label: "A.1 — Cross-cutting Foundations",
    type: "design",
    items: [
      "Design tokens established in index.css (layout vars, colour vars)",
      "Body font swapped from Inter to DM Sans",
      "Lora (serif) added as display font",
      "Skip-to-content link added in App.tsx",
      "Removed unused legacy utility classes",
    ],
  },
  {
    date: "2026-03-22",
    label: "Validation & Mandatory Fields",
    type: "feat",
    items: [
      "Zod schemas tightened — required fields enforced at parse time",
      "FieldLabel component added with required indicator",
      "Publish-time validation warnings in the editor",
      "MCP review gaps and preview placeholders addressed",
    ],
  },
  {
    date: "2026-03-22",
    label: "Block Form UX Polish",
    type: "feat",
    items: [
      "Quiz editor: add/remove answer options dynamically",
      "Shared FieldLabel component introduced across all editor forms",
      "Feedback shown for both correct and incorrect outcomes",
      "Error toasts added for failed save operations",
    ],
  },
  {
    date: "2026-03-22",
    label: "Inline Previews",
    type: "feat",
    items: [
      "Inline image preview in ImageForm editor",
      "Inline video preview in VideoForm editor",
      "Shared video URL utility extracted",
    ],
  },
  {
    date: "2026-03-22",
    label: "MCP Auth Fix & Stress Tests",
    type: "fix",
    items: [
      "MCP login page replaced with redirect to app's Google OAuth flow",
      "≥120 Vitest tests added covering all 33 MCP tools",
      "10-scenario agentic stress-test playbook written",
    ],
  },
  {
    date: "2026-03-21",
    label: "MCP Instructions & Documentation Fixes",
    type: "docs",
    items: [
      "Assessment section added to MCP instructions resource",
      "HTML field rule corrected (text fields accept HTML)",
      "All broken tool name references fixed",
      "save_course example added with correct field names",
    ],
  },
  {
    date: "2026-03-21",
    label: "MCP UX & Capability Gaps",
    type: "feat",
    items: [
      "Course view URLs surfaced in MCP responses",
      "Targeted block editing tools added",
      "Course analysis output corrected",
      "Assessment content made visible in preview tool",
    ],
  },
  {
    date: "2026-03-21",
    label: "MCP Schema & Runtime Bug Fixes",
    type: "fix",
    items: [
      "Fixed broken save_course tool",
      "Added missing document block support to MCP",
      "Fixed data-destroying restructure_course behaviour",
      "Eight runtime bugs resolved across MCP tools",
    ],
  },
  {
    date: "2026-03-21",
    label: "Post-assessment Audit Fixes",
    type: "fix",
    items: [
      "All Critical and Important issues from post-assessment code review resolved",
      "Two minor quality improvements applied",
    ],
  },
  {
    date: "2026-03-20",
    label: "MCP Instructions Overhaul",
    type: "docs",
    items: [
      "Session-level instructions surfaced on MCP connection",
      "Tool descriptions rewritten for clarity",
      "Wrong tool names in instructions resource corrected",
      "update_block HTML rule corrected",
    ],
  },
  {
    date: "2026-03-19",
    label: "Smart Assessment Lesson",
    type: "feat",
    items: [
      "New AssessmentLesson lesson type with Leitner spaced-repetition algorithm",
      "Lesson union type: ContentLesson | AssessmentLesson (discriminated by kind)",
      "Assessment editor with form-based question authoring",
      "Full-screen assessment viewer integrated into course flow",
      "New MCP tools: add_assessment_lesson, add_question, update_assessment_config",
      "SCORM export updated to skip assessment lessons",
    ],
  },
  {
    date: "2026-03-18",
    label: "Plan 3 — Undo/Redo",
    type: "feat",
    items: [
      "Full undo/redo history in the course editor (Ctrl+Z / Ctrl+Y)",
      "useUndoRedo hook with 50-snapshot cap and debounce",
      "Undo/redo toolbar buttons added to editor",
    ],
  },
  {
    date: "2026-03-18",
    label: "Plan 2 — Block Authoring",
    type: "feat",
    items: [
      "Feedback toggle added to Quiz, True/False, and Short Answer blocks",
      "Direct file upload added to Image, Video, and Audio block editors",
      "New Document block: PDF/DOCX/XLSX/PPTX embed (Office Online viewer)",
      "Media bundled into SCORM and static web exports",
      "Shared upload.ts utility for Supabase Storage",
    ],
  },
  {
    date: "2026-03-18",
    label: "Plan 1 — Course Management",
    type: "feat",
    items: [
      "Cover images on courses (uploaded to course-media Supabase bucket)",
      "Visibility toggle (public/private) on each course card",
      "Course duplication working end-to-end for local and cloud-saved courses",
    ],
  },
];

const typeStyles: Record<Entry["type"], { bg: string; color: string }> = {
  feat:     { bg: "var(--accent-bg)",       color: "var(--accent-hex)" },
  fix:      { bg: "hsl(var(--muted))",       color: "var(--ink)"        },
  refactor: { bg: "rgba(16,185,129,0.10)",   color: "#059669"           },
  design:   { bg: "rgba(139,92,246,0.12)",   color: "#8b5cf6"           },
  test:     { bg: "rgba(245,158,11,0.12)",   color: "#d97706"           },
  docs:     { bg: "rgba(59,130,246,0.12)",   color: "#3b82f6"           },
};

// Group entries by date for display
const groupedByDate = entries.reduce<{ date: string; entries: Entry[] }[]>((acc, entry) => {
  const existing = acc.find((g) => g.date === entry.date);
  if (existing) {
    existing.entries.push(entry);
  } else {
    acc.push({ date: entry.date, entries: [entry] });
  }
  return acc;
}, []);

export default function Changelog() {
  return (
    <AppShell
      topBar={
        <span className="font-display text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
          Changelog
        </span>
      }
    >
      <div className="px-8 py-8 max-w-[720px]">
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          All changes to TideLearn, in reverse chronological order.
        </p>

        <div className="space-y-10">
          {groupedByDate.map(({ date, entries: dayEntries }) => (
            <div key={date}>
              {/* Date heading */}
              <div
                className="text-[11px] font-bold uppercase tracking-wide pb-2 mb-4 border-b font-mono"
                style={{ color: "var(--text-muted)", borderColor: "hsl(var(--border))" }}
              >
                {date}
              </div>

              <div className="space-y-5">
                {dayEntries.map((entry) => {
                  const style = typeStyles[entry.type];
                  return (
                    <div key={entry.label}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {entry.type}
                        </span>
                        <span className="font-display text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                          {entry.label}
                        </span>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {entry.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
                            <span className="text-sm leading-snug" style={{ color: "var(--ink)" }}>
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
