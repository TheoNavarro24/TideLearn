import { DividerBlock } from "@/types/course";

export function DividerForm({ block }: { block: DividerBlock }) {
  // No configurable options (MVP)
  return <p className="text-sm text-muted-foreground">A horizontal divider will be rendered.</p>;
}
