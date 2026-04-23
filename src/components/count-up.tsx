"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

type Props = {
  value: number;
  durationMs?: number;
  /** Hur många decimaler som ska visas. */
  decimals?: number;
};

/**
 * Räknar upp från 0 till `value` med en mjuk ease-out. Använder framer-motions
 * `animate` för att driva en motion value och skriver ut den formatterad.
 */
export function CountUp({ value, durationMs = 700, decimals = 0 }: Props) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, durationMs]);

  return (
    <span className="num">
      {new Intl.NumberFormat("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)}
    </span>
  );
}
