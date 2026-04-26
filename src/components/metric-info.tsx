"use client";

import { Info } from "lucide-react";

export function MetricInfo({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        tabIndex={0}
        role="img"
        aria-label={`Info: ${text}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-subtle outline-none transition hover:text-fg-deep focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Info className="h-3.5 w-3.5" />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-white px-3 py-2 text-[11px] leading-snug normal-case tracking-normal text-muted opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}
