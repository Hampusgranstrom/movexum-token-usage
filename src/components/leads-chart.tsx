"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCompact } from "@/lib/utils";

type Props = {
  data: Array<{ date: string; count: number }>;
};

export function LeadsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        Ingen data att visa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="#E6E6E2"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "#A8A8A4", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: "#A8A8A4", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompact(v, 0)}
          width={36}
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
          labelStyle={{ color: "#6B6B68" }}
          formatter={(value: number) => [value, "Leads"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#0A0A0A"
          strokeWidth={1.5}
          fill="url(#leadsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
