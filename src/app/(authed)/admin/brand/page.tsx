import { redirect } from "next/navigation";
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
  );
}
