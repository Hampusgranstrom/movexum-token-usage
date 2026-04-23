/**
 * Minimalist chevron motif inspired by Movexum's branding. Pure SVG + CSS —
 * no images. Renders two stacked chevrons in the accent color at very low
 * opacity, meant as a decorative element behind hero sections.
 */
export function ChevronMark({
  className = "",
  size = 520,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 520 520"
      width={size}
      height={size}
      className={`pointer-events-none select-none ${className}`}
    >
      <defs>
        <linearGradient id="mv-chev" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-fg-deep)" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="mv-chev-2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path
        d="M20 120 L220 260 L20 400 L100 400 L300 260 L100 120 Z"
        fill="url(#mv-chev)"
      />
      <path
        d="M220 120 L420 260 L220 400 L300 400 L500 260 L300 120 Z"
        fill="url(#mv-chev-2)"
      />
    </svg>
  );
}
