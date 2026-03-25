import { cn } from "@/lib/utils";

interface ViewBottomNavProps {
  idx: number;
  totalLessons: number;
  hasPrev: boolean;
  hasNext: boolean;
  isCourseCompleted: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function ViewBottomNav({ idx, totalLessons, hasPrev, hasNext, isCourseCompleted, onPrev, onNext }: ViewBottomNavProps) {
  return (
    <nav
      aria-label="Lesson pagination"
      className="fixed bottom-0 inset-x-0 h-14 flex items-center justify-between px-4 md:px-8 bg-white border-t border-[hsl(var(--border))] z-10 pb-[env(safe-area-inset-bottom)]"
    >
      <button
        aria-label="Previous lesson"
        disabled={!hasPrev}
        onClick={onPrev}
        className={cn(
          "bg-transparent border-none text-[13px] font-medium flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] font-sans transition-colors",
          hasPrev ? "text-[var(--text-muted)] cursor-pointer hover:bg-[var(--canvas-2)] hover:text-[var(--accent-hex)]" : "text-slate-300 cursor-not-allowed"
        )}
      >
        <span aria-hidden="true">&larr; </span>Previous lesson
      </button>

      <span className="text-xs text-slate-400 font-medium">
        {isCourseCompleted ? "Course complete \u2713" : `Lesson ${idx + 1} of ${totalLessons}`}
      </span>

      {isCourseCompleted && !hasNext ? (
        <button
          disabled
          className="bg-[var(--accent-hex)] border-none text-[13px] font-semibold text-white cursor-not-allowed flex items-center gap-1.5 px-[18px] py-2 rounded-[var(--radius-md)] font-sans opacity-75"
        >
          Completed &#10003;
        </button>
      ) : (
        <button
          aria-label="Next lesson"
          disabled={!hasNext}
          onClick={onNext}
          className={cn(
            "border-none text-[13px] font-semibold flex items-center gap-1.5 px-[18px] py-2 rounded-[var(--radius-md)] font-sans transition-opacity",
            hasNext
              ? "bg-[var(--accent-hex)] text-white cursor-pointer hover:opacity-90"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          Next lesson<span aria-hidden="true"> &rarr;</span>
        </button>
      )}
    </nav>
  );
}
