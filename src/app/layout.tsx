import type { Metadata } from "next";
import { Nunito_Sans, JetBrains_Mono } from "next/font/google";
import { WebVitalsLoader } from "@/components/web-vitals-loader";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <WebVitalsLoader />
        {children}
      </body>
    </html>
  );
}
