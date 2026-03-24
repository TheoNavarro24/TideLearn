import { BranchingBlock } from "@/types/course";
import { uid } from "@/types/course";

type Props = { block: BranchingBlock; onChange: (b: BranchingBlock) => void };

export function BranchingForm({ block, onChange }: Props) {
  const updateChoice = (index: number, field: "label" | "content", value: string) => {
    const choices = block.choices.map((c, i) => i === index ? { ...c, [field]: value } : c);
    onChange({ ...block, choices });
  };
  const addChoice = () =>
    onChange({ ...block, choices: [...block.choices, { id: uid(), label: `Option ${block.choices.length + 1}`, content: "" }] });
  const removeChoice = (index: number) =>
    onChange({ ...block, choices: block.choices.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Prompt / scenario</label>
        <textarea value={block.prompt} onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
      </div>
      {block.choices.map((choice, i) => (
        <div key={choice.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input type="text" value={choice.label} onChange={(e) => updateChoice(i, "label", e.target.value)}
              placeholder="Choice label" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            {block.choices.length > 2 && (
              <button onClick={() => removeChoice(i)} aria-label="Remove choice" className="text-destructive text-sm">✕</button>
            )}
          </div>
          <textarea value={choice.content} onChange={(e) => updateChoice(i, "content", e.target.value)}
            placeholder="Content shown when learner picks this choice (HTML accepted)"
            rows={3} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
        </div>
      ))}
      <button onClick={addChoice} className="text-sm text-[--color-teal-500]">+ Add choice</button>
    </div>
  );
}
