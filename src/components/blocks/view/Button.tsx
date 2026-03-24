import { ButtonBlock } from "@/types/course";

export function ButtonView({ block }: { block: ButtonBlock }) {
  const base = "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const variants: Record<ButtonBlock["variant"], string> = {
    primary: `${base} bg-[--color-teal-500] text-white hover:bg-[--color-teal-600]`,
    secondary: `${base} bg-secondary text-secondary-foreground hover:bg-secondary/80`,
    outline: `${base} border border-input bg-background hover:bg-accent hover:text-accent-foreground`,
  };

  return (
    <div className="flex justify-center py-4">
      <a href={block.url} target={block.openInNewTab ? "_blank" : undefined}
        rel={block.openInNewTab ? "noopener noreferrer" : undefined} className={variants[block.variant]}>
        {block.label}
      </a>
    </div>
  );
}
