import Link from "next/link";
import { ArrowRight, Bot, Compass, Lightbulb } from "lucide-react";
import { PartnerCarousel } from "@/components/partner-carousel";
import { Halftone } from "@/components/halftone";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brand = await getBrandSettings();
  const homepagePartners = brand.partnerLogos.filter(
    (partner) => !/movexum/i.test(partner.name),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-4 py-6 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      {/* Paper-on-paper hero gradient — radial highlight in the upper-third
          fading into a warm paper at the bottom. The single warm accent
          (#FF5A3C) glows softly in the upper-right corner. */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_70%_at_50%_22%,#FFFFFF_0%,#F4F4F4_60%,#ECECEC_100%)]" />
      <div className="absolute -right-24 top-12 -z-10 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
      <div className="absolute -left-32 top-1/2 -z-10 h-64 w-64 rounded-full bg-fg-deep/5 blur-3xl" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 sm:gap-14">
        <div className="grid items-center gap-10 pt-1 sm:pt-4 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div className="space-y-6 sm:space-y-7">
            <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Regionens kompass · Gävleborg
            </span>
            <h1 className="max-w-2xl text-4xl leading-[1.02] text-fg-deep sm:text-5xl sm:leading-[1.0] lg:text-6xl xl:text-7xl">
              Har du en idé?
              <br />
              Vi visar vägen vidare.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7 lg:text-[17px] lg:leading-[1.6]">
              Börja med ett kort test om dig själv eller din idé — eller berätta fritt i chatten. När du är klar kan du lämna kontaktuppgifter så hör teamet av sig.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/chat" className="btn-primary">
                <Bot className="h-4 w-4" />
                Öppna fri chatt
              </Link>
              <Link
                href="#vagar-in"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-5 py-2.5 text-sm font-medium text-fg-deep shadow-soft transition hover:bg-white"
              >
                Se vägarna in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <Halftone size={360} color="#0A0A0A" bg="transparent" />
          </div>
        </div>

        <div id="vagar-in" className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          <article className="group rounded-[1.75rem] border border-border bg-white p-5 shadow-card transition hover:shadow-pop sm:rounded-[2rem] sm:p-7">
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

          <article className="group rounded-[1.75rem] border border-border bg-white p-5 shadow-card transition hover:shadow-pop sm:rounded-[2rem] sm:p-7">
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

          <article className="relative overflow-hidden rounded-[1.75rem] border border-fg-deep/10 bg-fg-deep p-5 text-white shadow-card sm:rounded-[2rem] sm:p-7">
            <div className="absolute -right-6 -top-6 opacity-20" aria-hidden>
              <Halftone size={140} color="#FAFAFA" bg="transparent" />
            </div>
            <div className="relative">
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
            </div>
          </article>
        </div>

        <div className="mt-4 px-1 py-2 sm:px-2 sm:py-3">
          <PartnerCarousel partners={homepagePartners} />
        </div>
      </section>
    </main>
  );
}
