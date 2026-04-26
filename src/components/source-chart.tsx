"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = {
  data: Array<{
    source_id: string;
    label: string;
    count: number;
    color: string;
  }>;
};

// Startupkompassen palette — ink → glöd progression for chart bars.
const SHADES = ["#0A0A0A", "#3F3F3F", "#FF5A3C", "#FF8770", "#FFB39E", "#FFE0D9"];

export function SourceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted">
        Ingen data att visa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fill: "#A3A3A3", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "#737373", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: "14px",
            boxShadow:
              "0 2px 4px 0 rgba(10,10,10,0.05), 0 12px 30px -10px rgba(10,10,10,0.16)",
            color: "#0A0A0A",
            fontSize: "0.8125rem",
          }}
          formatter={(value: number) => [value, "Leads"]}
        />
        <Bar dataKey="count" radius={[0, 999, 999, 0]} barSize={18}>
          {data.map((_, index) => (
            <Cell key={index} fill={SHADES[index % SHADES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
