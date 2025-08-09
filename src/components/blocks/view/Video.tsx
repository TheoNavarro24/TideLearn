import { VideoBlock } from "@/types/course";

function isYouTube(url: string) {
  return /youtube\.com\/.+v=|youtu\.be\//.test(url);
}
function youTubeEmbed(url: string) {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  const id = match?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
function isVimeo(url: string) {
  return /vimeo\.com\//.test(url);
}
function vimeoEmbed(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  const id = match?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

export function VideoView({ block }: { block: VideoBlock }) {
  const { url } = block;
  const yt = isYouTube(url) ? youTubeEmbed(url) : null;
  const vm = !yt && isVimeo(url) ? vimeoEmbed(url) : null;

  if (yt || vm) {
    const src = yt || vm!;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border">
        <iframe
          src={src}
          title="Embedded video"
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video controls className="w-full rounded-md border" src={url} preload="metadata" />
  );
}
