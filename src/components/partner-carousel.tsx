"use client";

/**
 * PartnerCarousel — Automatiskt rullande logotyprad för partners.
 *
 * Byt ut src-strängarna mot riktiga logotyp-URL:er och sätt useImage=true
 * när bilderna finns. Tills dess visas textbaserade platshållare.
 *
 * Karusellen loopar sömlöst med ren CSS-animation, ingen JS-timer.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Partner = {
  name: string;
  /** Valfri logotyp-URL. Om saknas visas textplatshållare. */
  logoUrl?: string;
};

const PARTNERS: Partner[] = [
  { name: "Gävle kommun" },
  { name: "Bollnäs kommun" },
  { name: "Sandviken kommun" },
  { name: "Hofors kommun" },
  { name: "Ockelbo kommun" },
  { name: "Nyföretagarcentrum" },
  { name: "Region Gävleborg" },
  { name: "Movexum" },
];

export function PartnerCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Del av ekosystemet
      </p>

      {/* Overflow mask */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div
          ref={trackRef}
          className={cn(
            "flex w-max gap-6",
            ready && "animate-marquee",
          )}
          aria-hidden="true"
        >
          {/* Duplicerade listor för sömlös loop */}
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <PartnerItem key={i} partner={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerItem({ partner }: { partner: Partner }) {
  return (
    <div className="flex h-12 min-w-[160px] items-center justify-center rounded-xl border border-border bg-white/80 px-5 shadow-soft">
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className="h-7 w-auto max-w-[130px] object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0"
        />
      ) : (
        <span className="whitespace-nowrap text-xs font-medium text-muted">
          {partner.name}
        </span>
      )}
    </div>
  );
}
