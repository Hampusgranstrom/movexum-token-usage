import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-deep": "var(--color-bg-deep)",
        surface: "var(--color-surface)",
        fg: "var(--color-fg)",
        "fg-deep": "var(--color-fg-deep)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(10, 10, 10, 0.04), 0 4px 14px -4px rgba(10, 10, 10, 0.08)",
        card: "0 2px 4px 0 rgba(10, 10, 10, 0.05), 0 12px 30px -10px rgba(10, 10, 10, 0.10)",
        pop: "0 4px 12px -2px rgba(10, 10, 10, 0.08), 0 24px 48px -12px rgba(10, 10, 10, 0.16)",
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "22px",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
