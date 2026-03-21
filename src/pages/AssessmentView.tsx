import { useState, useMemo } from "react";
import type { AssessmentLesson } from "@/types/course";
import {
  generateStudySession,
  generateExamSession,
  generateWeakAreaSession,
  advanceBox,
  shuffle,
} from "@/lib/assessment";
import { useAssessmentProgress } from "@/hooks/useAssessmentProgress";

type Screen = "home" | "study" | "exam" | "results" | "drill" | "notebook";

type Props = {
  lesson: AssessmentLesson;
  courseId: string;
};

export function AssessmentView({ lesson, courseId }: Props) {
  const { progress, updateQuestion, addSession } = useAssessmentProgress(courseId, lesson.id);
  const [screen, setScreen] = useState<Screen>("home");
  const [queue, setQueue] = useState<typeof lesson.questions>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState<"low" | "med" | "high" | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [mode, setMode] = useState<"study" | "exam">("study");

  const seenCount = Object.values(progress.questions).filter((p) => p.testCount > 0).length;
  const canDrill = seenCount >= 10;
  const examSize = lesson.config.examSize ?? 20;
  const passingScore = lesson.config.passingScore ?? 80;
  const lastSession = progress.sessionHistory[progress.sessionHistory.length - 1];

  function startStudy() {
    const q = generateStudySession(lesson.questions, progress.questions);
    if (q.length === 0) {
      alert("No questions are due for review right now. Come back after answering some!");
      return;
    }
    setQueue(shuffle(q));
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("study");
    setScreen("study");
  }

  function startExam() {
    const q = generateExamSession(lesson.questions, examSize);
    if (q.length === 0) {
      alert("No questions in the bank yet.");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("exam");
    setScreen("exam");
  }

  function startDrill() {
    const q = generateWeakAreaSession(lesson.questions, progress.questions, 20);
    if (q.length === 0) {
      alert("No weak-area data yet. Answer some questions first!");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setMode("study");
    setScreen("drill");
  }

  const currentQ = queue[qIndex];

  function handleReveal() {
    if (selected === null) return;
    if (mode === "study" && confidence === null) return;
    setRevealed(true);
    const correct = selected === currentQ.correctIndex;
    if (correct) setSessionCorrect((n) => n + 1);
    updateQuestion(currentQ.id, (p) => advanceBox(p, correct, confidence ?? undefined));
  }

  function handleNext() {
    if (qIndex + 1 >= queue.length) {
      // sessionCorrect was already incremented in handleReveal when the last answer was correct.
      // Do NOT add (selected === currentQ.correctIndex ? 1 : 0) here — that double-counts.
      const score = Math.round((sessionCorrect / queue.length) * 100);
      addSession({ score, date: Date.now(), mode });
      setScreen("results");
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setConfidence(null);
    }
  }

  // Both useMemos must be at top level — Rules of Hooks forbids calling them inside conditionals.
  // resultsScore and bloomBreakdown are only *used* in the results screen, but must be declared here.
  const resultsScore = useMemo(() => {
    if (screen !== "results") return 0;
    return Math.round((sessionCorrect / queue.length) * 100);
  }, [screen, sessionCorrect, queue.length]);

  const bloomBreakdown = useMemo(() => {
    if (screen !== "results") return null;
    const tagged = queue.filter((q) => q.bloomLevel);
    if (tagged.length === 0) return null;
    const map: Record<string, { total: number; correct: number }> = {};
    for (const q of tagged) {
      const key = q.bloomLevel!;
      if (!map[key]) map[key] = { total: 0, correct: 0 };
      map[key].total++;
      const p = progress.questions[q.id];
      if (p && p.correctCount > 0) map[key].correct++;
    }
    return map;
  }, [screen, queue, progress]);

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily: "Inter, sans-serif",
  };

  const btnPrimary: React.CSSProperties = {
    background: "linear-gradient(135deg,#0d9488,#0891b2)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    padding: "10px 22px",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  const btnSecondary: React.CSSProperties = {
    background: "none",
    border: "1.5px solid #e0fdf4",
    borderRadius: 8,
    color: "#0d9488",
    fontSize: 14,
    fontWeight: 600,
    padding: "9px 20px",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  // ── Home ──────────────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 6 }}>
          Assessment
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0d2926", marginBottom: 4 }}>{lesson.title}</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
          {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
          {lastSession && ` · Last score: ${lastSession.score}%`}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          <button onClick={startStudy} style={btnPrimary}>Study (Leitner)</button>
          <button onClick={startExam} style={btnPrimary}>Exam Simulation</button>
          <button
            onClick={startDrill}
            disabled={!canDrill}
            style={{ ...btnSecondary, opacity: canDrill ? 1 : 0.4, cursor: canDrill ? "pointer" : "not-allowed" }}
          >
            Weak-Area Drill {!canDrill && `(answer ${10 - seenCount} more to unlock)`}
          </button>
          <button onClick={() => setScreen("notebook")} style={btnSecondary}>Mistake Notebook</button>
        </div>

        {progress.sessionHistory.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>
              Recent scores
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              {progress.sessionHistory.slice(-10).map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: 20,
                    height: Math.max(4, Math.round(s.score * 0.4)),
                    background: s.score >= passingScore ? "#14b8a6" : "#f87171",
                    borderRadius: 3,
                  }} />
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{s.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Study / Exam / Drill question screen ──────────────────────────────────
  if (screen === "study" || screen === "exam" || screen === "drill") {
    if (!currentQ) return null;
    const isStudy = mode === "study";
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            ← Back
          </button>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {qIndex + 1} / {queue.length}
          </span>
        </div>

        <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#0d2926", lineHeight: 1.55, margin: 0 }}>
            {currentQ.text}
          </p>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
          {currentQ.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === currentQ.correctIndex;
            let bg = "#fff", border = "1.5px solid #e0fdf4", color = "#334155";
            if (revealed && isCorrect) { bg = "#f0fdfb"; border = "1.5px solid #14b8a6"; color = "#0d9488"; }
            else if (isSelected) { bg = "#f8fffe"; border = "1.5px solid #5eead4"; color = "#0d9488"; }
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

        {isStudy && !revealed && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Confidence before revealing:</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["low", "med", "high"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfidence(c)}
                  style={{ padding: "5px 14px", border: confidence === c ? "2px solid #0d9488" : "1.5px solid #e0fdf4", borderRadius: 6, background: confidence === c ? "#f0fdfb" : "#fff", color: confidence === c ? "#0d9488" : "#64748b", fontSize: 12, fontWeight: confidence === c ? 700 : 400, cursor: "pointer", fontFamily: "Inter,sans-serif", textTransform: "capitalize" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {revealed && currentQ.feedback && (
          <div style={{ background: "#f0fdfb", border: "1px solid #ccfbf1", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#0d2926" }}>
            {currentQ.feedback}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!revealed ? (
            <button
              onClick={handleReveal}
              disabled={selected === null || (isStudy && confidence === null)}
              style={{ ...btnPrimary, opacity: (selected === null || (isStudy && confidence === null)) ? 0.4 : 1, cursor: (selected === null || (isStudy && confidence === null)) ? "not-allowed" : "pointer" }}
            >
              Check answer
            </button>
          ) : (
            <button onClick={handleNext} style={btnPrimary}>
              {qIndex + 1 >= queue.length ? "Finish" : "Next →"}
            </button>
          )}
          {revealed && (
            <span style={{ fontSize: 13, fontWeight: 600, color: selected === currentQ.correctIndex ? "#0d9488" : "#ef4444" }}>
              {selected === currentQ.correctIndex ? "Correct!" : "Incorrect"}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  // bloomBreakdown and resultsScore are declared at top level above (Rules of Hooks).
  if (screen === "results") {
    const passed = resultsScore >= passingScore;

    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: passed ? "#0d9488" : "#ef4444", lineHeight: 1 }}>
            {resultsScore}%
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: passed ? "#0d9488" : "#ef4444", marginTop: 6 }}>
            {passed ? "Passed" : "Not yet"}
          </div>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            {sessionCorrect} of {queue.length} correct · Passing: {passingScore}%
          </p>
        </div>

        {bloomBreakdown && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              Bloom's level breakdown
            </p>
            {Object.entries(bloomBreakdown).map(([level, { total, correct }]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: "#0d9488" }}>{level}</span>
                <div style={{ flex: 1, height: 8, background: "#e0fdf4", borderRadius: 4 }}>
                  <div style={{ width: `${Math.round((correct / total) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#0d9488,#0891b2)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, color: "#64748b", width: 50, textAlign: "right" }}>{correct}/{total}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setScreen("home")} style={btnPrimary}>Back to home</button>
          <button onClick={() => setScreen("notebook")} style={btnSecondary}>Mistake Notebook</button>
        </div>
      </div>
    );
  }

  // ── Mistake Notebook ───────────────────────────────────────────────────────
  if (screen === "notebook") {
    const missed = lesson.questions.filter((q) => {
      const p = progress.questions[q.id];
      return p && p.testCount > p.correctCount;
    });
    const byConfidence: Record<string, typeof missed> = { high: [], med: [], low: [], unknown: [] };
    for (const q of missed) {
      const key = progress.questions[q.id]?.lastMissConfidence ?? "unknown";
      byConfidence[key].push(q);
    }

    return (
      <div style={containerStyle}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif", marginBottom: 20, display: "block" }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0d2926", marginBottom: 4 }}>Mistake Notebook</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
          {missed.length} question{missed.length !== 1 ? "s" : ""} with at least one incorrect answer
        </p>

        {missed.length === 0 && (
          <p style={{ color: "#0d9488", fontSize: 14 }}>No mistakes yet — keep it up!</p>
        )}

        {(["high", "med", "low", "unknown"] as const).map((conf) => {
          const qs = byConfidence[conf];
          if (!qs.length) return null;
          const labels = { high: "High confidence misses", med: "Medium confidence misses", low: "Low confidence misses", unknown: "Other misses" };
          return (
            <div key={conf} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                {labels[conf]}
              </p>
              {qs.map((q) => (
                <div key={q.id} style={{ background: "#fff", border: "1.5px solid #fecaca", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2926", margin: "0 0 6px" }}>{q.text}</p>
                  <p style={{ fontSize: 12, color: "#0d9488", margin: 0 }}>✓ {q.options[q.correctIndex]}</p>
                  {q.feedback && <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", fontStyle: "italic" }}>{q.feedback}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
