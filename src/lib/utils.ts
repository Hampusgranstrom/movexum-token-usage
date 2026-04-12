import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatterar stora tal med kompakta suffix (K, M, B).
 * Använder svensk lokalisering med komma som decimaltecken.
 */
export function formatCompact(value: number, digits = 1): string {
  return new Intl.NumberFormat("sv-SE", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

/**
 * Formaterar ett ISO-datum till svenskt kort format (t.ex. "12 apr 2026").
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
