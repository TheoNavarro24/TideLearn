import type { AssessmentLesson } from "@/types/course";

type Props = {
  lesson: AssessmentLesson;
  onChange: (next: AssessmentLesson) => void;
};

export function AssessmentConfigBar({ lesson, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap mb-4 px-3 py-2 rounded-md text-xs"
      style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
    >
      <label className="flex items-center gap-1.5">
        <span className="font-semibold" style={{ color: "var(--accent-hex)" }}>Pass</span>
        <input
          type="number"
          min={0}
          max={100}
          value={lesson.config.passingScore ?? 80}
          onChange={(e) => {
            const raw = e.target.value;
            const val = raw === "" ? undefined : Math.max(0, Math.min(100, parseInt(raw, 10)));
            onChange({ ...lesson, config: { ...lesson.config, passingScore: val } });
          }}
          aria-label="Passing score percentage"
          className="w-14 px-2 py-1 rounded text-xs outline-none"
          style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", color: "var(--ink)" }}
        />
        <span style={{ color: "var(--text-muted)" }}>%</span>
      </label>

      <span style={{ color: "var(--text-muted)" }}>·</span>

      <label className="flex items-center gap-1.5">
        <span className="font-semibold" style={{ color: "var(--accent-hex)" }}>Exam size</span>
        <input
          type="number"
          min={1}
          max={lesson.questions.length > 0 ? lesson.questions.length : 100}
          value={lesson.config.examSize ?? 20}
          onChange={(e) => {
            const raw = e.target.value;
            const max = lesson.questions.length > 0 ? lesson.questions.length : 100;
            const val = raw === "" ? undefined : Math.max(1, Math.min(max, parseInt(raw, 10)));
            onChange({ ...lesson, config: { ...lesson.config, examSize: val } });
          }}
          aria-label="Exam size — number of questions"
          className="w-14 px-2 py-1 rounded text-xs outline-none"
          style={{ background: "var(--canvas-white)", border: "1px solid hsl(var(--border))", color: "var(--ink)" }}
        />
      </label>

      <span style={{ color: "var(--text-muted)" }}>·</span>

      <span style={{ color: "var(--text-muted)" }}>
        {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""} in bank
      </span>
    </div>
  );
}
