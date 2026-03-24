import { ChartBlock } from "@/types/course";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#059669"];

export function ChartView({ block }: { block: ChartBlock }) {
  const data = block.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    block.datasets.forEach((ds) => { row[ds.label] = ds.values[i] ?? 0; });
    return row;
  });
  const pieData = block.labels.map((label, i) => ({
    name: label, value: block.datasets[0]?.values[i] ?? 0,
  }));

  return (
    <div className="py-4">
      {block.title && <p className="text-sm font-semibold text-center mb-3">{block.title}</p>}
      <ResponsiveContainer width="100%" height={300}>
        {block.chartType === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        ) : block.chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {block.datasets.length > 1 && <Legend />}
            {block.datasets.map((ds, i) => <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
