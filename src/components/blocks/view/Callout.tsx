import { cn } from "@/lib/utils";
import { CalloutBlock } from "@/types/course";

const VARIANT = {
  info:    { border: "border-l-teal-500",  bg: "bg-teal-50",  title: "text-teal-600" },
  success: { border: "border-l-green-500", bg: "bg-green-50", title: "text-green-600" },
  warning: { border: "border-l-amber-400", bg: "bg-amber-50", title: "text-amber-600" },
  danger:  { border: "border-l-red-500",   bg: "bg-red-50",   title: "text-red-600" },
};

export function CalloutView({ block }: { block: CalloutBlock }) {
  const v = VARIANT[block.variant] ?? VARIANT.info;
  return (
    <div
      role="note"
      aria-label={block.title ?? "Callout"}
      className={cn(
        "border-l-4 rounded-r-lg p-4 my-6",
        v.border,
        v.bg
      )}
    >
      {block.title && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn("text-xs font-bold tracking-wide", v.title)}>
            {block.title}
          </span>
        </div>
      )}
      <div className="text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: block.text }} />
    </div>
  );
}
