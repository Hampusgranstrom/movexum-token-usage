import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

// Grayscale hierarchy: darker = further along the funnel, plus a distinct
// treatment for declined.
const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-bg text-fg",
  contacted: "bg-[#EAEAE6] text-fg",
  "meeting-booked": "bg-[#2E2E2E] text-surface",
  evaluating: "bg-[#545452] text-surface",
  accepted: "bg-fg text-surface",
  declined: "bg-bg text-subtle line-through",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {config.label}
    </span>
  );
}
