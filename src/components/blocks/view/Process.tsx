import { ProcessBlock } from "@/types/course";

export function ProcessView({ block }: { block: ProcessBlock }) {
  return (
    <div className="py-2">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-4 items-start">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-hex)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
            {i < block.steps.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[24px]" />}
          </div>
          <div className="pb-6">
            <h4 className="font-semibold text-sm">{step.title}</h4>
            {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
