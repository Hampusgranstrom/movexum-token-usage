import Link from "next/link";
import { ArrowRight, Bot, FileText } from "lucide-react";
import { getBrandSettings } from "@/lib/brand";
import { listModules } from "@/lib/modules";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Berätta om din idé · Movexum Startupkompass",
  description:
    "Välj om du vill börja i AI-chatten eller i ett formulär/test som passar din idé.",
};

export default async function StartPage() {
  const [brand, modules] = await Promise.all([getBrandSettings(), listModules()]);

  const activeModules = modules.filter((m) => m.is_active);
  const visibleModuleIds = new Set(brand.landingEntry.visibleModuleIds);
  const visibleModules = activeModules.filter((m) => {
    if (visibleModuleIds.size === 0) return m.flow_type !== "chat";
    return visibleModuleIds.has(m.id);
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
      <header className="max-w-3xl space-y-4">
        <span className="eyebrow">Starta här</span>
        <h1 className="text-4xl text-fg-deep sm:text-5xl">Berätta om din idé</h1>
        <p className="text-base text-muted sm:text-lg">
          Välj hur du vill börja. Du kan prata med AI-chatten eller använda ett formulär/test.
        </p>
      </header>

      {brand.landingEntry.showAiChat ? (
        <section className="mt-8 rounded-3xl border border-fg-deep/10 bg-fg-deep p-6 text-white shadow-card sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="eyebrow text-white/70">AI-chat</span>
              <h2 className="text-2xl text-white sm:text-3xl">Börja i samtal</h2>
              <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                Beskriv din idé i fri text och få vägledning steg för steg.
              </p>
            </div>
            <Bot className="hidden h-6 w-6 text-white/70 sm:block" aria-hidden />
          </div>
          <div className="mt-6">
            <Link href="/m/founders" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-fg-deep transition hover:bg-white/90">
              Öppna AI-chatten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-8 space-y-4">
        <div className="space-y-2">
          <span className="eyebrow">Formulär och tester</span>
          <h2 className="text-2xl text-fg-deep sm:text-3xl">Välj en startpunkt</h2>
        </div>

        {visibleModules.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg p-5 text-sm text-muted">
            Inga formulär/tester är publicerade just nu.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleModules.map((mod) => (
              <article key={mod.id} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">{mod.flow_type}</span>
                  <FileText className="h-4 w-4 text-accent" aria-hidden />
                </div>
                <h3 className="mt-3 text-xl text-fg-deep">{mod.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {mod.description ?? "Starta modulen för att beskriva din idé och få rätt väg vidare."}
                </p>
                <div className="mt-5">
                  <Link
                    href={`/m/${mod.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-fg-deep transition hover:bg-bg"
                  >
                    Starta {mod.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
