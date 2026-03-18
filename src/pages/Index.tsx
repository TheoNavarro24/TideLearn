import { useAuth } from "@/components/auth/AuthContext";
import { Link } from "react-router-dom";

/* ─── colour / style constants ─────────────────────────── */
const TEAL_GRAD = "linear-gradient(135deg, #14b8a6, #06b6d4)";
const TEAL_GRAD_TEXT = "linear-gradient(135deg, #14b8a6, #67e8f9)";
const OCEAN_DEEP = "#0a1f1c";

/* ─── Nav ─────────────────────────────────────────────── */
function Nav({ user, signOut }: { user: unknown; signOut: () => void }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 56px",
        background:
          "linear-gradient(180deg, rgba(10,31,28,0.95) 0%, transparent 100%)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: TEAL_GRAD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🌊
        </div>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}
        >
          TideLearn
        </span>
      </Link>

      {/* Right links */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Link
          to="/courses"
          style={{
            color: "#14b8a6",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          My Courses
        </Link>
        <a
          href="#features"
          style={{
            color: "#14b8a6",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Features
        </a>
        {user ? (
          <button
            onClick={signOut}
            style={{
              padding: "7px 18px",
              border: "1.5px solid #14b8a6",
              borderRadius: 8,
              background: "transparent",
              color: "#14b8a6",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        ) : (
          <Link
            to="/auth"
            style={{
              padding: "7px 18px",
              border: "1.5px solid #14b8a6",
              borderRadius: 8,
              color: "#14b8a6",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

/* ─── Editor preview card (decorative) ───────────────────── */
function EditorCard() {
  return (
    <div
      style={{
        maxWidth: 1000,
        width: "100%",
        margin: "0 auto",
        marginTop: 64,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(20,184,166,0.18)",
        boxShadow:
          "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.08)",
        background: "#0d1f1d",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          background: "#0a1a18",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ff5f57",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#febc2e",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#28c840",
          }}
        />
        <div
          style={{
            flex: 1,
            marginLeft: 16,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 12,
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          tidelearn.app/view?id=intro-to-learning-design
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 320 }}>
        {/* Sidebar — lesson list */}
        <div
          style={{
            background: "#0c1c1a",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 0",
          }}
        >
          <div
            style={{
              padding: "0 16px 12px",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#475569",
            }}
          >
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                background: lesson.active
                  ? "rgba(20,184,166,0.12)"
                  : "transparent",
                borderLeft: lesson.active
                  ? "3px solid #14b8a6"
                  : "3px solid transparent",
                cursor: "default",
              }}
            >
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                {lesson.num}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: lesson.active ? "#e0fdf4" : "#94a3b8",
                  fontWeight: lesson.active ? 600 : 400,
                }}
              >
                {lesson.title}
              </span>
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Lesson 02
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e0fdf4", fontFamily: "Lora, Georgia, serif", lineHeight: 1.3 }}>
            Adult learning theory
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, maxWidth: 480 }}>
            Adults learn differently from children. Andragogy — the art and science of helping adults learn — focuses on self-direction, experience, and relevance to real-world problems.
          </div>

          {/* Quiz block */}
          <div
            style={{
              marginTop: 8,
              background: "rgba(20,184,166,0.07)",
              border: "1px solid rgba(20,184,166,0.2)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Knowledge check
            </div>
            <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, marginBottom: 12 }}>
              Which term describes the science of helping adults learn?
            </div>
            {["Pedagogy", "Andragogy", "Didactics", "Heutagogy"].map((opt, i) => (
              <div
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 12px",
                  marginBottom: 6,
                  borderRadius: 6,
                  background: i === 1 ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.04)",
                  border: i === 1 ? "1px solid rgba(20,184,166,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: i === 1 ? "4px solid #14b8a6" : "2px solid #475569",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: i === 1 ? "#e0fdf4" : "#94a3b8" }}>
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
    <div style={{ lineHeight: 0, background: OCEAN_DEEP, marginTop: -2 }}>
      <svg
        viewBox="0 0 1440 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%" }}
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
    visual: "📦 course.zip",
  },
  {
    num: "04",
    title: "Cloud sync",
    desc: "Every change is saved to the cloud automatically. Pick up where you left off on any device.",
    visual: "☁ Auto-saved",
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
      style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 1fr",
        gap: 32,
        alignItems: "start",
        padding: "36px 0",
        borderBottom: last ? "none" : "1px solid #f0fdf9",
      }}
    >
      {/* Number */}
      <div
        style={{
          fontFamily: "Lora, Georgia, serif",
          fontSize: 48,
          fontWeight: 900,
          color: "#e0fdf4",
          lineHeight: 1,
          paddingTop: 4,
        }}
      >
        {num}
      </div>

      {/* Title + desc */}
      <div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: "#0f2e2b",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.7 }}>
          {desc}
        </div>
      </div>

      {/* Visual chip */}
      <div
        style={{
          background: "#f0fdf9",
          border: "1px solid #99f6e4",
          borderRadius: 10,
          padding: "14px 18px",
          fontFamily: "monospace",
          fontSize: 13,
          color: "#0f766e",
          fontWeight: 600,
        }}
      >
        {visual}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────── */
const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <Nav user={user} signOut={signOut} />

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          overflow: "hidden",
          position: "relative",
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 90% 20%, rgba(6,182,212,0.12) 0%, transparent 50%),
            linear-gradient(180deg, #0a1f1c 0%, #0d2d2a 50%, #0a2525 100%)
          `,
        }}
      >
        {/* Subtle horizontal line texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 40px)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingTop: 120,
            paddingBottom: 0,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          {/* Eyebrow pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(20,184,166,0.12)",
              border: "1px solid rgba(20,184,166,0.3)",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#14b8a6",
                boxShadow: "0 0 8px #14b8a6",
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: "11px", color: "#5eead4", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Personal e-learning authoring tool
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "Lora, Georgia, serif",
              fontSize: "clamp(42px, 7vw, 80px)",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              maxWidth: 820,
              margin: "0 0 24px",
            }}
          >
            Build courses the tide{" "}
            <em
              style={{
                fontStyle: "italic",
                background: TEAL_GRAD_TEXT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              brings in.
            </em>
          </h1>

          {/* Subhead */}
          <p
            style={{
              fontSize: 19,
              color: "#94a3b8",
              maxWidth: 520,
              lineHeight: 1.65,
              margin: "0 0 36px",
            }}
          >
            Block-based authoring, instant shareable URL,{" "}
            <strong style={{ color: "#cbd5e1" }}>SCORM export</strong>. Built by
            an L&amp;D professional, for L&amp;D professionals.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 64,
            }}
          >
            <Link
              to="/courses"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                borderRadius: 10,
                background: TEAL_GRAD,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 0 24px rgba(20,184,166,0.35), 0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              Start authoring →
            </Link>
            <a
              href="#features"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                borderRadius: 10,
                border: "1.5px solid rgba(20,184,166,0.4)",
                color: "#5eead4",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                background: "transparent",
              }}
            >
              See what it does ↓
            </a>
          </div>

          {/* Editor preview card */}
          <EditorCard />
        </div>
      </section>

      {/* ── Wave divider ───────────────────────────────── */}
      <WaveDivider />

      {/* ── Features ─────────────────────────────────── */}
      <section
        id="features"
        style={{
          background: "#fff",
          padding: "100px 56px",
          position: "relative",
        }}
      >
        {/* 4px teal top stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: TEAL_GRAD,
          }}
        />

        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Kicker */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 32,
                height: 3,
                borderRadius: 2,
                background: TEAL_GRAD,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#0f766e",
              }}
            >
              What it does
            </span>
          </div>

          {/* Section title */}
          <h2
            style={{
              fontFamily: "Lora, Georgia, serif",
              fontSize: 44,
              fontWeight: 700,
              color: "#0f2e2b",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              margin: "0 0 56px",
            }}
          >
            Everything you need.{" "}
            <span style={{ color: "#64748b", fontWeight: 400 }}>
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
      <footer
        style={{
          background: OCEAN_DEEP,
          padding: "32px 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: TEAL_GRAD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
            }}
          >
            🌊
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
            }}
          >
            TideLearn
          </span>
        </div>
        <span style={{ fontSize: 13, color: "#475569" }}>
          A personal project by Theo Navarro · © 2026
        </span>
      </footer>
    </div>
  );
};

export default Index;
