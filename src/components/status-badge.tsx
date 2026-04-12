import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  "accent-leads": "bg-accent-leads/15 text-accent-leads border-accent-leads/30",
  "accent-sources": "bg-accent-sources/15 text-accent-sources border-accent-sources/30",
  "accent-funnel": "bg-accent-funnel/15 text-accent-funnel border-accent-funnel/30",
  "accent-conversion": "bg-accent-conversion/15 text-accent-conversion border-accent-conversion/30",
  "accent-danger": "bg-accent-danger/15 text-accent-danger border-accent-danger/30",
  "text-secondary": "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status];
  const colorClasses = COLOR_MAP[config.color] ?? COLOR_MAP["text-secondary"];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colorClasses,
      )}
    >
      {config.label}
    </span>
  );
}
