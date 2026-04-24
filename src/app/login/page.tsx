import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Logga in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await getBrandSettings();
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-6 py-12 text-fg-deep sm:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,180,227,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,63,82,0.15),transparent_28%),linear-gradient(180deg,#eaf5fa_0%,#f3f9fc_45%,#fffdf8_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-fg-deep/15 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-fg-deep/75">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Intern plattform
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl leading-tight text-fg-deep sm:text-5xl lg:text-6xl">
              Administrera <span className="text-accent">Startupkompassen</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
              Här hanterar teamet moduler, kompassfrågor, leads, varumärke och den publika upplevelsen på startupkompassen.se.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-border bg-white/85 p-5 shadow-soft backdrop-blur-sm">
              <p className="text-sm font-medium text-fg-deep">Överblick</p>
              <p className="mt-2 text-sm text-muted">Följ inflödet, se dashboards och hantera leads i pipeline.</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-white/85 p-5 shadow-soft backdrop-blur-sm">
              <p className="text-sm font-medium text-fg-deep">Konfiguration</p>
              <p className="mt-2 text-sm text-muted">Skapa moduler, ändra frågor och justera publika flöden utan att röra frontend.</p>
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-border bg-white/96 p-3 shadow-[0_24px_60px_rgba(14,63,82,0.16)]">
          <div className="flex items-center gap-2 rounded-[1.35rem] bg-fg-deep/95 px-4 py-3 text-sm text-white/90">
            <LockKeyhole className="h-4 w-4 text-accent-soft" />
            Endast för Movexums administratörer
          </div>
          <div className="p-4 sm:p-6">
            <Suspense>
              <LoginForm productName={brand.productName} logoUrl={brand.logoUrl} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
