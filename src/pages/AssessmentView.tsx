import { useState, useMemo } from "react";
import type { AssessmentLesson, MCQQuestion } from "@/types/course";
import {
  generateStudySession,
  generateExamSession,
  generateWeakAreaSession,
  advanceBox,
  shuffle,
  gradeMultipleResponse,
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
  const [selectedMultiple, setSelectedMultiple] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState<"low" | "med" | "high" | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionCorrectIds, setSessionCorrectIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"study" | "exam">("study");

  const seenCount = Object.values(progress.questions).filter((p) => p.testCount > 0).length;
  const canDrill = seenCount >= 10;
  const examSize = lesson.config.examSize ?? 20;
  const passingScore = lesson.config.passingScore ?? 80;
  const lastSession = progress.sessionHistory[progress.sessionHistory.length - 1];

  function startStudy() {
    const q = generateStudySession(lesson.questions, progress.questions);
    if (q.length === 0) {
      setErrorMsg("No questions are due right now. Come back after answering some!");
      return;
    }
    setQueue(shuffle(q));
    setQIndex(0);
    setSelected(null);
    setSelectedMultiple([]);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setSessionCorrectIds(new Set());
    setMode("study");
    setErrorMsg(null);
    setScreen("study");
  }

  function startExam() {
    const q = generateExamSession(lesson.questions, examSize);
    if (q.length === 0) {
      setErrorMsg("No questions in the bank yet.");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setSelectedMultiple([]);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setSessionCorrectIds(new Set());
    setMode("exam");
    setErrorMsg(null);
    setScreen("exam");
  }

  function startDrill() {
    const q = generateWeakAreaSession(lesson.questions, progress.questions, 20);
    if (q.length === 0) {
      setErrorMsg("No weak-area data yet. Answer some questions first!");
      return;
    }
    setQueue(q);
    setQIndex(0);
    setSelected(null);
    setSelectedMultiple([]);
    setRevealed(false);
    setConfidence(null);
    setSessionCorrect(0);
    setSessionCorrectIds(new Set());
    setMode("study");
    setErrorMsg(null);
    setScreen("drill");
  }

  const currentQ = queue[qIndex];
  const currentQAsMcq = currentQ?.kind === "mcq" ? currentQ : null;

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
      correct = false;
    }

    if (correct) {
      setSessionCorrect((n) => n + 1);
      setSessionCorrectIds((prev) => new Set([...prev, currentQ.id]));
    }
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
      setSelectedMultiple([]);
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
    const tagged = queue.filter((q): q is MCQQuestion =>
      q.kind === "mcq" && !!q.bloomLevel
    );
    if (tagged.length === 0) return null;
    const map: Record<string, { total: number; correct: number }> = {};
    for (const q of tagged) {
      const key = q.bloomLevel!;
      if (!map[key]) map[key] = { total: 0, correct: 0 };
      map[key].total++;
      if (sessionCorrectIds.has(q.id)) map[key].correct++;
    }
    return map;
  }, [screen, queue, sessionCorrectIds]);

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily: "Inter, sans-serif",
  };

  const btnPrimary: React.CSSProperties = {
    background: "var(--accent-hex)",
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
    border: "1.5px solid hsl(var(--border))",
    borderRadius: 8,
    color: "var(--accent-hex)",
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
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-hex)", marginBottom: 6 }}>
          Assessment
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{lesson.title}</h1>
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

        {errorMsg && (
          <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>
            {errorMsg}
          </p>
        )}

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
                    background: s.score >= passingScore ? "var(--accent-hex)" : "#f87171",
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

        <div style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.55, margin: 0 }}>
            {currentQ.text}
          </p>
        </div>

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

        {isStudy && !revealed && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Confidence before revealing:</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["low", "med", "high"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfidence(c)}
                  style={{ padding: "5px 14px", border: confidence === c ? "2px solid var(--accent-hex)" : "1.5px solid hsl(var(--border))", borderRadius: 6, background: confidence === c ? "var(--accent-bg)" : "#fff", color: confidence === c ? "var(--accent-hex)" : "#64748b", fontSize: 12, fontWeight: confidence === c ? 700 : 400, cursor: "pointer", fontFamily: "Inter,sans-serif", textTransform: "capitalize" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {revealed && currentQ.feedback && (
          <div style={{ background: "var(--accent-bg)", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--ink)" }}>
            {currentQ.feedback}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!revealed ? (
            <button
              onClick={handleReveal}
              disabled={
                (currentQ.kind === "mcq" ? selected === null : false) ||
                (currentQ.kind === "multipleresponse" ? selectedMultiple.length === 0 : false) ||
                (isStudy && confidence === null)
              }
              style={{ ...btnPrimary, opacity: ((currentQ.kind === "mcq" ? selected === null : false) || (currentQ.kind === "multipleresponse" ? selectedMultiple.length === 0 : false) || (isStudy && confidence === null)) ? 0.4 : 1, cursor: ((currentQ.kind === "mcq" ? selected === null : false) || (currentQ.kind === "multipleresponse" ? selectedMultiple.length === 0 : false) || (isStudy && confidence === null)) ? "not-allowed" : "pointer" }}
            >
              Check answer
            </button>
          ) : (
            <button onClick={handleNext} style={btnPrimary}>
              {qIndex + 1 >= queue.length ? "Finish" : "Next →"}
            </button>
          )}
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
          <div style={{ fontSize: 56, fontWeight: 800, color: passed ? "var(--accent-hex)" : "#ef4444", lineHeight: 1 }}>
            {resultsScore}%
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: passed ? "var(--accent-hex)" : "#ef4444", marginTop: 6 }}>
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
                <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: "var(--accent-hex)" }}>{level}</span>
                <div style={{ flex: 1, height: 8, background: "hsl(var(--border))", borderRadius: 4 }}>
                  <div style={{ width: `${Math.round((correct / total) * 100)}%`, height: "100%", background: "var(--accent-hex)", borderRadius: 4 }} />
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Mistake Notebook</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
          {missed.length} question{missed.length !== 1 ? "s" : ""} with at least one incorrect answer
        </p>

        {missed.length === 0 && (
          <p style={{ color: "var(--accent-hex)", fontSize: 14 }}>No mistakes yet — keep it up!</p>
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
              {qs.map((q) => {
                return (
                  <div key={q.id} style={{ background: "#fff", border: "1.5px solid #fecaca", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>{q.text}</p>
                    {q.kind === "mcq" && (
                      <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>✓ {q.options[q.correctIndex]}</p>
                    )}
                    {q.kind === "multipleresponse" && (
                      <p style={{ fontSize: 12, color: "var(--accent-hex)", margin: 0 }}>
                        ✓ {q.correctIndices.map((ci) => q.options[ci]).join(", ")}
                      </p>
                    )}
                    {q.feedback && <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", fontStyle: "italic" }}>{q.feedback}</p>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
