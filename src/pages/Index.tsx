import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

/* ─── Nav ─────────────────────────────────────────────── */
function Nav({ user, signOut }: { user: User | null; signOut: () => Promise<void> }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNav();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, closeNav]);

  const navLinkClasses =
    "text-[var(--accent-hex)] text-sm font-medium no-underline hover:text-[var(--accent-hex)]/80 transition-colors";
  const authBtnClasses =
    "border-[1.5px] border-[var(--accent-hex)] rounded-lg bg-transparent text-[var(--accent-hex)] text-sm font-medium cursor-pointer hover:bg-[var(--accent-hex)] hover:text-white transition-colors";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 py-4 bg-gradient-to-b from-[var(--sidebar-3)]/95 to-transparent backdrop-blur-sm">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-hex)] flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-base leading-none">T</span>
        </div>
        <span className="font-sans font-extrabold text-lg text-white tracking-tight">
          TideLearn
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-7">
        <Link to="/courses" className={navLinkClasses}>
          My Courses
        </Link>
        <a href="#features" className={navLinkClasses}>
          Features
        </a>
        {user ? (
          <button onClick={signOut} className={`${authBtnClasses} px-4 py-1.5`}>
            Sign Out
          </button>
        ) : (
          <Link to="/auth" className={`${authBtnClasses} px-4 py-1.5 no-underline inline-block`}>
            Sign In
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 text-white bg-transparent border-none cursor-pointer"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileNavOpen}
      >
        {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-[var(--sidebar-3)]/95 backdrop-blur-sm flex flex-col items-center gap-6 pt-12">
          <Link to="/courses" className={`${navLinkClasses} text-lg`} onClick={closeNav}>
            My Courses
          </Link>
          <a href="#features" className={`${navLinkClasses} text-lg`} onClick={closeNav}>
            Features
          </a>
          {user ? (
            <button
              onClick={() => { signOut(); closeNav(); }}
              className={`${authBtnClasses} px-6 py-2 text-base`}
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth"
              className={`${authBtnClasses} px-6 py-2 text-base no-underline inline-block`}
              onClick={closeNav}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

/* ─── Editor preview card (decorative) ───────────────────── */
function EditorCard() {
  return (
    <div className="max-w-[1000px] w-full mx-auto mt-16 rounded-2xl overflow-hidden border border-[var(--accent-hex)]/[0.18] shadow-[0_32px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(64,200,160,0.08)] bg-[var(--sidebar-3)] relative z-[2]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#252c38] border-b border-white/[0.06]">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <div className="flex-1 ml-4 bg-white/[0.06] rounded-md px-3 py-1 font-sans text-xs text-[#cbd5e1]">
          tidelearn.app/view?id=intro-to-learning-design
        </div>
      </div>

      {/* Two-column body — sidebar hidden on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[320px]">
        {/* Sidebar — lesson list */}
        <div className="hidden md:block bg-[var(--sidebar-2)] border-r border-white/[0.06] py-5">
          <div className="px-4 pb-3 text-[11px] font-bold uppercase tracking-widest text-[#475569]">
            Course outline
          </div>
          {[
            { num: "01", title: "What is L&D?", active: false },
            { num: "02", title: "Adult learning theory", active: true },
            { num: "03", title: "Needs analysis", active: false },
            { num: "04", title: "Bloom's taxonomy", active: false },
            { num: "05", title: "SCORM & standards", active: false },
          ].map((lesson) => (
            <div
              key={lesson.num}
              className={`flex items-center gap-2.5 px-4 py-2 border-l-[3px] cursor-default ${
                lesson.active
                  ? "bg-[var(--accent-bg)] border-l-[var(--accent-hex)]"
                  : "bg-transparent border-l-transparent"
              }`}
            >
              <span className="text-[10px] text-[#475569] font-mono">
                {lesson.num}
              </span>
              <span
                className={`text-[13px] ${
                  lesson.active ? "text-[#e0fdf4] font-semibold" : "text-[#cbd5e1]"
                }`}
              >
                {lesson.title}
              </span>
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="p-7 md:px-8 flex flex-col gap-4">
          <div className="text-[11px] font-bold text-[var(--accent-hex)] uppercase tracking-widest">
            Lesson 02
          </div>
          <div className="text-xl md:text-[22px] font-extrabold text-[#e0fdf4] font-serif leading-snug">
            Adult learning theory
          </div>
          <div className="text-sm text-[#cbd5e1] leading-relaxed max-w-[480px]">
            Adults learn differently from children. Andragogy — the art and science of helping adults learn — focuses on self-direction, experience, and relevance to real-world problems.
          </div>

          {/* Quiz block */}
          <div className="mt-2 bg-[var(--accent-bg)] border border-[var(--accent-hex)]/20 rounded-[10px] px-5 py-4">
            <div className="text-[11px] font-bold text-[var(--accent-hex)] uppercase tracking-wider mb-2.5">
              Knowledge check
            </div>
            <div className="text-sm text-[#e2e8f0] font-semibold mb-3">
              Which term describes the science of helping adults learn?
            </div>
            {["Pedagogy", "Andragogy", "Didactics", "Heutagogy"].map((opt, i) => (
              <div
                key={opt}
                className={`flex items-center gap-2.5 px-3 py-1.5 mb-1.5 rounded-md cursor-default ${
                  i === 1
                    ? "bg-[var(--accent-bg)] border border-[var(--accent-hex)]/[0.35]"
                    : "bg-white/[0.04] border border-white/[0.07]"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    i === 1 ? "border-4 border-[var(--accent-hex)]" : "border-2 border-[#475569]"
                  }`}
                />
                <span className={`text-[13px] ${i === 1 ? "text-[#e0fdf4]" : "text-[#cbd5e1]"}`}>
                  {opt}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Wave divider SVG ─────────────────────────────────── */
function WaveDivider() {
  return (
    <div className="leading-none bg-[var(--sidebar-3)] -mt-px">
      <svg
        viewBox="0 0 1440 80"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

/* ─── Feature row ─────────────────────────────────────── */
const FEATURES = [
  {
    num: "01",
    title: "Block-based editing",
    desc: "Compose lessons from headings, text, images, and quizzes. Drag, drop, reorder — no code needed.",
    visual: "Drag · Drop · Reorder",
  },
  {
    num: "02",
    title: "Instant publish",
    desc: "One click to get a shareable URL. Embed it on Google Sites or share it directly with learners.",
    visual: "tidelearn.app/view?id=…",
  },
  {
    num: "03",
    title: "SCORM 1.2 export",
    desc: "Download a standards-compliant SCORM package and upload it to any LMS — Moodle, Canvas, Talent LMS.",
    visual: "course.zip",
  },
  {
    num: "04",
    title: "Cloud sync",
    desc: "Every change is saved to the cloud automatically. Pick up where you left off on any device.",
    visual: "Auto-saved",
  },
  {
    num: "05",
    title: "Build with LLMs via MCP",
    desc: "Use Claude or any MCP-compatible agent to generate, revise, and restructure courses at scale.",
    visual: "mcp://tidelearn/generate",
  },
];

function FeatureRow({
  num,
  title,
  desc,
  visual,
  last,
}: {
  num: string;
  title: string;
  desc: string;
  visual: string;
  last: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] gap-6 md:gap-8 items-start py-9 ${
        last ? "" : "border-b border-[#f0fdf9]"
      }`}
    >
      {/* Number */}
      <div className="font-serif text-5xl font-black text-[var(--accent-hex)] leading-none pt-1">
        {num}
      </div>

      {/* Title + desc */}
      <div>
        <div className="font-sans text-xl font-extrabold text-[var(--ink)] mb-2">
          {title}
        </div>
        <div className="text-[15px] text-[#475569] leading-relaxed">
          {desc}
        </div>
      </div>

      {/* Visual chip */}
      <div className="font-sans text-sm font-medium bg-[var(--canvas-2)] text-[var(--ink)] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] w-fit">
        {visual}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────── */
const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="font-sans">
      <Nav user={user} signOut={signOut} />

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="min-h-screen overflow-hidden relative bg-gradient-to-b from-[var(--sidebar-3)] via-[#252c38] to-[var(--sidebar-3)]">
        {/* Subtle horizontal line texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 40px)",
          }}
        />

        {/* Content */}
        <main id="main-content" className="relative z-[1] flex flex-col items-center text-center pt-32 md:pt-40 pb-0 px-6 md:px-14">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-hex)]/30 mb-7">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--accent-hex)] shrink-0" />
            <span className="text-[11px] text-[var(--accent-hex)] font-medium tracking-widest uppercase">
              Personal e-learning authoring tool
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] max-w-[820px] mb-6">
            Build courses the tide{" "}
            <em className="text-[var(--accent-hex)] not-italic font-semibold">
              brings in.
            </em>
          </h1>

          {/* Subhead */}
          <p className="text-lg text-slate-400 max-w-[520px] leading-relaxed mb-9">
            Block-based authoring, instant shareable URL,{" "}
            <strong className="text-slate-300">SCORM export</strong>. Built by
            an L&amp;D professional, for L&amp;D professionals.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/courses"
              className="inline-block px-7 py-3 rounded-[10px] bg-[var(--accent-hex)] text-white font-bold text-[15px] no-underline shadow-lg hover:shadow-xl transition-shadow"
            >
              Start authoring <span aria-hidden="true">&rarr;</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-block px-7 py-3 rounded-[10px] border-[1.5px] border-[var(--accent-hex)]/40 text-[var(--accent-hex)] font-semibold text-[15px] no-underline bg-transparent hover:bg-[var(--accent-bg)] transition-colors cursor-pointer"
            >
              See what it does <span aria-hidden="true">&darr;</span>
            </button>
          </div>

          {/* Editor preview card */}
          <EditorCard />
        </main>
      </section>

      {/* ── Wave divider ───────────────────────────────── */}
      <WaveDivider />

      {/* ── Features ─────────────────────────────────── */}
      <section
        id="features"
        className="bg-white px-6 md:px-14 py-16 md:py-24 relative"
      >
        {/* 4px accent top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-hex)]" />

        <div className="max-w-[1000px] mx-auto">
          {/* Section title */}
          <h2 className="font-serif text-3xl md:text-[44px] font-bold text-[var(--ink)] tracking-tight leading-snug mb-14">
            Everything you need.{" "}
            <span className="text-[#64748b] font-normal">
              Nothing you don't.
            </span>
          </h2>

          {/* Feature rows */}
          {FEATURES.map((f, i) => (
            <FeatureRow
              key={f.num}
              {...f}
              last={i === FEATURES.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-[var(--sidebar-3)] px-6 md:px-14 py-8 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-[var(--accent-hex)] flex items-center justify-center">
            <span className="text-white font-extrabold text-sm leading-none">T</span>
          </div>
          <span className="font-bold text-[15px] text-white">
            TideLearn
          </span>
        </div>
        <span className="text-[13px] text-[#475569]">
          A personal project by Theo Navarro · &copy; {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
};

export default Index;
