"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CountUp } from "./count-up";
import { MetricInfo } from "./metric-info";
import { cn, formatPercent } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: number;
  unit: string;
  delta: number;
  formula: string;
  info?: string;
  decimals?: number;
  index?: number;
};

export function KpiCard({
  label,
  value,
  unit,
  delta,
  formula,
  info,
  decimals = 0,
  index = 0,
}: Props) {
  const deltaPositive = delta > 0.001;
  const deltaNegative = delta < -0.001;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="card p-6"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow inline-flex items-center gap-1.5">
          {label}
          {info ? <MetricInfo text={info} /> : null}
        </span>
        <DeltaPill
          delta={delta}
          positive={deltaPositive}
          negative={deltaNegative}
        />
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight text-fg-deep">
          <CountUp value={value} decimals={decimals} />
        </span>
        <span className="text-base font-medium text-muted">{unit}</span>
      </div>

      <p className="mt-4 text-xs text-muted">{formula}</p>
    </motion.div>
  );
}

function DeltaPill({
  delta,
  positive,
  negative,
}: {
  delta: number;
  positive: boolean;
  negative: boolean;
}) {
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const classes = positive
    ? "bg-accent-soft text-fg-deep"
    : negative
      ? "bg-[#FCE4E9] text-danger"
      : "bg-bg text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        classes,
      )}
      title="Jämfört med föregående period"
    >
      <Icon className="h-3 w-3" />
      {formatPercent(delta)}
    </span>
  );
}
