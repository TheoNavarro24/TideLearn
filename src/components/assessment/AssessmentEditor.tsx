import { useState } from "react";
import type { AssessmentLesson, AssessmentQuestion } from "@/types/course";
import { uid } from "@/types/course";
import { QuestionCard } from "./QuestionCard";
import { QuestionInspector } from "./QuestionInspector";
import { AssessmentConfigBar } from "./AssessmentConfigBar";
import { JsonImport } from "./JsonImport";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Props = {
  lesson: AssessmentLesson;
  onChange: (updated: AssessmentLesson) => void;
};

function emptyMcq(): AssessmentQuestion {
  return {
    id: uid(),
    kind: "mcq",
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function AssessmentEditor({ lesson, onChange }: Props) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Draft question for the "+ Add question" flow — lives in UI state until the
  // user clicks Save in the inspector, so bailing doesn't leave an empty MCQ
  // stranded in the lesson.
  const [draftQuestion, setDraftQuestion] = useState<AssessmentQuestion | null>(null);

  const questions = lesson.questions;

  function update(changes: Partial<Omit<AssessmentLesson, "kind" | "id">>) {
    onChange({ ...lesson, ...changes });
  }

  function handleSave(q: AssessmentQuestion) {
    const exists = questions.some((x) => x.id === q.id);
    if (!exists) {
      update({ questions: [...questions, q] });
      setDraftQuestion(null);
      setSelectedQuestionId(q.id);
      return;
    }
    update({ questions: questions.map((x) => (x.id === q.id ? q : x)) });
  }

  function handleAddQuestion() {
    const q = emptyMcq();
    setDraftQuestion(q);
    setSelectedQuestionId(q.id);
  }

  function handleCloseInspector() {
    if (draftQuestion && selectedQuestionId === draftQuestion.id) {
      setDraftQuestion(null);
    }
    setSelectedQuestionId(null);
  }

  function handleMove(id: string, dir: "up" | "down") {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ questions: next });
  }

  function handleDuplicate(id: string) {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    const copy: AssessmentQuestion = { ...q, id: uid() };
    const idx = questions.findIndex((x) => x.id === id);
    const next = [...questions.slice(0, idx + 1), copy, ...questions.slice(idx + 1)];
    update({ questions: next });
    setSelectedQuestionId(copy.id);
  }

  function handleRemove(id: string) {
    setDeleteTargetId(id);
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    update({ questions: questions.filter((q) => q.id !== deleteTargetId) });
    if (selectedQuestionId === deleteTargetId) setSelectedQuestionId(null);
    setDeleteTargetId(null);
  }

  function handleImport(imported: AssessmentQuestion[]) {
    update({ questions: [...questions, ...imported] });
  }

  const selectedIdx = selectedQuestionId ? questions.findIndex((q) => q.id === selectedQuestionId) : -1;
  const selectedQuestion: AssessmentQuestion | null =
    selectedIdx >= 0
      ? questions[selectedIdx]
      : draftQuestion && draftQuestion.id === selectedQuestionId
        ? draftQuestion
        : null;
  const inspectorIdx = selectedIdx >= 0 ? selectedIdx : questions.length;
  const inspectorTotal = selectedIdx >= 0 ? questions.length : questions.length + 1;

  return (
    <>
      <div className="max-w-[var(--reading-max-w)] mx-auto flex flex-col pb-8">
        <AssessmentConfigBar lesson={lesson} onChange={onChange} />

        {questions.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            No questions yet. Add your first question below.
          </p>
        )}

        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            selected={selectedQuestionId === q.id}
            onSelect={() => setSelectedQuestionId(q.id)}
          />
        ))}

        <button
          onClick={handleAddQuestion}
          className="mt-2 self-start text-xs font-bold rounded-md px-4 py-2 border-none cursor-pointer"
          style={{ background: "var(--accent-hex)", color: "#0a1c18" }}
        >
          + Add question
        </button>

        <JsonImport onImport={handleImport} />
      </div>

      {selectedQuestion && (
        <QuestionInspector
          key={selectedQuestion.id}
          question={selectedQuestion}
          idx={inspectorIdx}
          total={inspectorTotal}
          onClose={handleCloseInspector}
          onSave={handleSave}
          onMove={handleMove}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
        />
      )}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The question will be permanently removed from this lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
