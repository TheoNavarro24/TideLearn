import { ListBlock } from "@/types/course";

export function ListView({ block }: { block: ListBlock }) {
  if (block.style === "numbered") {
    return (
      <ol className="list-decimal pl-6 space-y-1">
        {block.items.map((it, idx) => <li key={idx}>{it}</li>)}
      </ol>
    );
  }
  return (
    <ul className="list-disc pl-6 space-y-1">
      {block.items.map((it, idx) => <li key={idx}>{it}</li>)}
    </ul>
  );
}
