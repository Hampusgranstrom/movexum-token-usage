import Link from "next/link";
import { ArrowRight, Bot, Compass, Lightbulb } from "lucide-react";
import { PartnerCarousel } from "@/components/partner-carousel";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brand = await getBrandSettings();
  const homepagePartners = brand.partnerLogos.filter(
    (partner) => !/movexum/i.test(partner.name),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-4 py-6 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(56,180,227,0.22),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(14,63,82,0.16),transparent_36%),linear-gradient(180deg,#eaf5fa_0%,#f5fbfd_46%,#fffdf7_100%)]" />
      <div className="absolute left-[-8rem] top-24 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute bottom-[-7rem] right-[-5rem] -z-10 h-72 w-72 rounded-full bg-fg/10 blur-3xl" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 sm:gap-12">
        <div className="space-y-7 pt-1 sm:space-y-8 sm:pt-2">
          <div className="space-y-3 sm:space-y-4">
            <span className="eyebrow inline-flex rounded-full bg-white/80 px-3 py-1 shadow-soft">
              Startupkompassen
            </span>
            <h1 className="max-w-4xl text-3xl leading-[1.05] text-fg-deep sm:text-5xl sm:leading-[1.02] lg:text-7xl">
              Välkommen till startupkompassen. Testa din idé och entreprenöriella förmåga med startupkompassen!
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7 lg:text-lg">
              Börja med ett kort test om dig själv eller din idé. När du är klar kan du lämna kontaktuppgifter så att teamet återkopplar.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <article className="rounded-[1.75rem] border border-border bg-white/92 p-5 shadow-card sm:rounded-[2rem] sm:p-7 lg:col-span-1">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow">Entreprenör</span>
                <Compass className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl">Förstå din entreprenörsprofil</h2>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-[15px]">
                Drivkrafter, beteenden och uthållighet i osäkra lägen.
              </p>
              <div className="mt-6">
                <Link href="/m/entreprenor" className="btn-primary w-full justify-center sm:w-auto">
                  <ArrowRight className="h-4 w-4" />
                  Starta entreprenörstestet
                </Link>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-border bg-white/92 p-5 shadow-card sm:rounded-[2rem] sm:p-7 lg:col-span-1">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow">Idépotential</span>
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl">Testa idéns styrka</h2>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-[15px]">
                Problem, kund, konkurrens och möjligheten att skala.
              </p>
              <div className="mt-6">
                <Link href="/m/innovation" className="btn-primary w-full justify-center sm:w-auto">
                  <ArrowRight className="h-4 w-4" />
                  Testa idépotential
                </Link>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-fg-deep/10 bg-fg-deep p-5 text-white shadow-card sm:rounded-[2rem] sm:p-7 lg:col-span-1">
              <span className="eyebrow text-white/70">Öppen väg in</span>
              <h2 className="mt-3 text-xl text-white sm:text-2xl">Vill du hellre börja i samtal?</h2>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-[15px]">
                Använd fri AI-chatt och lämna kontaktuppgifter när du är klar.
              </p>
              <div className="mt-6">
                <Link
                  href="/chat"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-fg-deep transition hover:bg-white/90 sm:w-auto"
                >
                  <Bot className="h-4 w-4" />
                  Öppna fri chatt
                </Link>
              </div>
            </article>
          </div>
        </div>

        <div className="mt-4 px-1 py-2 sm:px-2 sm:py-3">
          <PartnerCarousel partners={homepagePartners} />
        </div>
      </section>
    </main>
  );
}
