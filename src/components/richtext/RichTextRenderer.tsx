import { useMemo } from "react";
import { marked } from "marked";
import { sanitize } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

function toHtml(content: string): string {
  // If content looks like HTML already, pass through as-is
  if (/^\s*</.test(content)) return content;
  // Otherwise parse as markdown
  return marked.parse(content, { async: false }) as string;
}

export function RichTextRenderer({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitize(toHtml(html || "")), [html]);
  return (
    <article className={cn(className)} dangerouslySetInnerHTML={{ __html: safe }} />
  );
}
