import { useState } from "react";
import { uid } from "@/types/course";
import type { AssessmentQuestion } from "@/types/course";

type Props = {
  onImport: (questions: AssessmentQuestion[]) => void;
};

function parseQuestions(raw: string): { questions: AssessmentQuestion[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { questions: [], errors: ["Invalid JSON — check your syntax."] };
  }
  if (!Array.isArray(parsed)) {
    return { questions: [], errors: ["Expected a JSON array at the top level."] };
  }
  const questions: AssessmentQuestion[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i] as Record<string, unknown>;
    const rowErrors: string[] = [];
    if (!q.text || typeof q.text !== "string") rowErrors.push("missing text");
    if (!Array.isArray(q.options) || q.options.length !== 4) rowErrors.push("options must be array of 4 strings");
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) rowErrors.push("correctIndex must be 0–3");
    if (rowErrors.length) {
      errors.push(`Q${i + 1}: ${rowErrors.join(", ")}`);
    } else {
      questions.push({
        id: uid(),
        text: q.text as string,
        options: q.options as [string, string, string, string],
        correctIndex: q.correctIndex as number,
        feedback: typeof q.feedback === "string" ? q.feedback : undefined,
        bloomLevel: typeof q.bloomLevel === "string" ? q.bloomLevel as AssessmentQuestion["bloomLevel"] : undefined,
        source: typeof q.source === "string" ? q.source : undefined,
      });
    }
  }
  if (errors.length) return { questions: [], errors };
  return { questions, errors: [] };
}

export function JsonImport({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<AssessmentQuestion[] | null>(null);

  function handleValidate() {
    const { questions, errors: errs } = parseQuestions(raw);
    setErrors(errs);
    setPreview(errs.length === 0 ? questions : null);
  }

  function handleImport() {
    if (!preview) return;
    onImport(preview);
    setRaw("");
    setErrors([]);
    setPreview(null);
    setOpen(false);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", color: "var(--accent-hex)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
      >
        {open ? "▲ Hide JSON import" : "▼ Import from JSON"}
      </button>

      {open && (
        <div style={{ marginTop: 10, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, marginTop: 0 }}>
            Paste a JSON array. Required fields per question: <code>text</code>, <code>options</code> (4 strings), <code>correctIndex</code> (0–3). Optional: <code>feedback</code>, <code>bloomLevel</code>, <code>source</code>.
          </p>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setErrors([]); setPreview(null); }}
            rows={8}
            style={{ width: "100%", padding: "8px 10px", border: "1.5px solid hsl(var(--border))", borderRadius: 6, fontSize: 12, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
            placeholder='[{"text":"Question?","options":["A","B","C","D"],"correctIndex":0}]'
          />
          {errors.length > 0 && (
            <ul style={{ margin: "8px 0", padding: "0 0 0 16px", color: "var(--destructive)", fontSize: 12 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {preview && (
            <p style={{ fontSize: 12, color: "var(--accent-hex)", marginBottom: 8 }}>
              ✓ {preview.length} question{preview.length !== 1 ? "s" : ""} validated — ready to import.
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleValidate}
              style={{ background: "none", border: "1.5px solid var(--accent-hex)", borderRadius: 7, color: "var(--accent-hex)", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}
            >
              Validate
            </button>
            {preview && (
              <button
                onClick={handleImport}
                style={{ background: "var(--accent-hex)", border: "none", borderRadius: 7, color: "#0a1c18", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer" }}
              >
                Import {preview.length} question{preview.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
