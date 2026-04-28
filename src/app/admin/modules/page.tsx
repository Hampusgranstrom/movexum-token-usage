import { redirect } from "next/navigation";
import { AdminModules } from "@/components/admin-modules";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Movexum Startupkompass · Moduler" };
export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return <AdminModules />;
}
