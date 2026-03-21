import { useState } from "react";
import { uid } from "@/types/course";
import type { AssessmentQuestion } from "@/types/course";

const BLOOM_OPTIONS = [
  { value: "K", label: "Knowledge" },
  { value: "C", label: "Comprehension" },
  { value: "UN", label: "Understanding" },
  { value: "AP", label: "Application" },
  { value: "AN", label: "Analysis" },
  { value: "EV", label: "Evaluation" },
] as const;

type Props = {
  initial?: AssessmentQuestion;
  onSave: (q: AssessmentQuestion) => void;
  onCancel: () => void;
};

export function QuestionForm({ initial, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial?.options ?? ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0);
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [bloomLevel, setBloomLevel] = useState<AssessmentQuestion["bloomLevel"]>(initial?.bloomLevel);
  const [source, setSource] = useState(initial?.source ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!text.trim()) { setError("Question text is required."); return; }
    if (options.some((o) => !o.trim())) { setError("All 4 options must be filled in."); return; }
    setError(null);
    onSave({
      id: initial?.id ?? uid(),
      text: text.trim(),
      options: options.map((o) => o.trim()) as [string, string, string, string],
      correctIndex,
      feedback: feedback.trim() || undefined,
      bloomLevel: bloomLevel || undefined,
      source: source.trim() || undefined,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1.5px solid #e0fdf4",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#0d2926",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Question *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Enter your question..."
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Options *</label>
        {options.map((opt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              style={{ accentColor: "#0d9488", flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, color: "#64748b", width: 14, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options] as [string, string, string, string];
                next[i] = e.target.value;
                setOptions(next);
              }}
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>Select the radio button next to the correct answer.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Feedback (optional)</label>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} style={inputStyle} placeholder="Shown after answer is revealed" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Source tag (optional)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} placeholder="e.g. Week 3 Reading" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#0d9488", display: "block", marginBottom: 4 }}>Bloom's level (optional)</label>
        <select
          value={bloomLevel ?? ""}
          onChange={(e) => setBloomLevel((e.target.value as AssessmentQuestion["bloomLevel"]) || undefined)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">— none —</option>
          {BLOOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          {initial ? "Save changes" : "Add question"}
        </button>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "1.5px solid #e0fdf4", borderRadius: 7, color: "#64748b", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
