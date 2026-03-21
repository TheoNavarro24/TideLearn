import { useState } from "react";
import type { AssessmentLesson, AssessmentQuestion } from "@/types/course";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { JsonImport } from "./JsonImport";

type Props = {
  lesson: AssessmentLesson;
  onChange: (updated: AssessmentLesson) => void;
};

export function AssessmentEditor({ lesson, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  function update(changes: Partial<Omit<AssessmentLesson, "kind" | "id">>) {
    onChange({ ...lesson, ...changes });
  }

  function handleAdd(q: AssessmentQuestion) {
    update({ questions: [...lesson.questions, q] });
    setAddingNew(false);
  }

  function handleUpdate(q: AssessmentQuestion) {
    update({ questions: lesson.questions.map((existing) => existing.id === q.id ? q : existing) });
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this question?")) return;
    update({ questions: lesson.questions.filter((q) => q.id !== id) });
  }

  function handleImport(imported: AssessmentQuestion[]) {
    update({ questions: [...lesson.questions, ...imported] });
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#0d9488" };
  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1.5px solid #e0fdf4",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#0d2926",
    background: "#fff",
  };

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Config */}
      <div style={{ background: "#f8fffe", border: "1px solid #e0fdf4", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ ...labelStyle, display: "block", marginBottom: 4 }}>Passing score (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={lesson.config.passingScore ?? 80}
            onChange={(e) => update({ config: { ...lesson.config, passingScore: Number(e.target.value) } })}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <div>
          <label style={{ ...labelStyle, display: "block", marginBottom: 4 }}>Exam size (questions)</label>
          <input
            type="number"
            min={1}
            max={lesson.questions.length || 100}
            value={lesson.config.examSize ?? 20}
            onChange={(e) => update({ config: { ...lesson.config, examSize: Number(e.target.value) } })}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
        </p>
      </div>

      {/* Question bank */}
      <div style={{ marginBottom: 12 }}>
        {lesson.questions.map((q, i) =>
          editingId === q.id ? (
            <QuestionForm
              key={q.id}
              initial={q}
              onSave={handleUpdate}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              onEdit={() => setEditingId(q.id)}
              onDelete={() => handleDelete(q.id)}
            />
          )
        )}
      </div>

      {addingNew && (
        <QuestionForm
          onSave={handleAdd}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {!addingNew && (
        <button
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 20px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          + Add question
        </button>
      )}

      <JsonImport onImport={handleImport} />
    </div>
  );
}
