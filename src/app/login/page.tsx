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
    <main className="relative min-h-screen overflow-hidden bg-fg-deep px-6 py-12 text-white sm:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,180,227,0.24),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(255,255,255,0.08),transparent_25%),linear-gradient(180deg,#082a38_0%,#0a3546_45%,#0d4053_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            Intern plattform
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Administrera <span className="text-accent-soft">Startupkompassen</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Här hanterar teamet moduler, kompassfrågor, leads, varumärke och den publika upplevelsen på startupkompassen.se.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">Överblick</p>
              <p className="mt-2 text-sm text-white/65">Följ inflödet, se dashboards och hantera leads i pipeline.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">Konfiguration</p>
              <p className="mt-2 text-sm text-white/65">Skapa moduler, ändra frågor och justera publika flöden utan att röra frontend.</p>
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-white/10 bg-white/95 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-2 rounded-[1.35rem] bg-fg-deep px-4 py-3 text-sm text-white/80">
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
