import { ImageBlock } from "@/types/course";

export function ImageView({ block }: { block: ImageBlock }) {
  return (
    <figure>
      <img src={block.src} alt={block.alt || "Course image"} loading="lazy" className="w-full rounded-lg border" />
      {block.alt && <figcaption className="text-sm text-muted-foreground mt-2">{block.alt}</figcaption>}
    </figure>
  );
}
