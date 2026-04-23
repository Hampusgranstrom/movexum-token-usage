import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerLogo } from "@/lib/partners";

type Tone = "light" | "deep";

type Props = {
  partners: PartnerLogo[];
  eyebrow?: string;
  heading?: string;
  description?: string;
  tone?: Tone;
  className?: string;
  /**
   * Seconds per full cycle. The marquee duplicates the track, so the
   * perceived duration is this value. Lower = faster.
   */
  speedSeconds?: number;
};

/**
 * Infinite, horizontally scrolling logotyp-karusell. Renders placeholders
 * when there are no (or too few) partners so the section keeps its shape
 * while Movexum is still onboarding kommuner.
 *
 * Server component: purely CSS-driven marquee, no hydration cost.
 */
export function PartnersCarousel({
  partners,
  eyebrow = "I samarbete med",
  heading = "Kommuner som bygger framtidens näringsliv",
  description = "Movexum är en regional inkubator som medfinansieras av kommuner i Gävleborg. Tillsammans hjälper vi kommande entreprenörer att växa.",
  tone = "light",
  className,
  speedSeconds = 45,
}: Props) {
  const active = partners.filter((p) => p.active);
  const filled = ensureMinimumItems(active, 6);

  // Duplicate the list so a -50% translateX produces a seamless loop.
  const loop = [...filled, ...filled];

  const isDeep = tone === "deep";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12",
        isDeep
          ? "bg-fg-deep text-white shadow-pop"
          : "bg-surface text-fg shadow-card",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60",
          isDeep
            ? "bg-[radial-gradient(ellipse_at_top_right,rgba(56,180,227,0.35),transparent_60%)]"
            : "bg-[radial-gradient(ellipse_at_top_right,rgba(191,229,243,0.7),transparent_60%)]",
        )}
      />

      <div className="relative flex flex-col gap-8">
        <header className="max-w-2xl">
          <span
            className={cn(
              "eyebrow",
              isDeep ? "text-accent-soft" : "text-muted",
            )}
          >
            {eyebrow}
          </span>
          <h2
            className={cn(
              "mt-3 text-2xl sm:text-3xl",
              isDeep ? "text-white" : undefined,
            )}
          >
            {heading}
          </h2>
          {description && (
            <p
              className={cn(
                "mt-3 text-sm sm:text-base",
                isDeep ? "text-white/70" : "text-muted",
              )}
            >
              {description}
            </p>
          )}
        </header>

        <div className="relative">
          {/* Edge fade masks */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-24",
              isDeep
                ? "bg-gradient-to-r from-fg-deep to-transparent"
                : "bg-gradient-to-r from-surface to-transparent",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-24",
              isDeep
                ? "bg-gradient-to-l from-fg-deep to-transparent"
                : "bg-gradient-to-l from-surface to-transparent",
            )}
          />

          <div
            className="group flex overflow-hidden"
            style={
              {
                "--marquee-duration": `${speedSeconds}s`,
              } as React.CSSProperties
            }
          >
            <ul
              className="flex shrink-0 items-center gap-4 pr-4 animate-marquee [animation-play-state:running] group-hover:[animation-play-state:paused] motion-reduce:[animation:none]"
              aria-label="Partnerlogotyper"
            >
              {loop.map((partner, i) => (
                <PartnerCard
                  key={`${partner.id}-${i}`}
                  partner={partner}
                  tone={tone}
                  // The second half is purely decorative for the loop.
                  ariaHidden={i >= filled.length}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

type CardPartner = PartnerLogo & { isPlaceholder?: boolean };

function PartnerCard({
  partner,
  tone,
  ariaHidden,
}: {
  partner: CardPartner;
  tone: Tone;
  ariaHidden: boolean;
}) {
  const isDeep = tone === "deep";
  const body = (
    <div
      className={cn(
        "relative flex h-24 w-48 flex-none items-center justify-center rounded-2xl px-6 transition",
        "sm:h-28 sm:w-56",
        isDeep
          ? "bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
          : "bg-bg ring-1 ring-border hover:shadow-soft",
        partner.isPlaceholder && "opacity-60",
      )}
    >
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className={cn(
            "max-h-14 max-w-[75%] object-contain",
            isDeep ? "brightness-[1.05] contrast-110" : undefined,
          )}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 text-xs font-medium",
            isDeep ? "text-white/60" : "text-subtle",
          )}
        >
          <Building2 className="h-4 w-4" aria-hidden />
          <span className="truncate">
            {partner.isPlaceholder ? "Din kommun här" : partner.name}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <li
      className="list-none"
      aria-hidden={ariaHidden ? true : undefined}
    >
      {partner.url && !partner.isPlaceholder ? (
        <Link
          href={partner.url}
          target="_blank"
          rel="noreferrer noopener"
          title={partner.name}
          className="block"
        >
          {body}
        </Link>
      ) : (
        <div title={partner.name}>{body}</div>
      )}
    </li>
  );
}

function ensureMinimumItems(
  partners: PartnerLogo[],
  min: number,
): CardPartner[] {
  if (partners.length >= min) return partners;
  const out: CardPartner[] = [...partners];
  const labels = [
    "Din kommun här",
    "Medfinansiär",
    "Samarbete sökes",
    "Logotyp här",
    "Er organisation",
    "Partner till Movexum",
  ];
  let i = 0;
  while (out.length < min) {
    out.push({
      id: `placeholder-${i}`,
      name: labels[i % labels.length],
      url: null,
      logoUrl: null,
      sortOrder: 9999 + i,
      active: true,
      createdAt: new Date(0).toISOString(),
      isPlaceholder: true,
    });
    i++;
  }
  return out;
}
