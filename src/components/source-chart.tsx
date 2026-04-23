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

// Grayscale ramp for B&W palette; we pick a shade per row deterministically.
const SHADES = ["#0A0A0A", "#2E2E2E", "#545452", "#7D7D7A", "#A8A8A4", "#C9C9C5"];

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
          tick={{ fill: "#A8A8A4", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "#6B6B68", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            boxShadow:
              "0 1px 2px 0 rgba(0,0,0,0.04), 0 8px 24px -6px rgba(0,0,0,0.12)",
            color: "#0A0A0A",
            fontSize: "0.8125rem",
          }}
          formatter={(value: number) => [value, "Leads"]}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, index) => (
            <Cell key={index} fill={SHADES[index % SHADES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
