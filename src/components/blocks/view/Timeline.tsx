import { TimelineBlock } from "@/types/course";

export function TimelineView({ block }: { block: TimelineBlock }) {
  return (
    <div className="py-2">
      <div className="relative border-l-2 border-border ml-4 space-y-6 pl-6">
        {block.items.map((item) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-[var(--accent-hex)] border-2 border-background" />
            <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
            <h4 className="font-semibold text-sm mt-0.5">{item.title}</h4>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
