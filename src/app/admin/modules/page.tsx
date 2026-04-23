import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { AdminModules } from "@/components/admin-modules";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const metadata = { title: "Movexum Startupkompass · Moduler" };
export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/");

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <AdminModules />
      </main>
    </>
  );
}
