import { redirect } from "next/navigation";
import dynamicImport from "next/dynamic";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { getAnalysisSummary } from "@/lib/analysis-summary";

const AnalysisDashboard = dynamicImport(
  () => import("@/components/analysis-dashboard").then((m) => m.AnalysisDashboard),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-full bg-bg-deep" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-40 animate-pulse p-6" />
          ))}
        </div>
      </div>
    ),
  },
);

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

  const summary = await getAnalysisSummary(30);

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <AnalysisDashboard initialData={summary} />
      </main>
    </>
  );
}
