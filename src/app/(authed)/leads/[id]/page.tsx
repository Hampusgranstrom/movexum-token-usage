import { LeadDetail } from "@/components/lead-detail";
import { getCurrentUser } from "@/lib/auth";

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
  const user = await getCurrentUser();
  return <LeadDetail id={id} canManagePii={user?.role === "superadmin"} />;
}
