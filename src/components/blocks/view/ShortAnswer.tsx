import { useState } from "react";
import { ShortAnswerBlock } from "@/types/course";

export function ShortAnswerView({ block }: { block: ShortAnswerBlock }) {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const norm = (s: string) => {
    let t = block.trimWhitespace === false ? s : s.trim();
    if (!block.caseSensitive) t = t.toLowerCase();
    return t;
  };

  const check = () => {
    const candidates = [block.answer, ...(block.acceptable ?? [])];
    const ok = candidates.map(norm).includes(norm(value));
    setCorrect(ok);
    setRevealed(true);
    window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
  };

  return (
    <div style={{ margin: "24px 0", padding: 24, background: "#fafffe", border: "1px solid #e0fdf4", borderRadius: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 10 }}>
        Short Answer
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0d2926", lineHeight: 1.55, marginBottom: 14 }}>{block.question}</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        disabled={revealed && correct === true}
        style={{
          width: "100%",
          border: "1.5px solid #d1faf4",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 14,
          color: "#0d2926",
          background: "#fff",
          outline: "none",
          fontFamily: "Inter, sans-serif",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#5eead4")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#d1faf4")}
      />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={check}
            disabled={revealed && correct === true}
            style={{
              background: (revealed && correct === true) ? "#e2e8f0" : "linear-gradient(135deg, #0d9488, #0891b2)",
              border: "none",
              borderRadius: 7,
              color: (revealed && correct === true) ? "#94a3b8" : "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 14px",
              cursor: (revealed && correct === true) ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Check
          </button>
          <button
            onClick={() => { setValue(""); setRevealed(false); setCorrect(null); }}
            style={{
              background: "none",
              border: "1.5px solid #e0fdf4",
              borderRadius: 7,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Reset
          </button>
          {revealed && (
            <span style={{ fontSize: 13, color: correct ? "#0d9488" : "#ef4444", fontWeight: 500 }}>
              {correct ? "Correct!" : "Try again."}
            </span>
          )}
        </div>
        {block.showFeedback && block.feedbackMessage && revealed && !correct && (
          <span style={{ fontSize: 13, color: "#475569" }}>
            {block.feedbackMessage}
          </span>
        )}
      </div>
    </div>
  );
}
