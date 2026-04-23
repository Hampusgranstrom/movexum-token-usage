import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ModuleStats } from "@/components/admin-module-stats";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { getModuleById } from "@/lib/modules";

export const metadata = { title: "Movexum Startupkompass · Modulstatistik" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const [user, brand, mod] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
    getModuleById(id),
  ]);
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/");
  if (!mod) redirect("/admin/modules");

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <ModuleStats moduleId={mod.id} moduleName={mod.name} />
      </main>
    </>
  );
}
