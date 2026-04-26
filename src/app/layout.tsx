import type { Metadata } from "next";
import { Nunito_Sans, JetBrains_Mono } from "next/font/google";
import { WebVitalsLoader } from "@/components/web-vitals-loader";
import { ThemeSurface } from "@/components/theme-surface";
import { getBrandSettings } from "@/lib/brand";
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

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getBrandSettings();

  return (
    <html
      lang="sv"
      className={`${sans.variable} ${mono.variable}`}
      data-active-theme={brand.themeSettings.publicThemeId}
      data-admin-theme={brand.themeSettings.adminThemeId}
      data-public-theme={brand.themeSettings.publicThemeId}
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
