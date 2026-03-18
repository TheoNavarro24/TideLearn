import { useState } from "react";
import { QuizBlock } from "@/types/course";

export function QuizView({ block }: { block: QuizBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isCorrect = selected !== null && selected === block.correctIndex;

  const optBg = (i: number) => {
    if (revealed && i === block.correctIndex) return "#f0fdfb";
    if (selected === i) return "#f8fffe";
    return "#fff";
  };
  const optBorder = (i: number) => {
    if (revealed && i === block.correctIndex) return "1.5px solid #14b8a6";
    if (selected === i) return "1.5px solid #5eead4";
    return "1.5px solid #e0fdf4";
  };
  const optColor = (i: number) => {
    if (revealed && i === block.correctIndex) return "#0d9488";
    if (selected === i) return "#0d9488";
    return "#334155";
  };

  return (
    <div style={{ margin: "24px 0", padding: 24, background: "#fafffe", border: "1px solid #e0fdf4", borderRadius: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 10 }}>
        Multiple Choice
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0d2926", lineHeight: 1.55, marginBottom: 18 }}>{block.question}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {block.options.map((opt, i) => (
          <li key={i}>
            <button
              onClick={() => { if (!revealed) setSelected(i); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                border: optBorder(i),
                borderRadius: 8,
                background: optBg(i),
                color: optColor(i),
                fontSize: 14,
                fontWeight: selected === i || (revealed && i === block.correctIndex) ? 600 : 400,
                cursor: revealed ? "default" : "pointer",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
                fontFamily: "Inter, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `1.5px solid ${optColor(i)}`,
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => {
            if (revealed || selected == null) return;
            setRevealed(true);
            const ok = selected === block.correctIndex;
            window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: ok } }));
          }}
          disabled={revealed || selected == null}
          style={{
            background: (revealed || selected == null) ? "#e2e8f0" : "linear-gradient(135deg, #0d9488, #0891b2)",
            border: "none",
            borderRadius: 7,
            color: (revealed || selected == null) ? "#94a3b8" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 14px",
            cursor: (revealed || selected == null) ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Check
        </button>
        <button
          onClick={() => { setSelected(null); setRevealed(false); }}
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
          <span style={{ fontSize: 13, color: isCorrect ? "#0d9488" : "#ef4444", fontWeight: 500 }}>
            {isCorrect ? "Correct!" : "Try again."}
          </span>
        )}
      </div>
    </div>
  );
}
