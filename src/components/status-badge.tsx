import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

// Teal → accent hierarchy matching the Movexum palette.
const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-accent-soft text-fg-deep",
  contacted: "bg-[#BFE5F3] text-fg-deep",
  "meeting-booked": "bg-accent text-white",
  evaluating: "bg-[#2E7691] text-white",
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
