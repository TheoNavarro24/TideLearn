import { useState } from "react";
import { TrueFalseBlock } from "@/types/course";

export function TrueFalseView({ block }: { block: TrueFalseBlock }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);

  const wasCorrect = choice !== null && choice === block.correct;

  const choiceBg = (val: boolean) => {
    if (revealed && val === block.correct) return "#f0fdfb";
    if (choice === val) return "#f8fffe";
    return "#fff";
  };
  const choiceBorder = (val: boolean) => {
    if (revealed && val === block.correct) return "1.5px solid #14b8a6";
    if (choice === val) return "1.5px solid #5eead4";
    return "1.5px solid #e0fdf4";
  };
  const choiceColor = (val: boolean) => {
    if (revealed && val === block.correct) return "#0d9488";
    if (choice === val) return "#0d9488";
    return "#475569";
  };

  return (
    <div style={{ margin: "24px 0", padding: 24, background: "#fafffe", border: "1px solid #e0fdf4", borderRadius: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 10 }}>
        True or False
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0d2926", lineHeight: 1.55, marginBottom: 18 }}>{block.question}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {([true, false] as const).map((val) => (
          <button
            key={String(val)}
            onClick={() => { if (!revealed) setChoice(val); }}
            aria-pressed={choice === val}
            style={{
              padding: 16,
              border: choiceBorder(val),
              borderRadius: 10,
              background: choiceBg(val),
              fontSize: 14,
              fontWeight: 600,
              color: choiceColor(val),
              cursor: revealed ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <span style={{ fontSize: 16 }}>{val ? "✓" : "✗"}</span>
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => {
            if (revealed || choice == null) return;
            setRevealed(true);
            window.dispatchEvent(new CustomEvent("quiz:answered", { detail: { blockId: block.id, correct: wasCorrect } }));
          }}
          disabled={revealed || choice == null}
          style={{
            background: (revealed || choice == null) ? "#e2e8f0" : "linear-gradient(135deg, #0d9488, #0891b2)",
            border: "none",
            borderRadius: 7,
            color: (revealed || choice == null) ? "#94a3b8" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 14px",
            cursor: (revealed || choice == null) ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Check
        </button>
        <button
          onClick={() => { setChoice(null); setRevealed(false); }}
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
        <div aria-live="polite" aria-atomic="true" role="status">
          {block.showFeedback && revealed && (
            <span style={{ fontSize: 13, color: wasCorrect ? "#0d9488" : "#ef4444", fontWeight: 500 }}>
              {wasCorrect ? (block.feedbackCorrect || "Correct!") : (block.feedbackIncorrect || "Incorrect.")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
