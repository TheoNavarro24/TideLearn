import { VideoBlock } from "@/types/course";
import { getVideoEmbed } from "@/lib/video";

export function VideoView({ block }: { block: VideoBlock }) {
  const { url } = block;
  const embed = getVideoEmbed(url);

  if (embed.type === "youtube" || embed.type === "vimeo") {
    return (
      <div className="aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-md border">
        <iframe
          src={embed.src!}
          title="Embedded video"
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // For "direct" AND "unknown" — preserve current fallback behavior.
  // VideoView has always rendered a <video> element for any non-YouTube/non-Vimeo URL.
  // The "unknown" hint is editor-only (VideoForm shows it, VideoView does not).
  return (
    <div className="w-full max-w-3xl mx-auto">
      <video controls className="w-full rounded-md border" src={url} preload="metadata" />
    </div>
  );
}
