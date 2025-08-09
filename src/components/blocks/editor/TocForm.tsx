import { TocBlock } from "@/types/course";

export function TocForm({ block }: { block: TocBlock; onChange?: (b: TocBlock) => void }) {
  return (
    <div className="text-sm text-muted-foreground">
      This Table of Contents is auto-generated from your lessons when viewing the course. No configuration needed.
    </div>
  );
}
