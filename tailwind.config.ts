import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0A0B0F",
          card: "#11131A",
          cardHover: "#161923",
          border: "#1F2230",
        },
        accent: {
          leads: "#22D3EE",
          sources: "#FACC15",
          funnel: "#4ADE80",
          conversion: "#A78BFA",
          danger: "#F87171",
        },
        text: {
          primary: "#F5F7FA",
          secondary: "#9BA3B4",
          muted: "#5A6275",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -10px currentColor",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.15), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
