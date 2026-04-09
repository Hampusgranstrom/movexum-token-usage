import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movexum · AI Token Usage",
  description:
    "Movexums totala AI-token-användning omvandlat till energi och CO₂e.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
