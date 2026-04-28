import dynamicImport from "next/dynamic";
import { getDashboardSummary } from "@/lib/dashboard-summary";

const Dashboard = dynamicImport(
  () => import("@/components/dashboard").then((m) => m.Dashboard),
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
  title: "Movexum Startupkompass · Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary(30);
  return <Dashboard initialData={summary} />;
}
