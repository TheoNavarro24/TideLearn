import { EmbedBlock } from "@/types/course";

export function EmbedView({ block }: { block: EmbedBlock }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <iframe src={block.url} title={block.title} height={block.height}
        className="w-full" sandbox="allow-scripts allow-same-origin allow-forms" loading="lazy" />
    </div>
  );
}
