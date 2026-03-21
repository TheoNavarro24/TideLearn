import type { AssessmentQuestion } from "@/types/course";

type Props = {
  question: AssessmentQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
};

export function QuestionCard({ question, index, onEdit, onDelete }: Props) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e0fdf4",
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 8,
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", minWidth: 24, paddingTop: 2 }}>
        {index + 1}.
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2926", margin: "0 0 4px", lineHeight: 1.4 }}>
          {question.text}
        </p>
        <p style={{ fontSize: 11, color: "#0d9488", margin: 0 }}>
          ✓ {question.options[question.correctIndex]}
        </p>
        {(question.bloomLevel || question.source) && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {question.bloomLevel && (
              <span style={{ fontSize: 10, background: "#f0fdf4", color: "#0d9488", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                {question.bloomLevel}
              </span>
            )}
            {question.source && (
              <span style={{ fontSize: 10, background: "#f0f9ff", color: "#0891b2", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                {question.source}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{ background: "none", border: "1px solid #e0fdf4", borderRadius: 5, color: "#0d9488", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{ background: "none", border: "1px solid #fecaca", borderRadius: 5, color: "#ef4444", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
