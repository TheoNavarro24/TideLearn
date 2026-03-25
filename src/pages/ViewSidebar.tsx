import { cn } from "@/lib/utils";

interface FlatNavItem {
  id: string;
  title: string;
}

interface ViewSidebarProps {
  flatNav: FlatNavItem[];
  currentLessonId: string | null;
  activeId: string | null;
  completed: Set<string>;
  isPaged: boolean;
  sidebarOpen: boolean;
  onSelectLesson: (id: string) => void;
  onCloseSidebar: () => void;
}

function getDotStyle(lessonId: string, isCurrent: boolean, completed: Set<string>): React.CSSProperties {
  if (completed.has(lessonId)) {
    return { width: 8, height: 8, borderRadius: "50%", background: "var(--accent-hex)", flexShrink: 0 };
  }
  if (isCurrent) {
    return {
      width: 8, height: 8, borderRadius: "50%", background: "var(--accent-hex)", flexShrink: 0,
      boxShadow: "0 0 0 3px rgba(64,200,160,0.25)",
      animation: "pulse-ring 1.8s ease-in-out infinite",
    };
  }
  return { width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--text-muted)", background: "transparent", flexShrink: 0 };
}

export function ViewSidebar({
  flatNav, currentLessonId, activeId, completed, isPaged, sidebarOpen, onSelectLesson, onCloseSidebar,
}: ViewSidebarProps) {
  return (
    <nav
      aria-label="Lesson navigation"
      className={cn(
        "fixed md:relative z-30 md:z-auto",
        "w-[var(--sidebar-w-viewer)] h-full",
        "bg-[var(--canvas)] border-r border-[hsl(var(--border))] flex flex-col shrink-0 overflow-y-auto py-5",
        "transition-transform md:transition-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--accent-hex)] px-4 pb-2.5">
        Lessons
      </div>

      {flatNav.map((l, i) => {
        const isActive = isPaged ? l.id === currentLessonId : l.id === activeId;
        const isCurrent = l.id === currentLessonId;

        return (
          <button
            key={l.id}
            onClick={() => {
              onSelectLesson(l.id);
              onCloseSidebar();
            }}
            className={cn(
              "w-full text-left flex items-start gap-2.5 py-2 px-4 pl-3 border-l-[3px] transition-colors",
              isActive
                ? "border-l-[var(--accent-hex)] bg-[var(--canvas-2)]"
                : "border-l-transparent hover:bg-[var(--canvas-2)]"
            )}
          >
            <div className="shrink-0 w-4 flex items-center justify-center pt-[3px]">
              <div style={getDotStyle(l.id, isCurrent, completed)} />
            </div>
            <span className={cn("text-[9px] font-semibold shrink-0 pt-px", isActive ? "text-[var(--accent-hex)]" : "text-slate-400")}>
              {i + 1}
            </span>
            <span className={cn("text-xs leading-[1.45]", isActive ? "text-[var(--accent-hex)] font-semibold" : "text-slate-600")}>
              {l.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
