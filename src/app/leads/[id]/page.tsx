import { LeadDetail } from "@/components/lead-detail";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Lead",
};

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <LeadDetail id={id} canManagePii={user?.role === "superadmin"} />
      </main>
    </>
  );
}
