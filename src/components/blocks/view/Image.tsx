import { useEffect, useState } from "react";
import { ImageBlock } from "@/types/course";

function HtmlFrame({ src, alt }: { src: string; alt: string }) {
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then(setSrcdoc)
      .catch(() => setSrcdoc(null));
  }, [src]);

  if (!srcdoc) return null;

  return (
    <iframe
      srcDoc={srcdoc}
      title={alt}
      className="w-full rounded-lg border"
      style={{ height, border: "none" }}
      onLoad={(e) => {
        const doc = (e.target as HTMLIFrameElement).contentDocument;
        if (doc) setHeight(doc.documentElement.scrollHeight);
      }}
    />
  );
}

export function ImageView({ block }: { block: ImageBlock }) {
  const isHtml = /\.html?(\?|$)/i.test(block.src);
  return (
    <figure>
      {isHtml ? (
        <HtmlFrame src={block.src} alt={block.alt || "Course image"} />
      ) : (
        <img src={block.src} alt={block.alt || "Course image"} loading="lazy" className="w-full rounded-lg border" />
      )}
      {block.alt && <figcaption className="text-sm text-muted-foreground mt-2">{block.alt}</figcaption>}
    </figure>
  );
}
