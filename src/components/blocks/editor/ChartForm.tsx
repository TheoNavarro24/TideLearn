import { ChartBlock } from "@/types/course";

type Props = { block: ChartBlock; onChange: (b: ChartBlock) => void };

export function ChartForm({ block, onChange }: Props) {
  const set = <K extends keyof ChartBlock>(k: K, v: ChartBlock[K]) => onChange({ ...block, [k]: v });
  const updateLabel = (i: number, value: string) => {
    const labels = [...block.labels]; labels[i] = value; onChange({ ...block, labels });
  };
  const updateDatasetValue = (di: number, vi: number, value: string) => {
    const datasets = block.datasets.map((ds, i) => {
      if (i !== di) return ds;
      const values = [...ds.values]; values[vi] = parseFloat(value) || 0;
      return { ...ds, values };
    });
    onChange({ ...block, datasets });
  };
  const updateDatasetLabel = (di: number, value: string) => {
    const datasets = block.datasets.map((ds, i) => i === di ? { ...ds, label: value } : ds);
    onChange({ ...block, datasets });
  };
  const addLabel = () => onChange({
    ...block, labels: [...block.labels, `Category ${block.labels.length + 1}`],
    datasets: block.datasets.map((ds) => ({ ...ds, values: [...ds.values, 0] })),
  });
  const removeLabel = (i: number) => onChange({
    ...block, labels: block.labels.filter((_, idx) => idx !== i),
    datasets: block.datasets.map((ds) => ({ ...ds, values: ds.values.filter((_, idx) => idx !== i) })),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Chart type</label>
          <select value={block.chartType} onChange={(e) => set("chartType", e.target.value as ChartBlock["chartType"])}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
            <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input type="text" value={block.title ?? ""} onChange={(e) => set("title", e.target.value || undefined)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Data</label>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                {block.datasets.map((ds, di) => (
                  <th key={di} className="text-left px-3 py-2 font-medium">
                    <input type="text" value={ds.label} onChange={(e) => updateDatasetLabel(di, e.target.value)}
                      className="w-full bg-transparent border-b border-input focus:outline-none text-sm" />
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {block.labels.map((label, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <input type="text" value={label} onChange={(e) => updateLabel(i, e.target.value)} className="w-full bg-transparent focus:outline-none text-sm" />
                  </td>
                  {block.datasets.map((ds, di) => (
                    <td key={di} className="px-3 py-1.5">
                      <input type="number" value={ds.values[i] ?? 0} onChange={(e) => updateDatasetValue(di, i, e.target.value)} className="w-full bg-transparent focus:outline-none text-sm" />
                    </td>
                  ))}
                  <td className="px-1">
                    {block.labels.length > 1 && <button onClick={() => removeLabel(i)} className="text-destructive text-xs" aria-label="Remove row">✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addLabel} className="text-sm text-[--color-teal-500] mt-2">+ Add row</button>
      </div>
    </div>
  );
}
