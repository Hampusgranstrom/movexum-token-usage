import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { AdminUsers } from "@/components/admin-users";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Användare",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);

  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <AdminUsers currentUserId={user.id} />
      </main>
    </>
  );
}
