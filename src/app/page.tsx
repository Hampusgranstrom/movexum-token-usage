import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Compass,
  Lightbulb,
  Sparkles,
} from "lucide-react";
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

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-8 pt-6">
            <div className="space-y-4">
              <span className="eyebrow inline-flex rounded-full bg-white/80 px-3 py-1 shadow-soft">
                Startupkompassen 2026
              </span>
              <h1 className="max-w-3xl text-5xl leading-[1.02] text-fg-deep sm:text-6xl lg:text-7xl">
                Utforska din <span className="text-accent">entreprenörsresa</span> innan du söker vidare
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Startupkompassen hjälper dig förstå både dig själv och din idé. Välj ett guidat kompassflöde, få en konkret profil och se nästa steg mot Nyföretagarcentrum, näringslivskontor eller Movexum.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/m/entreprenor" className="btn-primary">
                <Compass className="h-4 w-4" />
                Starta entreprenörstestet
              </Link>
              <Link href="/m/innovation" className="btn-secondary bg-white/90">
                <Lightbulb className="h-4 w-4" />
                Testa idépotential
              </Link>
              <Link
                href="/chat"
                className="rounded-full border border-fg-deep/15 bg-transparent px-5 py-2.5 text-sm font-medium text-fg-deep transition hover:border-fg-deep/35 hover:bg-white/70"
              >
                <Bot className="mr-2 inline h-4 w-4" />
                Öppna fri chatt
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-soft backdrop-blur">
                <p className="text-3xl font-medium text-fg-deep">2</p>
                <p className="mt-2 text-sm text-muted">praktiska kompasser för mindset och innovationshöjd</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-soft backdrop-blur">
                <p className="text-3xl font-medium text-fg-deep">3</p>
                <p className="mt-2 text-sm text-muted">tydliga resultatlägen med nästa steg i rätt riktning</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-soft backdrop-blur">
                <p className="text-3xl font-medium text-fg-deep">1</p>
                <p className="mt-2 text-sm text-muted">öppen väg in för alla som vill ta sin idé vidare</p>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-fg-deep/10 bg-fg-deep p-6 text-white shadow-card">
              <div className="flex items-center gap-2 text-white/75">
                <Sparkles className="h-4 w-4" />
                <span className="eyebrow text-white/75">Välj ditt spår</span>
              </div>

              <div className="mt-5 space-y-4">
                <Link href="/m/entreprenor" className="block rounded-3xl border border-white/10 bg-white/10 p-5 transition hover:bg-white/15">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium">Entreprenör</p>
                      <p className="mt-1 text-sm text-white/70">Drivkrafter, mindset, stresstålighet och feedback.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/70" />
                  </div>
                </Link>

                <Link href="/m/innovation" className="block rounded-3xl border border-white/10 bg-white/10 p-5 transition hover:bg-white/15">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium">Innovationspotential</p>
                      <p className="mt-1 text-sm text-white/70">Problem, kund, konkurrens, skalbarhet och validering.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/70" />
                  </div>
                </Link>

                <Link href="/chat" className="block rounded-3xl border border-white/10 bg-accent/25 p-5 transition hover:bg-accent/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium">Öppen AI-chatt</p>
                      <p className="mt-1 text-sm text-white/80">För dig som hellre börjar i samtal än i ett färdigt formulär.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/80" />
                  </div>
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-white/90 p-6 shadow-card">
              <p className="eyebrow">Efter ditt resultat</p>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  Du får en tydlig profil och rekommenderat nästa steg.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  Vi guidar vidare till Movexum, Nyföretagarcentrum eller lokala näringslivskontor.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  Du väljer själv om du vill gå vidare med kontakt eller fortsätta utforska på egen hand.
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
            <p className="eyebrow">Entreprenörstestet</p>
            <h2 className="mt-3 text-2xl">Har du beteenden som håller i längden?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Utforska hur du hanterar osäkerhet, feedback, stress och uthållighet. Perfekt för dig som vill förstå om entreprenörsrollen passar dig.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
            <p className="eyebrow">Idépotential</p>
            <h2 className="mt-3 text-2xl">Har din idé tillräcklig innovationshöjd?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Testa hur tydligt problemet är, vem kunden är och hur unik eller skalbar lösningen faktiskt verkar just nu.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-white/85 p-6 shadow-soft">
            <p className="eyebrow">Nästa steg</p>
            <h2 className="mt-3 text-2xl">Få rätt väg vidare direkt</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Resultatet pekar vidare till rätt miljö, oavsett om du ska testa snabbare, validera smartare eller vässa din idé innan nästa steg.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
