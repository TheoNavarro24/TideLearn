import { CalloutBlock } from "@/types/course";
import { cn } from "@/lib/utils";

export function CalloutView({ block }: { block: CalloutBlock }) {
  const variantCls = {
    info: "border-primary/30 bg-primary/5",
    success: "border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5",
    warning: "border-yellow-500/30 bg-yellow-500/5 dark:border-yellow-400/30 dark:bg-yellow-400/5",
    danger: "border-red-500/30 bg-red-500/5 dark:border-red-400/30 dark:bg-red-400/5",
  }[block.variant];

  return (
    <div className={cn("rounded-md border p-4", variantCls)} role="note" aria-label={block.title ?? "Callout"}>
      {block.title && <p className="font-medium mb-1">{block.title}</p>}
      <p className="text-sm text-foreground/90">{block.text}</p>
    </div>
  );
}
