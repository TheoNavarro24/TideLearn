export function isYouTube(url: string): boolean {
  return /youtube\.com\/.+v=|youtu\.be\//.test(url);
}

export function youTubeEmbedUrl(url: string): string | null {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isVimeo(url: string): boolean {
  return /vimeo\.com\//.test(url);
}

export function vimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export type VideoEmbedResult = {
  type: "youtube" | "vimeo" | "direct" | "unknown";
  src: string | null;
};

export function getVideoEmbed(url: string): VideoEmbedResult {
  const yt = youTubeEmbedUrl(url);
  if (yt) return { type: "youtube", src: yt };
  const vm = vimeoEmbedUrl(url);
  if (vm) return { type: "vimeo", src: vm };
  if (isDirectVideo(url)) return { type: "direct", src: url };
  return { type: "unknown", src: null };
}
