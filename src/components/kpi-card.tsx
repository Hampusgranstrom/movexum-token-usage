"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CountUp } from "./count-up";
import { cn, formatPercent } from "@/lib/utils";

type AccentKey = "leads" | "sources" | "funnel" | "conversion";

type Props = {
  label: string;
  value: number;
  unit: string;
  delta: number;
  formula: string;
  accent: AccentKey;
  decimals?: number;
  index?: number;
};

const ACCENT_CLASSES: Record<
  AccentKey,
  { text: string; bg: string; border: string; glow: string }
> = {
  leads: {
    text: "text-accent-leads",
    bg: "bg-accent-leads/10",
    border: "border-accent-leads/30",
    glow: "shadow-[0_0_60px_-20px_#22D3EE]",
  },
  sources: {
    text: "text-accent-sources",
    bg: "bg-accent-sources/10",
    border: "border-accent-sources/30",
    glow: "shadow-[0_0_60px_-20px_#FACC15]",
  },
  funnel: {
    text: "text-accent-funnel",
    bg: "bg-accent-funnel/10",
    border: "border-accent-funnel/30",
    glow: "shadow-[0_0_60px_-20px_#4ADE80]",
  },
  conversion: {
    text: "text-accent-conversion",
    bg: "bg-accent-conversion/10",
    border: "border-accent-conversion/30",
    glow: "shadow-[0_0_60px_-20px_#A78BFA]",
  },
};

export function KpiCard({
  label,
  value,
  unit,
  delta,
  formula,
  accent,
  decimals = 0,
  index = 0,
}: Props) {
  const classes = ACCENT_CLASSES[accent];
  const deltaPositive = delta > 0.001;
  const deltaNegative = delta < -0.001;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "card group overflow-hidden p-6 transition-shadow",
        "hover:" + classes.glow,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          classes.bg,
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-current before:to-transparent",
          classes.text,
        )}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">
          {label}
        </span>
        <DeltaPill
          delta={delta}
          positive={deltaPositive}
          negative={deltaNegative}
        />
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <span className={cn("text-5xl font-semibold", classes.text)}>
          <CountUp value={value} decimals={decimals} />
        </span>
        <span className="text-base font-medium text-text-secondary">
          {unit}
        </span>
      </div>

      <p className="mt-4 text-xs text-text-muted">{formula}</p>
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
  const color = positive
    ? "text-accent-funnel"
    : negative
      ? "text-accent-danger"
      : "text-text-muted";

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border border-bg-border bg-bg-base/60 px-2 py-1 text-xs font-medium",
        color,
      )}
      title="Jämfört med föregående period"
    >
      <Icon className="h-3 w-3" />
      {formatPercent(delta)}
    </span>
  );
}
