import { CodeBlock } from "@/types/course";

export function CodeView({ block }: { block: CodeBlock }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
      <code className={`language-${block.language}`}>{block.code}</code>
    </pre>
  );
}
