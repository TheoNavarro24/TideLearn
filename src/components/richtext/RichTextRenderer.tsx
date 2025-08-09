import { useMemo } from "react";
import { sanitize } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

export function RichTextRenderer({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitize(html || ""), [html]);
  return (
    <article className={cn(className)} dangerouslySetInnerHTML={{ __html: safe }} />
  );
}
