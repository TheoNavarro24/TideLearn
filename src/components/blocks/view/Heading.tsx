import { HeadingBlock } from "@/types/course";

export function HeadingView({ block }: { block: HeadingBlock }) {
  return (
    <h3 className="text-xl font-semibold">{block.text}</h3>
  );
}
