import { AppShell } from "@/components/AppShell";

interface Commit {
  datetime: string; // ISO-style display: "2026-03-25 17:08"
  type: "feat" | "fix" | "refactor" | "design" | "test" | "docs" | "chore";
  message: string;
}

interface Milestone {
  label: string;
  date: string; // completion date
  commits: Commit[];
}

const milestones: Milestone[] = [
  {
    label: "Phase 3A — Workflow Guidance Layer",
    date: "2026-03-26",
    commits: [
      { datetime: "2026-03-26 17:25", type: "fix",   message: "Use 127.0.0.1 instead of localhost for auth callback URL" },
      { datetime: "2026-03-26 17:23", type: "docs",  message: "Add step7-mcp-reference.md to block type update checklist" },
      { datetime: "2026-03-26 17:22", type: "docs",  message: "Expand Step 4g assessment plan with per-target question planning" },
      { datetime: "2026-03-26 17:22", type: "docs",  message: "Update shortanswer guidance, add assessment question type section" },
      { datetime: "2026-03-26 17:21", type: "docs",  message: "Add session boundary guidance and step7 reference to workflow header" },
      { datetime: "2026-03-26 17:20", type: "docs",  message: "Add Step 8d audit re-run rule: user changes trigger re-run, audit fixes don't" },
      { datetime: "2026-03-26 17:20", type: "docs",  message: "Rewrite Step 7: mandate add_lesson+add_block, add MCP reference, error recovery" },
      { datetime: "2026-03-26 17:19", type: "docs",  message: "Add Step 6 build modes, per-lesson saves, approval gate, media sourcing" },
      { datetime: "2026-03-26 17:19", type: "docs",  message: "Expand Step 3 with research offer, media inventory, source extraction" },
      { datetime: "2026-03-26 17:18", type: "docs",  message: "Add step7-mcp-reference.md — MCP schema reference for workflow builds" },
    ],
  },
  {
    label: "RC4 — Page Component Refactoring",
    date: "2026-03-25",
    commits: [
      { datetime: "2026-03-25 22:03", type: "refactor", message: "Decompose Courses.tsx into hooks and CourseCard (775 → 144 lines)" },
      { datetime: "2026-03-25 22:00", type: "refactor", message: "Decompose View.tsx — extract 4 hooks and ViewSidebar/ViewBottomNav components" },
      { datetime: "2026-03-25 18:26", type: "refactor", message: "Decompose Editor.tsx into hooks and sub-components (873 → 380 lines)" },
    ],
  },
  {
    label: "RC3 — Block Modernisation",
    date: "2026-03-25",
    commits: [
      { datetime: "2026-03-25 17:43", type: "design", message: "Complete block component hex colour cleanup" },
      { datetime: "2026-03-25 17:38", type: "design", message: "Fix border token and dynamic display in editor form components" },
      { datetime: "2026-03-25 17:36", type: "design", message: "Migrate DocumentForm, AudioForm, VideoForm, ImageForm editor forms to Tailwind" },
      { datetime: "2026-03-25 17:35", type: "design", message: "Migrate ShortAnswerForm, TrueFalseForm, QuizForm editor forms to Tailwind" },
      { datetime: "2026-03-25 17:31", type: "design", message: "Migrate DocumentView block to Tailwind" },
      { datetime: "2026-03-25 17:27", type: "design", message: "Migrate ShortAnswer view to Tailwind + CSS vars" },
      { datetime: "2026-03-25 17:26", type: "design", message: "Migrate TrueFalse view to Tailwind + CSS vars" },
      { datetime: "2026-03-25 17:19", type: "design", message: "Migrate Quiz view from inline hex styles to Tailwind + CSS vars" },
      { datetime: "2026-03-25 17:15", type: "design", message: "Migrate Callout block from inline hex styles to Tailwind classes" },
      { datetime: "2026-03-25 17:12", type: "design", message: "Add quiz semantic colour tokens to CSS custom properties" },
    ],
  },
  {
    label: "RC2 — Frontend Test Suite",
    date: "2026-03-25",
    commits: [
      { datetime: "2026-03-25 17:08", type: "feat", message: "RC2 frontend test suite — 116 tests across 9 files" },
      { datetime: "2026-03-25 17:05", type: "test", message: "Integration test for viewer progress tracking" },
      { datetime: "2026-03-25 17:02", type: "test", message: "Integration test for SCORM export zip structure" },
      { datetime: "2026-03-25 16:59", type: "test", message: "Integration test for editor save/load roundtrip" },
      { datetime: "2026-03-25 16:49", type: "test", message: "Component tests for AssessmentEditor AlertDialog delete flow" },
      { datetime: "2026-03-25 16:44", type: "test", message: "Smoke tests for CalloutView ARIA and variants" },
      { datetime: "2026-03-25 16:43", type: "test", message: "Component tests for QuizView interaction flow" },
      { datetime: "2026-03-25 16:39", type: "test", message: "Unit tests for scorm12.ts pure helpers and zip structure" },
      { datetime: "2026-03-25 16:34", type: "test", message: "Unit tests for courses.ts (CRUD, migration, roundtrip)" },
      { datetime: "2026-03-25 16:31", type: "test", message: "Unit tests for assessment.ts Leitner algorithm and grading" },
      { datetime: "2026-03-25 16:26", type: "test", message: "Add Vitest + Testing Library setup for frontend tests" },
    ],
  },
  {
    label: "RC1 — Accessibility & UX Polish",
    date: "2026-03-25",
    commits: [
      { datetime: "2026-03-25 16:05", type: "fix", message: "Manage focus after lesson navigation in viewer" },
      { datetime: "2026-03-25 16:01", type: "fix", message: "Guard FillInBlankView indicators behind submitted state" },
      { datetime: "2026-03-25 16:00", type: "fix", message: "Add non-colour indicators (checkmarks) to per-item quiz feedback" },
      { datetime: "2026-03-25 15:57", type: "fix", message: "Add aria-live regions to all quiz and assessment result announcements" },
      { datetime: "2026-03-25 15:54", type: "fix", message: "Refactor HotspotForm keyboard handler to avoid synthetic event casting" },
      { datetime: "2026-03-25 15:52", type: "fix", message: "Add keyboard support to HotspotForm image interaction" },
      { datetime: "2026-03-25 15:49", type: "fix", message: "Replace window.prompt with accessible Dialog for link insertion" },
      { datetime: "2026-03-25 15:46", type: "fix", message: "Replace window.confirm with accessible AlertDialog in AssessmentEditor" },
    ],
  },
  {
    label: "Phase 2B — Assessment Question Types",
    date: "2026-03-25",
    commits: [
      { datetime: "2026-03-25 04:13", type: "feat", message: "Assessment question types — fillinblank, matching, sorting, multipleresponse" },
      { datetime: "2026-03-25 03:46", type: "feat", message: "Sorting question type, Phase 2A validation catch-up, full tests" },
      { datetime: "2026-03-25 03:37", type: "feat", message: "Fill-in-the-blank and matching block and question types" },
    ],
  },
];

const typeStyles: Record<Commit["type"], { bg: string; color: string }> = {
  feat:     { bg: "var(--accent-bg)",        color: "var(--accent-hex)" },
  fix:      { bg: "hsl(var(--muted))",        color: "var(--ink)"        },
  refactor: { bg: "rgba(16,185,129,0.10)",    color: "#059669"           },
  design:   { bg: "rgba(139,92,246,0.12)",    color: "#8b5cf6"           },
  test:     { bg: "rgba(245,158,11,0.12)",    color: "#d97706"           },
  docs:     { bg: "rgba(59,130,246,0.12)",    color: "#3b82f6"           },
  chore:    { bg: "hsl(var(--muted))",        color: "var(--text-muted)" },
};

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
          {milestones.map((milestone) => (
            <section key={milestone.label}>
              {/* Milestone header */}
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="font-display text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                  {milestone.label}
                </h2>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {milestone.date}
                </span>
              </div>

              <div
                className="rounded-md border overflow-hidden"
                style={{ borderColor: "hsl(var(--border))", background: "var(--canvas-white)" }}
              >
                {milestone.commits.map((commit, i) => {
                  const style = typeStyles[commit.type];
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      {/* Time */}
                      <span
                        className="text-[11px] font-mono flex-shrink-0 mt-0.5 w-[82px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {commit.datetime.split(" ")[1]}
                      </span>

                      {/* Type badge */}
                      <span
                        className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {commit.type}
                      </span>

                      {/* Message */}
                      <span className="text-sm leading-snug" style={{ color: "var(--ink)" }}>
                        {commit.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
