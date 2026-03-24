import { ProcessBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: ProcessBlock; onChange: (b: ProcessBlock) => void };

export function ProcessForm({ block, onChange }: Props) {
  const updateStep = (index: number, field: string, value: string) => {
    const steps = block.steps.map((step, i) => i === index ? { ...step, [field]: value } : step);
    onChange({ ...block, steps });
  };
  const addStep = () =>
    onChange({ ...block, steps: [...block.steps, { id: uid(), title: "", description: "" }] });
  const removeStep = (index: number) =>
    onChange({ ...block, steps: block.steps.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {block.steps.map((step, i) => (
        <div key={step.id} className="flex gap-2 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-hex)] text-white text-xs flex items-center justify-center font-bold mt-1">{i + 1}</span>
          <div className="flex-1 space-y-1.5">
            <input type="text" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)}
              placeholder="Step title" className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <textarea value={step.description ?? ""} onChange={(e) => updateStep(i, "description", e.target.value)}
              placeholder="Description (optional)" rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
          </div>
          {block.steps.length > 1 && (
            <button onClick={() => removeStep(i)} aria-label="Remove step" className="text-destructive text-sm mt-1">✕</button>
          )}
        </div>
      ))}
      <button onClick={addStep} className="text-sm text-[var(--accent-hex)] hover:text-[var(--accent-hex)]">+ Add step</button>
    </div>
  );
}
