import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { listModules } from "@/lib/modules";

export const metadata = {
  title: "Movexum Startupkompass · Varumärke",
};

export const dynamic = "force-dynamic";

export default async function BrandSettingsPage() {
  const [user, brand, modules] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
    listModules(),
  ]);

  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <BrandSettingsForm
          initialLogoUrl={brand.logoUrl}
          initialThemeKey={brand.themeKey}
          initialLandingShowAiChat={brand.landingEntry.showAiChat}
          initialLandingVisibleModuleIds={brand.landingEntry.visibleModuleIds}
          availableModules={modules
            .filter((mod) => mod.is_active)
            .map((mod) => ({
              id: mod.id,
              name: mod.name,
              slug: mod.slug,
              flowType: mod.flow_type,
              description: mod.description,
            }))}
        />
      </main>
    </>
  );
}
