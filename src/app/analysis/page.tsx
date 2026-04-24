import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Analys",
};

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);

  if (!user) {
    redirect("/login?redirect=/analysis");
  }

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <AnalysisDashboard />
      </main>
    </>
  );
}
