import Link from "next/link";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brand = await getBrandSettings();
  const adminHost = process.env.ADMIN_HOST;
  const adminLoginHref = adminHost
    ? `${adminHost === "localhost" ? "http" : "https"}://${adminHost}/login`
    : "/login";

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-6 py-10 sm:px-10 sm:py-14">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(56,180,227,0.18),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(14,63,82,0.17),transparent_45%),linear-gradient(180deg,#eaf5fa_0%,#f6fafc_58%,#ffffff_100%)]" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
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

          <Link href={adminLoginHref} className="rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-medium text-fg-deep transition hover:bg-white">
            Admin login
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-6">
            <span className="eyebrow inline-flex rounded-full bg-white/80 px-3 py-1 shadow-soft">
              Startupkompassen
            </span>
            <h1 className="text-4xl leading-tight text-fg-deep sm:text-5xl lg:text-6xl">
              Förvandla idé till nästa <span className="text-accent">startupsteg</span>
            </h1>
            <p className="max-w-2xl text-base text-muted sm:text-lg">
              Besvara frågor i din takt eller prata med vår AI-assistent. Du får direkt en tydlig sammanfattning som hjälper dig vidare i processen med Movexum.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/m/founders" className="btn-primary">
                Starta frågeflödet
              </Link>
              <Link href="/chat" className="rounded-full border border-fg-deep/20 bg-white px-5 py-2.5 text-sm font-medium text-fg-deep transition hover:border-fg-deep/40 hover:bg-bg">
                Starta chatt
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
            <p className="eyebrow">Så funkar det</p>
            <ol className="mt-4 space-y-4 text-sm text-muted">
              <li>
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg-deep text-xs font-semibold text-white">1</span>
                Välj om du vill börja med guidat formulär eller chatt.
              </li>
              <li>
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg-deep text-xs font-semibold text-white">2</span>
                Beskriv din idé, team och nuläge.
              </li>
              <li>
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg-deep text-xs font-semibold text-white">3</span>
                Skicka in och få återkoppling från Movexum-teamet.
              </li>
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}
