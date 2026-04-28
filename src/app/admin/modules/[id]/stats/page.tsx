import { redirect } from "next/navigation";
import { ModuleStats } from "@/components/admin-module-stats";
import { getCurrentUser } from "@/lib/auth";
import { getModuleById } from "@/lib/modules";

export const metadata = { title: "Movexum Startupkompass · Modulstatistik" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const [user, mod] = await Promise.all([getCurrentUser(), getModuleById(id)]);
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");
  if (!mod) redirect("/admin/modules");

  return <ModuleStats moduleId={mod.id} moduleName={mod.name} />;
}
