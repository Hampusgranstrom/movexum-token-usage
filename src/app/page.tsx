import Link from "next/link";
import { ArrowRight, Bot, Compass, Lightbulb } from "lucide-react";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brand = await getBrandSettings();
  const adminHost = process.env.ADMIN_HOST;
  const adminLoginHref = adminHost
    ? `${adminHost === "localhost" ? "http" : "https"}://${adminHost}/login`
    : "/login";

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-6 py-8 sm:px-10 sm:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(56,180,227,0.22),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(14,63,82,0.16),transparent_36%),linear-gradient(180deg,#eaf5fa_0%,#f5fbfd_46%,#fffdf7_100%)]" />
      <div className="absolute left-[-8rem] top-24 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute bottom-[-7rem] right-[-5rem] -z-10 h-72 w-72 rounded-full bg-fg/10 blur-3xl" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.productName}
                className="h-8 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span className="text-xl font-semibold tracking-tight text-fg-deep">
                {brand.productName.toLowerCase()}
              </span>
            )}
          </div>

          <Link
            href={adminLoginHref}
            className="rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-medium text-fg-deep transition hover:bg-white"
          >
            Adminplattform
          </Link>
        </header>

        <div className="space-y-8 pt-6">
          <div className="space-y-4">
            <span className="eyebrow inline-flex rounded-full bg-white/80 px-3 py-1 shadow-soft">
              Startupkompassen
            </span>
            <h1 className="max-w-4xl text-5xl leading-[1.02] text-fg-deep sm:text-6xl lg:text-7xl">
              Välj spår och få nästa steg för din idé
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Börja med ett kort test om dig själv eller din idé. När du är klar kan du lämna kontaktuppgifter så att teamet återkopplar.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-[2rem] border border-border bg-white/92 p-7 shadow-card lg:col-span-1">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow">Entreprenör</span>
                <Compass className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-3 text-2xl">Förstå din entreprenörsprofil</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Drivkrafter, beteenden och uthållighet i osäkra lägen.
              </p>
              <div className="mt-6">
                <Link href="/m/entreprenor" className="btn-primary">
                  <ArrowRight className="h-4 w-4" />
                  Starta entreprenörstestet
                </Link>
              </div>
            </article>

            <article className="rounded-[2rem] border border-border bg-white/92 p-7 shadow-card lg:col-span-1">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow">Idépotential</span>
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-3 text-2xl">Testa idéns styrka</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Problem, kund, konkurrens och möjligheten att skala.
              </p>
              <div className="mt-6">
                <Link href="/m/innovation" className="btn-primary">
                  <ArrowRight className="h-4 w-4" />
                  Testa idépotential
                </Link>
              </div>
            </article>

            <article className="rounded-[2rem] border border-fg-deep/10 bg-fg-deep p-7 text-white shadow-card lg:col-span-1">
              <span className="eyebrow text-white/70">Öppen väg in</span>
              <h2 className="mt-3 text-2xl">Vill du hellre börja i samtal?</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Använd fri AI-chatt och lämna kontaktuppgifter när du är klar.
              </p>
              <div className="mt-6">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-fg-deep transition hover:bg-white/90"
                >
                  <Bot className="h-4 w-4" />
                  Öppna fri chatt
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
