import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

// Light → ink progression: fresh leads in soft glöd tints, mature stages in
// ink. Uses the Startupkompassen palette (paper/ink + warm accent).
const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-accent-soft text-fg-deep",
  contacted: "bg-[#FFCDBE] text-fg-deep",
  "meeting-booked": "bg-accent text-white",
  evaluating: "bg-[#3F3F3F] text-white",
  accepted: "bg-fg-deep text-white",
  declined: "bg-bg-deep text-muted line-through",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {config.label}
    </span>
  );
}
