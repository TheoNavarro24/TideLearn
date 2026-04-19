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
      kind: "mcq" as const,
      text: text.trim(),
      options: options.map((o) => o.trim()) as [string, string, string, string],
      correctIndex,
      feedback: feedback.trim() || undefined,
      bloomLevel: bloomLevel || undefined,
      source: source.trim() || undefined,
    });
  }

  return (
    <div className="rounded-xl p-5 mb-3" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
      <div className="mb-3">
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--accent-hex)" }}>Question *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-2 rounded-md text-sm outline-none transition-colors resize-y"
          style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}
          placeholder="Enter your question..."
        />
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--accent-hex)" }}>Options *</label>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              style={{ accentColor: "var(--accent-hex)", flexShrink: 0 }}
            />
            <span className="text-[11px] flex-shrink-0 w-3.5" style={{ color: "var(--text-muted)" }}>{String.fromCharCode(65 + i)}</span>
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options] as [string, string, string, string];
                next[i] = e.target.value;
                setOptions(next);
              }}
              className="flex-1 px-2.5 py-2 rounded-md text-sm outline-none transition-colors"
              style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Select the radio button next to the correct answer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--accent-hex)" }}>Feedback (optional)</label>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-2.5 py-2 rounded-md text-sm outline-none transition-colors"
            style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}
            placeholder="Shown after answer is revealed"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--accent-hex)" }}>Source tag (optional)</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-2.5 py-2 rounded-md text-sm outline-none transition-colors"
            style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}
            placeholder="e.g. Week 3 Reading"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--accent-hex)" }}>Bloom's level (optional)</label>
        <select
          value={bloomLevel ?? ""}
          onChange={(e) => setBloomLevel((e.target.value as AssessmentQuestion["bloomLevel"]) || undefined)}
          className="w-full px-2.5 py-2 rounded-md text-sm outline-none transition-colors cursor-pointer"
          style={{ background: "var(--canvas-white)", border: "1.5px solid hsl(var(--border))", color: "var(--ink)" }}
        >
          <option value="">— none —</option>
          {BLOOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-destructive mb-2.5">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="text-xs font-bold rounded-md px-4 py-2 border-none cursor-pointer"
          style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
        >
          {initial ? "Save changes" : "Add question"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-medium rounded-md px-3 py-2 border cursor-pointer"
          style={{ background: "transparent", color: "var(--text-muted)", borderColor: "hsl(var(--border))" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
