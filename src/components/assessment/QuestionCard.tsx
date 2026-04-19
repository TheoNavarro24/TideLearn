import { cn } from "@/lib/utils";
import type { AssessmentQuestion } from "@/types/course";

type Props = {
  question: AssessmentQuestion;
  index: number;
  selected: boolean;
  onSelect: () => void;
};

export function QuestionCard({ question, index, selected, onSelect }: Props) {
  const isMcq = question.kind === "mcq";
  const correctAnswer = isMcq ? question.options[question.correctIndex] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Question ${index + 1} — click to edit`}
      className={cn(
        "question-card w-full text-left flex items-start gap-3 rounded-lg px-4 py-3 mb-2 cursor-pointer transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
        selected ? "ring-2 ring-[var(--accent-hex)]" : "hover:ring-1 hover:ring-[hsl(var(--border))]"
      )}
      style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))" }}
    >
      <span className="text-[11px] font-bold min-w-[22px] pt-0.5" style={{ color: "var(--text-muted)" }}>
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: "var(--ink)" }}>
          {question.text}
        </p>
        {correctAnswer && (
          <p className="text-[11px]" style={{ color: "var(--accent-hex)" }}>
            ✓ {correctAnswer}
          </p>
        )}
        {!isMcq && (
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {question.kind}
          </p>
        )}
        {(question.bloomLevel || question.source) && (
          <div className="flex gap-1.5 mt-1">
            {question.bloomLevel && (
              <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "var(--accent-bg)", color: "var(--accent-hex)" }}>
                {question.bloomLevel}
              </span>
            )}
            {question.source && (
              <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "hsl(var(--muted))", color: "var(--text-muted)" }}>
                {question.source}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
