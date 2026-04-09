"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyUsage } from "@/lib/types";
import { formatCompact, formatNumber } from "@/lib/utils";

type Props = {
  data: DailyUsage[];
};

export function UsageChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: d.date,
    tokens: d.totalTokens,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="tokensGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#1F2230"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#5A6275"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            stroke="#5A6275"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <Tooltip
            cursor={{ stroke: "#22D3EE", strokeOpacity: 0.3 }}
            contentStyle={{
              backgroundColor: "#11131A",
              border: "1px solid #1F2230",
              borderRadius: 12,
              color: "#F5F7FA",
              fontSize: 12,
            }}
            labelStyle={{ color: "#9BA3B4", marginBottom: 4 }}
            formatter={(value: number) => [
              `${formatNumber(value)} tokens`,
              "Tokens",
            ]}
          />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#tokensGradient)"
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
