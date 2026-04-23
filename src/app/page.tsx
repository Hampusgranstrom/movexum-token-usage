import { Dashboard } from "@/components/dashboard";
import { Nav } from "@/components/nav";
import { PartnersCarousel } from "@/components/partners-carousel";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { getActivePartnerLogos } from "@/lib/partners";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, brand, partners] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
    getActivePartnerLogos(),
  ]);

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="space-y-12">
          <Dashboard />
          <PartnersCarousel partners={partners} tone="light" />
        </div>
      </main>
    </>
  );
}
