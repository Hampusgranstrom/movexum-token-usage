// Halftone planet + escaping satellite — Startupkompassen brand mark.
//
// Lower-hemisphere dot field with a diagonal (-22°) horizon line, a thin orbit
// ring, and a satellite leaving its orbit with a fading trail. Ported from
// the design prototype's logo-halftone.jsx.

type HalftoneProps = {
  size?: number;
  color?: string;
  bg?: string;
  showOrbit?: boolean;
};

export function Halftone({
  size = 96,
  color = "#FAF9F6",
  bg = "#0A0A0A",
  showOrbit = true,
}: HalftoneProps) {
  const cx = 50;
  const cy = 50;
  const R = 28;
  const step = 8.0;
  const rows = 8;

  const horizonAngle = -22;
  const hRad = (horizonAngle * Math.PI) / 180;
  const nx = -Math.sin(hRad);
  const ny = Math.cos(hRad);
  const horizonOffset = -1.5;
  const isBelow = (x: number, y: number) =>
    nx * (x - cx) + ny * (y - cy) > horizonOffset;

  const dots: React.ReactElement[] = [];
  for (let row = -rows; row <= rows; row++) {
    const y = cy + row * step * 0.866;
    const offset = row & 1 ? step / 2 : 0;
    for (let col = -rows; col <= rows; col++) {
      const x = cx + col * step + offset;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R - 0.6) continue;
      if (!isBelow(x, y)) continue;
      const t = d / R;
      const r = Math.max(0.85, 1.7 * (1 - t * 0.4));
      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={x.toFixed(2)}
          cy={y.toFixed(2)}
          r={r.toFixed(2)}
          fill={color}
        />,
      );
    }
  }

  const orbitR = R + 7;
  const satAngle = -65;
  const rad = (satAngle * Math.PI) / 180;
  const sx = cx + orbitR * Math.cos(rad);
  const sy = cy + orbitR * Math.sin(rad);
  const trailSpan = 150;
  const tailAngle = satAngle - trailSpan;
  const taRad = (tailAngle * Math.PI) / 180;
  const tsx = cx + orbitR * Math.cos(taRad);
  const tsy = cy + orbitR * Math.sin(taRad);

  // The gradient ID needs to be unique per render so multiple instances on the
  // same page don't collide. Including the size keeps it stable for SSR.
  const gradId = `halftone-trail-${color.replace("#", "")}-${size}`;

  return (
    <span
      style={{
        display: "inline-grid",
        width: size,
        height: size,
        placeItems: "center",
        verticalAlign: "middle",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
        {bg && bg !== "transparent" && <rect width="100" height="100" fill={bg} />}

        {showOrbit && (
          <circle
            cx={cx}
            cy={cy}
            r={orbitR}
            stroke={color}
            strokeOpacity="0.22"
            strokeWidth="0.55"
            fill="none"
          />
        )}

        {dots}

        {showOrbit && (
          <>
            <defs>
              <linearGradient
                id={gradId}
                x1={tsx}
                y1={tsy}
                x2={sx}
                y2={sy}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor={color} stopOpacity="0" />
                <stop offset="1" stopColor={color} stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d={`M ${tsx.toFixed(2)} ${tsy.toFixed(2)} A ${orbitR} ${orbitR} 0 0 1 ${sx.toFixed(2)} ${sy.toFixed(2)}`}
              stroke={`url(#${gradId})`}
              strokeWidth="1.0"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={sx.toFixed(2)} cy={sy.toFixed(2)} r="1.7" fill={color} />
          </>
        )}
      </svg>
    </span>
  );
}
