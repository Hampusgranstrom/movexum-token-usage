import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);

  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg lg:pl-64">
      <AdminSidebar user={user} brand={brand} />
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        {children}
      </main>
    </div>
  );
}
