import { AppShell } from "@/components/AppShell";

interface Release {
  version: string;
  date: string;
  title: string;
  items: { tag: "feat" | "fix" | "design" | "docs" | "test" | "refactor"; text: string }[];
}

const releases: Release[] = [
  {
    version: "Phase 3A",
    date: "March 2026",
    title: "Workflow Guidance Layer",
    items: [
      { tag: "feat", text: "9-step instructional design workflow in docs/" },
      { tag: "feat", text: "Block planning guide (step 4) with skeleton selection" },
      { tag: "feat", text: "Per-block field rules and feedback guide (step 6)" },
      { tag: "docs", text: "MCP schema reference document (step 7)" },
      { tag: "docs", text: "Session boundary, media sourcing, and approval gate guidance" },
    ],
  },
  {
    version: "RC4",
    date: "February 2026",
    title: "Page Component Refactoring",
    items: [
      { tag: "refactor", text: "Editor.tsx decomposed into hooks and sub-components (873 → 380 lines)" },
      { tag: "refactor", text: "View.tsx decomposed into hooks, ViewSidebar, and ViewBottomNav" },
      { tag: "refactor", text: "Courses.tsx decomposed into hooks and CourseCard (775 → 144 lines)" },
      { tag: "refactor", text: "11 custom hooks extracted across page components" },
    ],
  },
  {
    version: "RC3",
    date: "February 2026",
    title: "Block Modernisation",
    items: [
      { tag: "design", text: "All block components migrated from inline hex styles to Tailwind + CSS vars" },
      { tag: "design", text: "Quiz semantic colour tokens added (correct, incorrect, neutral)" },
      { tag: "design", text: "Editor form components (Image, Video, Audio, Document) migrated to Tailwind" },
    ],
  },
  {
    version: "RC2",
    date: "January 2026",
    title: "Frontend Test Suite",
    items: [
      { tag: "test", text: "116 Vitest tests across 9 files" },
      { tag: "test", text: "Unit tests for courses.ts, assessment.ts, scorm12.ts" },
      { tag: "test", text: "Component tests for QuizView, CalloutView, AssessmentEditor" },
      { tag: "test", text: "Integration tests for SCORM export, editor save/load, viewer progress" },
    ],
  },
  {
    version: "RC1",
    date: "January 2026",
    title: "Accessibility & UX Polish",
    items: [
      { tag: "fix", text: "Replaced window.confirm / window.prompt with accessible dialogs" },
      { tag: "fix", text: "Added keyboard support to HotspotForm image interaction" },
      { tag: "fix", text: "aria-live regions on all quiz and assessment result announcements" },
      { tag: "fix", text: "Non-colour indicators (checkmarks) added to per-item quiz feedback" },
      { tag: "fix", text: "Focus managed correctly after lesson navigation in viewer" },
    ],
  },
  {
    version: "Phase 2B",
    date: "December 2025",
    title: "Assessment Question Types",
    items: [
      { tag: "feat", text: "3 new block types: Multiple Response, Fill-in-the-Blank, Matching" },
      { tag: "feat", text: "4 new question types: multipleresponse, fillinblank, matching, sorting" },
      { tag: "refactor", text: "AssessmentQuestion migrated to discriminated union (kind field)" },
      { tag: "fix", text: "Phase 2A validation catch-up: FieldLabel required, Zod schema tightening" },
    ],
  },
  {
    version: "Phase 2A+",
    date: "November 2025",
    title: "MCP Cleanup",
    items: [
      { tag: "fix", text: "Fixed sortingBlockSchema and extended injectSubItemIds for complex blocks" },
      { tag: "feat", text: "renderBlock support for all Phase 2A block types in preview tool" },
      { tag: "fix", text: "Fixed update_assessment_config silent no-op" },
      { tag: "test", text: "238 MCP Vitest tests added" },
    ],
  },
  {
    version: "Phase 2A",
    date: "October 2025",
    title: "New Block Types",
    items: [
      { tag: "feat", text: "Button/CTA, Embed, Flashcard, Timeline, Process, Chart blocks" },
      { tag: "feat", text: "Sorting, Hotspot, and Branching interactive blocks" },
      { tag: "feat", text: "Total of 29 registered block types" },
    ],
  },
  {
    version: "Gunmetal",
    date: "September 2025",
    title: "Gunmetal UI Overhaul",
    items: [
      { tag: "design", text: "Full dark-theme Gunmetal design system applied across the app" },
      { tag: "design", text: "AppShell, Auth, and Settings pages updated" },
      { tag: "design", text: "Design token migration — removed .card-surface, .text-gradient" },
      { tag: "fix", text: "Accessibility hardening pass" },
    ],
  },
  {
    version: "A.1–A.5",
    date: "August 2025",
    title: "Rockpool Audit",
    items: [
      { tag: "design", text: "A.1: Cross-cutting foundations — DM Sans body font, Lora display, CSS layout vars" },
      { tag: "design", text: "A.2: Editor overhaul — block editor chrome, sidebar, canvas spacing" },
      { tag: "design", text: "A.3: Viewer overhaul — reading layout, progress bar, lesson nav" },
      { tag: "design", text: "A.4: Landing page overhaul — hero, feature grid, brand voice" },
      { tag: "design", text: "A.5: Courses overhaul — course card grid, empty state, header" },
    ],
  },
];

const tagStyles: Record<Release["items"][number]["tag"], { bg: string; color: string; label: string }> = {
  feat:     { bg: "var(--accent-bg)",             color: "var(--accent-hex)",  label: "feat"     },
  fix:      { bg: "hsl(var(--muted))",             color: "var(--ink)",         label: "fix"      },
  design:   { bg: "rgba(139, 92, 246, 0.12)",      color: "#8b5cf6",            label: "design"   },
  docs:     { bg: "rgba(59, 130, 246, 0.12)",      color: "#3b82f6",            label: "docs"     },
  test:     { bg: "rgba(245, 158, 11, 0.12)",      color: "#d97706",            label: "test"     },
  refactor: { bg: "rgba(16, 185, 129, 0.10)",      color: "#059669",            label: "refactor" },
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
      <div className="px-8 py-8 max-w-[640px]">
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          A running record of releases and significant improvements to TideLearn.
        </p>

        <div className="space-y-8">
          {releases.map((release) => (
            <div key={release.version} className="relative pl-5 border-l" style={{ borderColor: "hsl(var(--border))" }}>
              {/* Timeline dot */}
              <div
                className="absolute -left-[5px] top-[5px] w-2.5 h-2.5 rounded-full border-2"
                style={{ background: "var(--canvas)", borderColor: "var(--accent-hex)" }}
              />

              {/* Header */}
              <div className="flex items-baseline gap-2.5 mb-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded font-mono"
                  style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}
                >
                  {release.version}
                </span>
                <span className="font-display text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                  {release.title}
                </span>
                <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {release.date}
                </span>
              </div>

              {/* Items */}
              <ul className="space-y-1.5">
                {release.items.map((item, i) => {
                  const style = tagStyles[item.tag];
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 font-mono"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                      <span className="text-sm leading-snug" style={{ color: "var(--ink)" }}>
                        {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs mt-10" style={{ color: "var(--text-muted)" }}>
          TideLearn is in active development. Versions reflect feature milestones, not semantic releases.
        </p>
      </div>
    </AppShell>
  );
}
