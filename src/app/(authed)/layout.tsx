import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, brand] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg md:pl-64">
      <AppSidebar user={user} brand={brand} />
      <main className="px-6 py-12 sm:px-10 sm:py-16">
        {children}
      </main>
    </div>
  );
}
