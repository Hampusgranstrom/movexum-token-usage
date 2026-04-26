import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Logga in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await getBrandSettings();
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-6 py-10 text-fg-deep sm:px-10 sm:py-12">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 18% 12%, var(--color-accent-soft) 0%, transparent 62%), radial-gradient(ellipse 65% 52% at 90% 0%, color-mix(in oklab, var(--color-fg-deep) 10%, transparent) 0%, transparent 66%), linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 48%, var(--color-bg-deep) 100%)",
        }}
      />

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <section className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-fg-deep/80 shadow-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Intern plattform
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl leading-[1.02] text-fg-deep sm:text-5xl lg:text-[3.4rem]">
              Administrera Startupkompassen
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Här hanterar teamet moduler, kompassfrågor, leads, varumärke och den publika upplevelsen på startupkompassen.se.
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-xl">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/65 px-4 py-3 shadow-soft">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-accent" />
              <p className="text-sm leading-6 text-muted">
                Endast inbjudna administratörer har åtkomst.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/65 px-4 py-3 shadow-soft">
              <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
              <p className="text-sm leading-6 text-muted">
                Säkerhetshändelser loggas automatiskt för granskning och uppföljning.
              </p>
            </div>
          </div>
        </section>

        <section className="relative">
          <div
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] blur-2xl"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <Suspense>
            <LoginForm productName={brand.productName} logoUrl={brand.logoUrl} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
