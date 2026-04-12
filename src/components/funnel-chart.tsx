"use client";

import { motion } from "framer-motion";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FunnelItem = {
  status: LeadStatus;
  label: string;
  count: number;
};

const FUNNEL_COLORS: Record<string, string> = {
  new: "bg-accent-leads",
  contacted: "bg-accent-sources",
  "meeting-booked": "bg-accent-funnel",
  evaluating: "bg-text-secondary",
  accepted: "bg-accent-conversion",
  declined: "bg-accent-danger",
};

export function FunnelChart({ data }: { data: FunnelItem[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Show funnel without the "declined" stage (it's not part of the progression)
  const funnelStages = data.filter((d) => d.status !== "declined");
  const declinedStage = data.find((d) => d.status === "declined");

  return (
    <div className="space-y-3">
      {funnelStages.map((item, i) => {
        const widthPercent = Math.max(10, (item.count / maxCount) * 100);
        return (
          <motion.div
            key={item.status}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <span className="w-24 text-right text-xs text-text-secondary">
              {item.label}
            </span>
            <div className="relative flex-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ delay: i * 0.06 + 0.2, duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "h-7 rounded-r-md",
                  FUNNEL_COLORS[item.status] ?? "bg-text-muted",
                  "opacity-70",
                )}
              />
            </div>
            <span className="w-10 text-right font-mono text-sm text-text-primary">
              {item.count}
            </span>
          </motion.div>
        );
      })}

      {declinedStage && declinedStage.count > 0 && (
        <div className="mt-2 flex items-center gap-3 border-t border-bg-border pt-3">
          <span className="w-24 text-right text-xs text-text-muted">
            {declinedStage.label}
          </span>
          <div className="relative flex-1">
            <div
              className="h-5 rounded-r-md bg-accent-danger opacity-40"
              style={{
                width: `${Math.max(8, (declinedStage.count / maxCount) * 100)}%`,
              }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm text-text-muted">
            {declinedStage.count}
          </span>
        </div>
      )}
    </div>
  );
}
