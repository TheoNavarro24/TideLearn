import { ListBlock } from "@/types/course";
import { sanitize } from "@/lib/sanitize";

export function ListView({ block }: { block: ListBlock }) {
  if (block.style === "numbered") {
    return (
      <ol className="list-decimal pl-6 space-y-1">
        {block.items.map((it, idx) => (
          <li key={idx}><span dangerouslySetInnerHTML={{ __html: sanitize(it) }} /></li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="list-disc pl-6 space-y-1">
      {block.items.map((it, idx) => (
        <li key={idx}><span dangerouslySetInnerHTML={{ __html: sanitize(it) }} /></li>
      ))}
    </ul>
  );
}
