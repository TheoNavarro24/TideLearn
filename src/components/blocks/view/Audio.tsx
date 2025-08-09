import { AudioBlock } from "@/types/course";

export function AudioView({ block }: { block: AudioBlock }) {
  return (
    <figure className="rounded-md border p-3">
      {block.title && <figcaption className="text-sm mb-2 text-muted-foreground">{block.title}</figcaption>}
      <audio controls className="w-full">
        <source src={block.src} />
        Your browser does not support the audio element.
      </audio>
    </figure>
  );
}
