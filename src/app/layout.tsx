import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="sv" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
