import { DividerBlock } from "@/types/course";

export function DividerView({ block }: { block: DividerBlock }) {
  return <hr className="my-6 border-muted" aria-hidden />;
}
