import { TextBlock } from "@/types/course";

export function TextView({ block }: { block: TextBlock }) {
  return <p className="text-base leading-7 text-foreground/90">{block.text}</p>;
}
