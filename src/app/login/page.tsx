import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ShieldCheck } from "lucide-react";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Logga in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await getBrandSettings();
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-6 py-12 text-fg-deep sm:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_16%,rgba(56,180,227,0.16),transparent_34%),radial-gradient(circle_at_82%_4%,rgba(14,63,82,0.12),transparent_30%),linear-gradient(180deg,#eef8fc_0%,#f7fbfd_52%,#ffffff_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-fg-deep/10 bg-white/65 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-fg-deep/75">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Intern plattform
          </span>

          <div className="space-y-5">
            <h1 className="text-4xl leading-tight text-fg-deep sm:text-5xl lg:text-[3.55rem]">
              Administrera Startupkompassen
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
              Här hanterar teamet moduler, kompassfrågor, leads, varumärke och den publika upplevelsen på startupkompassen.se.
            </p>
          </div>

          <div className="max-w-lg border-l border-fg-deep/10 pl-4">
            <p className="text-sm leading-6 text-muted">
              Endast inbjudna administratörer har åtkomst. All aktivitet loggas för intern granskning och säkerhetsuppföljning.
            </p>
          </div>
        </section>

        <section>
          <Suspense>
            <LoginForm productName={brand.productName} logoUrl={brand.logoUrl} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
