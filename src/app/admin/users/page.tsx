import { redirect } from "next/navigation";
import { AdminUsers } from "@/components/admin-users";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Movexum Startupkompass · Användare",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return <AdminUsers currentUserId={user.id} />;
}
