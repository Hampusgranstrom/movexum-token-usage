import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { PartnersAdmin } from "@/components/partners-admin";
import { PartnersCarousel } from "@/components/partners-carousel";
import { getCurrentUser } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { getAllPartnerLogos } from "@/lib/partners";

export const metadata = {
  title: "Movexum Startupkompass · Partners",
};

export const dynamic = "force-dynamic";

export default async function PartnersAdminPage() {
  const [user, brand, partners] = await Promise.all([
    getCurrentUser(),
    getBrandSettings(),
    getAllPartnerLogos(),
  ]);

  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/");

  return (
    <>
      <Nav user={user} brand={brand} />
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="space-y-12">
          <PartnersAdmin />

          <section className="space-y-4">
            <div>
              <span className="eyebrow">Förhandsgranskning</span>
              <h2 className="mt-2 text-2xl">Så här ser det ut på hemsidan</h2>
              <p className="mt-2 text-sm text-muted">
                Karusellen uppdateras direkt när du lägger till, döljer eller
                ändrar ordning på partners.
              </p>
            </div>
            <PartnersCarousel
              partners={partners.filter((p) => p.active)}
              tone="light"
            />
          </section>
        </div>
      </main>
    </>
  );
}
