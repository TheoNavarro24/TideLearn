import { QuoteBlock } from "@/types/course";

export function QuoteView({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className="border-l-4 pl-4 italic">
      <p>“{block.text}”</p>
      {block.cite && <cite className="block text-sm text-muted-foreground mt-1">— {block.cite}</cite>}
    </blockquote>
  );
}
