// Color theme presets — sparas via brand_settings.key = "theme".
//
// Globala CSS-variablerna (--color-*) deklareras i globals.css som fallback
// (Startupkompassen-paletten). Layout läser aktivt tema och sätter samma
// variabler inline på <html>, vilket åsidosätter fallback för hela appen.

export type ThemeKey = "startupkompassen" | "movexum";

export type ThemeColors = {
  bg: string;
  "bg-deep": string;
  surface: string;
  fg: string;
  "fg-deep": string;
  muted: string;
  subtle: string;
  border: string;
  accent: string;
  "accent-soft": string;
  danger: string;
  success: string;
};

export type ThemeDefinition = {
  key: ThemeKey;
  name: string;
  description: string;
  colors: ThemeColors;
};

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  startupkompassen: {
    key: "startupkompassen",
    name: "Startupkompassen",
    description:
      "Paper, ink och en varm glöd. Bygd kring halvtonsplanetens signatur.",
    colors: {
      bg: "#FAFAFA",
      "bg-deep": "#F2F2F2",
      surface: "#FFFFFF",
      fg: "#3F3F3F",
      "fg-deep": "#0A0A0A",
      muted: "#737373",
      subtle: "#A3A3A3",
      border: "#E5E5E5",
      accent: "#FF5A3C",
      "accent-soft": "#FFE0D9",
      danger: "#B6374E",
      success: "#177A55",
    },
  },
  movexum: {
    key: "movexum",
    name: "Movexum",
    description:
      "Petrolblå djup och himmelsblå accent — Movexums ursprungliga profil.",
    colors: {
      bg: "#EAF5FA",
      "bg-deep": "#DCEEF5",
      surface: "#FFFFFF",
      fg: "#0E3F52",
      "fg-deep": "#0A3546",
      muted: "#5A7886",
      subtle: "#9EB7C2",
      border: "#D4E7EF",
      accent: "#38B4E3",
      "accent-soft": "#BFE5F3",
      danger: "#B6374E",
      success: "#177A55",
    },
  },
};

export const DEFAULT_THEME: ThemeKey = "startupkompassen";

export function isThemeKey(value: unknown): value is ThemeKey {
  return value === "startupkompassen" || value === "movexum";
}

export function getTheme(
  key: ThemeKey | string | null | undefined,
): ThemeDefinition {
  if (typeof key === "string" && isThemeKey(key)) return THEMES[key];
  return THEMES[DEFAULT_THEME];
}

export function themeStyleVars(
  theme: ThemeDefinition,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.colors)) {
    out[`--color-${k}`] = v;
  }
  return out;
}
