import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Nunito_Sans, JetBrains_Mono } from "next/font/google";
import { WebVitalsLoader } from "@/components/web-vitals-loader";
import { getBrandSettings } from "@/lib/brand";
import { themeStyleVars } from "@/lib/themes";
import "./globals.css";

const sans = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Movexum Startupkompass",
  description:
    "AI-drivet verktyg för att hantera inflöde av idébärare till Movexums inkubator.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getBrandSettings();
  // CSS-variables for the active theme override the defaults set in
  // globals.css for the entire app — including admin pages.
  const themeStyle = themeStyleVars(brand.theme) as CSSProperties;

  return (
    <html
      lang="sv"
      className={`${sans.variable} ${mono.variable}`}
      style={themeStyle}
      data-theme={brand.themeKey}
    >
      <body className="min-h-screen">
        <ThemeSurface
          adminThemeId={brand.themeSettings.adminThemeId}
          publicThemeId={brand.themeSettings.publicThemeId}
        />
        <WebVitalsLoader />
        {children}
      </body>
    </html>
  );
}
