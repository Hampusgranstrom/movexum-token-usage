"use client";

import { motion } from "framer-motion";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FunnelItem = {
  status: LeadStatus;
  label: string;
  count: number;
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-[#BFE5F3]",
  contacted: "bg-[#7ECCE7]",
  "meeting-booked": "bg-[#38B4E3]",
  evaluating: "bg-[#2E7691]",
  accepted: "bg-[#0E3F52]",
  declined: "bg-[#E6D0D4]",
};

export function FunnelChart({ data }: { data: FunnelItem[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const funnelStages = data.filter((d) => d.status !== "declined");
  const declinedStage = data.find((d) => d.status === "declined");

  return (
    <div className="space-y-3">
      {funnelStages.map((item, i) => {
        const widthPercent = Math.max(10, (item.count / maxCount) * 100);
        return (
          <motion.div
            key={item.status}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span className="w-28 text-right text-xs text-muted">
              {item.label}
            </span>
            <div className="relative flex-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{
                  delay: i * 0.04 + 0.1,
                  duration: 0.5,
                  ease: "easeOut",
                }}
                className={cn(
                  "h-7 rounded-full",
                  STAGE_COLORS[item.status] ?? "bg-subtle",
                )}
              />
            </div>
            <span className="w-10 text-right font-mono text-sm text-fg-deep">
              {item.count}
            </span>
          </motion.div>
        );
      })}

      {declinedStage && declinedStage.count > 0 && (
        <div className="mt-2 flex items-center gap-3 pt-3">
          <span className="w-28 text-right text-xs text-subtle">
            {declinedStage.label}
          </span>
          <div className="relative flex-1">
            <div
              className="h-5 rounded-full bg-[#E6D0D4]"
              style={{
                width: `${Math.max(8, (declinedStage.count / maxCount) * 100)}%`,
              }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm text-muted">
            {declinedStage.count}
          </span>
        </div>
      )}
    </div>
  );
}
