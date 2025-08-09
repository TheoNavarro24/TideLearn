import { TextBlock } from "@/types/course";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function TextView({ block }: { block: TextBlock }) {
  return <RichTextRenderer html={block.text} className="text-base leading-7" />;
}
