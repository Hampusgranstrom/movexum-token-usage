"use client";

/**
 * PartnerCarousel — Automatiskt rullande logotyprad för partners.
 *
 * Byt ut src-strängarna mot riktiga logotyp-URL:er och sätt useImage=true
 * när bilderna finns. Tills dess visas textbaserade platshållare.
 *
 * Karusellen loopar sömlöst med ren CSS-animation, ingen JS-timer.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Partner = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function PartnerCarousel({ partners }: { partners: Partner[] }) {
  const [ready, setReady] = useState(false);

  const visiblePartners = partners
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    setReady(true);
  }, []);

  if (visiblePartners.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-fg/70">
        Del av ekosystemet
      </p>

      {/* Overflow mask */}
      <div
        className="relative overflow-hidden py-1"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        }}
      >
        <div
          className={cn(
            "flex w-max gap-8 sm:gap-12",
            ready && "animate-marquee",
          )}
          aria-hidden="true"
        >
          {/* Duplicerade listor för sömlös loop */}
          {[...visiblePartners, ...visiblePartners].map((p, i) => (
            <PartnerItem key={`${p.id}-${i}`} partner={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerItem({ partner }: { partner: Partner }) {
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={partner.logoUrl}
      alt={partner.name}
      width="360"
      height="96"
      decoding="async"
      loading="lazy"
      className="h-16 w-auto max-w-[280px] object-contain opacity-95 transition hover:opacity-100 sm:h-20 sm:max-w-[360px]"
    />
  );

  return (
    <div className="flex h-20 min-w-[260px] items-center justify-center px-3 sm:h-24 sm:min-w-[340px] sm:px-4">
      {partner.websiteUrl ? (
        <a href={partner.websiteUrl} target="_blank" rel="noreferrer" aria-label={partner.name}>
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
