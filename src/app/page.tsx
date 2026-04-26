// ─────────────────────────────────────────────────────────────────
// Startupkompassen — Landningssida
// Typografi: Inter Tight · Instrument Serif italic · IBM Plex Mono
// Palett  : Ink #0A0A0A · paper #FAFAFA · accent #FF5A3C
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { Inter_Tight, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import { Halftone } from "@/components/halftone";

export const dynamic = "force-dynamic";

const interTight = Inter_Tight({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--lp-sans", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: ["400"], style: ["italic"], variable: "--lp-serif", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--lp-mono", display: "swap" });

const INK      = "#0A0A0A";
const INK_SOFT = "#3F3F3F";
const INK_MUT  = "#737373";
const PAPER    = "#FAFAFA";
const PAPER_ALT  = "#F2F2F2";
const PAPER_DEEP = "#E8E8E8";
const LINE     = "#E5E5E5";
const ACCENT   = "#FF5A3C";

const SANS  = "var(--lp-sans), 'Inter Tight', system-ui, sans-serif";
const SERIF = "var(--lp-serif), 'Instrument Serif', serif";
const MONO  = "var(--lp-mono), 'IBM Plex Mono', monospace";

function I({ children, color = INK, size = "1em" }: { children: React.ReactNode; color?: string; size?: string }) {
  return <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color, fontSize: size, letterSpacing: "-0.01em" }}>{children}</span>;
}

function Mono({ children, color = INK, size = 11, opacity = 0.55, ls = "0.16em", upper = true, style = {} }: {
  children: React.ReactNode; color?: string; size?: number; opacity?: number; ls?: string; upper?: boolean; style?: React.CSSProperties;
}) {
  return <span style={{ fontFamily: MONO, fontSize: size, color, opacity, letterSpacing: ls, textTransform: upper ? "uppercase" : "none", ...style }}>{children}</span>;
}

// ── Nav ───────────────────────────────────────────────────────────
function TopNav() {
  return (
    <div className="lp-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
        <Halftone size={36} color={INK} bg="transparent" />
        <span style={{ fontFamily: SANS, fontSize: 17, fontWeight: 500, color: INK, letterSpacing: "-0.015em" }}>Startupkompassen</span>
      </span>
      <div className="lp-nav-links" style={{ display: "flex", gap: 30, fontFamily: SANS, fontSize: 14, color: INK_SOFT, alignItems: "center" }}>
        <a href="#hur-det-funkar" style={{ color: INK_SOFT, textDecoration: "none" }}>Så funkar det</a>
        <a href="#for-vem" style={{ color: INK_SOFT, textDecoration: "none" }}>För vem</a>
        <a href="#ekosystemet" style={{ color: INK_SOFT, textDecoration: "none" }}>Vägar vidare</a>
        <a href="#faq" style={{ color: INK_SOFT, textDecoration: "none" }}>Om oss</a>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="lp-hero" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 35%, #FFFFFF 0%, #F4F4F4 70%, #ECECEC 100%)", borderRadius: 24, padding: "32px 48px 80px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)" }}>
      <TopNav />
      <div className="lp-hero-grid" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 56, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", border: `1px solid ${LINE}`, background: "#FFFFFFCC", borderRadius: 999, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
            <span style={{ fontFamily: SANS, fontSize: 12, color: INK_SOFT }}>Regionens kompass · Gävleborg</span>
          </div>
          <h1 className="lp-h1" style={{ margin: 0, fontFamily: SANS, fontSize: 76, fontWeight: 500, lineHeight: 0.98, letterSpacing: "-0.04em", color: INK }}>
            Har du en <I size="1.04em">idé</I>?<br />Vi visar vägen vidare.
          </h1>
          <p className="lp-hero-copy" style={{ marginTop: 26, fontFamily: SANS, fontSize: 18, lineHeight: 1.55, color: INK_SOFT, maxWidth: 520 }}>
            Startupkompassen är den enklaste vägen in i Gävleborgs innovationssystem. Berätta var du står — vi visar nästa steg och kopplar dig till rätt stöd. Gratis. Inga formulär.
          </p>
          <div className="lp-hero-cta" style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/start" style={{ padding: "14px 22px", background: INK, color: "#FFF", borderRadius: 999, fontFamily: SANS, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-block" }}>Berätta om din idé →</Link>
            <a href="#hur-det-funkar" style={{ padding: "14px 22px", background: "transparent", color: INK, borderRadius: 999, fontFamily: SANS, fontSize: 14, fontWeight: 500, border: `1px solid ${LINE}`, textDecoration: "none", display: "inline-block" }}>Se så funkar det</a>
          </div>
          <div className="lp-hero-partners" style={{ marginTop: 36, display: "flex", gap: 26, alignItems: "center" }}>
            <Mono color={INK_MUT} size={11} ls="0.14em">I samverkan med</Mono>
            <span style={{ display: "flex", gap: 22, fontFamily: SANS, fontSize: 13, color: INK_SOFT, fontWeight: 500 }}>
              {["Movexum", "NyföretagarCentrum", "Almi", "Region Gävleborg"].map((n) => <span key={n}>{n}</span>)}
            </span>
          </div>
        </div>
        <div className="lp-hero-mark" style={{ display: "grid", placeItems: "center" }}>
          <Halftone size={460} color={INK} bg="transparent" />
        </div>
      </div>
    </div>
  );
}

// ── Chatt-mock ────────────────────────────────────────────────────
function CompassEntry() {
  return (
    <div className="lp-compass" style={{ padding: "120px 0 80px", textAlign: "center" }}>
      <Mono color={INK} size={11} ls="0.18em" opacity={0.5}>Steg 01 — Berätta</Mono>
      <h2 className="lp-h2" style={{ margin: "20px auto 0", fontFamily: SANS, fontSize: 56, fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.035em", color: INK, maxWidth: 880 }}>
        Skriv om din <I>idé</I> som du skulle berätta för en vän.
      </h2>
      <p className="lp-lead" style={{ marginTop: 22, fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: INK_MUT, maxWidth: 580, marginInline: "auto" }}>
        Inga obligatoriska fält. Inget rätt eller fel. Du behöver inte ha allt klart — bara veta vad du tänker.
      </p>
      <div className="lp-compass-card" style={{ marginTop: 56, maxWidth: 720, marginInline: "auto", background: "#FFFFFF", borderRadius: 22, padding: 28, textAlign: "left", boxShadow: "0 30px 80px -30px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Mono color={INK} size={10} ls="0.16em" opacity={0.55}>Din idé</Mono>
          <Mono color={INK_MUT} size={10} ls="0.06em" upper={false}>Tar 2–3 minuter</Mono>
        </div>
        <div className="lp-compass-input" style={{ fontFamily: SANS, fontSize: 22, color: INK, lineHeight: 1.4, fontWeight: 400, letterSpacing: "-0.015em", minHeight: 96 }}>
          Jag har funderat länge på att starta något inom <span style={{ color: ACCENT }}>hållbar mat</span>. Min mamma har drivit lunchrestaurang i 20 år och jag tror att…
          <span style={{ display: "inline-block", width: 2, height: 22, background: INK, marginLeft: 2, verticalAlign: "middle", animation: "lp-blink 1.1s infinite" }} />
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Jag har testat något redan", "Jag är osäker", "Jag vill träffa någon"].map((t) => (
              <span key={t} style={{ padding: "7px 13px", border: `1px solid ${LINE}`, borderRadius: 999, fontFamily: SANS, fontSize: 12, color: INK_SOFT }}>{t}</span>
            ))}
          </div>
          <Link href="/start" style={{ padding: "10px 18px", background: INK, color: "#FFF", borderRadius: 999, fontFamily: SANS, fontSize: 13, fontWeight: 500, textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}>Visa min väg →</Link>
        </div>
      </div>
      <style>{`@keyframes lp-blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

// ── Hur det funkar ────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01", t: "Berätta var du står",
      d: "Skriv fritt om din idé eller välj en av startpunkterna. Det räcker med några meningar.",
      mock: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["Jag har en idé jag funderar på", "Jag har börjat men kört fast", "Jag har bara nyfikenhet"].map((t, i) => (
            <div key={t} style={{ padding: "12px 14px", borderRadius: 10, background: i === 0 ? INK : "#FFFFFF", color: i === 0 ? "#FFF" : INK, fontFamily: SANS, fontSize: 13, fontWeight: 500, border: i === 0 ? "none" : `1px solid ${LINE}` }}>{t}</div>
          ))}
        </div>
      ),
    },
    {
      n: "02", t: "Vi tolkar och rekommenderar",
      d: "Kompassen läser din situation och föreslår 1–3 partner som passar — med en mening om varför just dem.",
      mock: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[{ p: "Movexum", w: "för dig som vill skala teknikiden" }, { p: "NyföretagarCentrum", w: "för dig som vill registrera bolag och köra igång" }, { p: "Söderhamn Näringsliv", w: "för dig som behöver lokal mark och mentor" }].map((m) => (
            <div key={m.p} style={{ padding: "12px 14px", borderRadius: 10, background: "#FFFFFF", border: `1px solid ${LINE}` }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: INK }}>{m.p}</div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK_MUT, marginTop: 2 }}>— {m.w}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: "03", t: "En riktig människa hör av sig",
      d: "Du bokar ett samtal direkt — eller låter oss boka åt dig. Inom 3 arbetsdagar har du ett möte.",
      mock: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#FFFFFF", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: PAPER_DEEP, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: INK }}>Anna · Movexum</div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK_MUT }}>Tisdag 09:30 · 30 min · video</div>
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: INK, color: "#FFF", fontFamily: SANS, fontSize: 12.5, fontWeight: 500, textAlign: "center" }}>Boka samtal →</div>
        </div>
      ),
    },
  ];
  return (
    <div className="lp-how" id="hur-det-funkar" style={{ padding: "120px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <Mono color={INK} size={11} ls="0.18em" opacity={0.5}>Så funkar det</Mono>
        <h2 className="lp-h2" style={{ margin: "20px auto 0", fontFamily: SANS, fontSize: 56, fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.035em", color: INK }}>Tre steg. <I>Inget krångel</I>.</h2>
        <p className="lp-lead" style={{ marginTop: 18, fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: INK_MUT }}>Du behöver inte veta vad en inkubator är, eller vad ALMI gör. Vi översätter ekosystemet åt dig.</p>
      </div>
      <div className="lp-steps-grid" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {steps.map((s) => (
          <div key={s.n} style={{ background: PAPER_ALT, borderRadius: 18, padding: 32, display: "flex", flexDirection: "column", gap: 22, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 56, color: INK, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.n}</span>
              <Halftone size={32} color={INK} bg="transparent" />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: INK, letterSpacing: "-0.02em" }}>{s.t}</div>
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 14, color: INK_MUT, lineHeight: 1.55 }}>{s.d}</div>
            </div>
            <div style={{ marginTop: "auto" }}>{s.mock}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── För vem ───────────────────────────────────────────────────────
function ForWhom() {
  const personas = [
    { tag: "Nyfiken",   t: "Jag vet inte om det är en idé än",            d: "Du har en känsla av att något kan bli något. Vi hjälper dig sätta ord på det." },
    { tag: "Nyanländ",  t: "Jag vill starta i Sverige",                   d: "Vi översätter, förklarar systemet och kopplar dig till partner som jobbar flerspråkigt." },
    { tag: "Student",   t: "Jag pluggar och har ett sidoprojekt",         d: "Drive Hub, HiG Innovation och Movexum jobbar nära varandra — du hamnar rätt." },
    { tag: "Etablerad", t: "Jag driver redan något, men vill prova nytt",  d: "Innovation handlar inte bara om startups. Vi har vägar för dig som vill växa sidledes." },
  ];
  return (
    <div id="for-vem" className="lp-forwhom" style={{ padding: "120px 0", background: INK, color: "#F5F5F5", borderRadius: 24, paddingInline: 64 }}>
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <Mono color="#F5F5F5" size={11} ls="0.18em" opacity={0.55}>För dig som</Mono>
        <h2 className="lp-h2" style={{ margin: "20px auto 0", fontFamily: SANS, fontSize: 56, fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.035em", color: "#F5F5F5" }}>Det finns ingen <I color="#F5F5F5">&ldquo;rätt&rdquo;</I> startpunkt.</h2>
        <p className="lp-lead" style={{ marginTop: 18, fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: "#A3A3A3" }}>Vi möter dig där du är — inte där en mall säger att du borde vara.</p>
      </div>
      <div className="lp-personas-grid" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
        {personas.map((p) => (
          <div key={p.tag} style={{ padding: 36, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
            <Mono color="#FFFFFF" size={10} ls="0.18em" opacity={0.5}>{p.tag}</Mono>
            <div className="lp-persona-quote" style={{ marginTop: 16, fontFamily: SANS, fontSize: 30, fontWeight: 500, color: "#F5F5F5", letterSpacing: "-0.025em", lineHeight: 1.1 }}>&ldquo;{p.t}&rdquo;</div>
            <div style={{ marginTop: 14, fontFamily: SANS, fontSize: 15, color: "#A3A3A3", lineHeight: 1.6 }}>{p.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ekosystemet ───────────────────────────────────────────────────
function Ecosystem() {
  const partners = [
    { n: "Movexum",                       role: "Regional inkubator",              desc: "För skalbara teknik- och tillväxtidéer.",                     tag: "Inkubator"  },
    { n: "NyföretagarCentrum",            role: "Starta eget",                     desc: "Kostnadsfri rådgivning för dig som ska registrera bolag.",    tag: "Rådgivning" },
    { n: "Almi",                          role: "Finansiering & affärsutveckling", desc: "Lån, riskkapital och mentorskap för växande bolag.",          tag: "Kapital"    },
    { n: "Region Gävleborg",              role: "Regionalt stöd",                  desc: "Innovationscheckar och utvecklingsprogram.",                  tag: "Stöd"       },
    { n: "Kommunernas näringslivskontor", role: "10 kommuner",                     desc: "Lokal mark, etableringshjälp och nätverk.",                   tag: "Lokalt"     },
    { n: "Högskolan i Gävle",             role: "Forskning & student-bolag",       desc: "Drive Hub och Innovation Office för studenter och forskare.", tag: "Akademi"    },
    { n: "Coompanion",                    role: "Kooperativt företagande",         desc: "För dig som vill starta tillsammans.",                        tag: "Kooperativ" },
    { n: "Almi Invest",                   role: "Riskkapital",                     desc: "Investeringar i tidiga skeden i regionen.",                   tag: "Invest"     },
  ];
  return (
    <div id="ekosystemet" className="lp-ecosystem" style={{ padding: "120px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <Mono color={INK} size={11} ls="0.18em" opacity={0.5}>Ekosystemet</Mono>
        <h2 className="lp-h2" style={{ margin: "20px auto 0", fontFamily: SANS, fontSize: 56, fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.035em", color: INK }}>Hela <I>Gävleborgs</I> stöd. På ett ställe.</h2>
        <p className="lp-lead" style={{ marginTop: 18, fontFamily: SANS, fontSize: 17, lineHeight: 1.55, color: INK_MUT }}>Du behöver inte ringa runt. Vi har redan kartlagt vem som gör vad — och vem du borde prata med.</p>
      </div>
      <div className="lp-ecosystem-grid" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {partners.map((p) => (
          <div key={p.n} style={{ background: "#FFFFFF", borderRadius: 16, padding: 26, minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
            <div>
              <Mono color={ACCENT} size={9} ls="0.18em" opacity={0.95}>{p.tag}</Mono>
              <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 19, fontWeight: 500, color: INK, letterSpacing: "-0.015em" }}>{p.n}</div>
              <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 12, color: INK_MUT }}>{p.role}</div>
            </div>
            <div style={{ marginTop: 14, fontFamily: SANS, fontSize: 13, color: INK_SOFT, lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, textAlign: "center", fontFamily: SANS, fontSize: 14, color: INK_MUT }}>+ 30 till — föreningar, nätverk och program i regionen.</div>
    </div>
  );
}

// ── Berättelse ────────────────────────────────────────────────────
function Story() {
  return (
    <div className="lp-story" style={{ padding: "120px 0" }}>
      <div className="lp-story-card" style={{ background: PAPER_ALT, borderRadius: 24, padding: "72px 64px", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 60, alignItems: "center", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 18, background: "linear-gradient(135deg, #DDD 0%, #BBB 100%)", display: "grid", placeItems: "center", color: INK_MUT, fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em" }}>PORTRÄTT</div>
        </div>
        <div>
          <Mono color={INK} size={11} ls="0.18em" opacity={0.5}>En av många</Mono>
          <div className="lp-story-quote" style={{ marginTop: 22, fontFamily: SANS, fontSize: 38, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.025em", color: INK }}>
            &ldquo;Jag tänkte att jag borde börja med <I>en affärsplan</I>. Kompassen sa: börja med ett samtal. Det förändrade allt.&rdquo;
          </div>
          <div style={{ marginTop: 28, fontFamily: SANS, fontSize: 14, color: INK_SOFT }}>
            <strong style={{ fontWeight: 500, color: INK }}>Sara, 34 — Gävle</strong> · driver idag Värma · matchad till NyföretagarCentrum + Movexum
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Siffror ───────────────────────────────────────────────────────
function Numbers() {
  const stats: { n: string; l: string; note?: string }[] = [
    { n: "10",   l: "kommuner i regionen",    note: "alla med på resan" },
    { n: "40+",  l: "partner i ekosystemet" },
    { n: "<3",   l: "dagar till första möte", note: "i snitt" },
    { n: "0 kr", l: "kostar det dig",          note: "alltid" },
  ];
  return (
    <div className="lp-numbers" style={{ padding: "80px 0" }}>
      <div className="lp-numbers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.n} style={{ background: "#FFFFFF", borderRadius: 16, padding: 32, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
            <div className="lp-number-value" style={{ fontFamily: SANS, fontSize: 80, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.04em", color: INK }}>{s.n}</div>
            <div style={{ marginTop: 14, fontFamily: SANS, fontSize: 14, color: INK_SOFT, lineHeight: 1.45 }}>{s.l}</div>
            {s.note && <Mono color={INK_MUT} size={10} ls="0.14em" opacity={0.7} style={{ marginTop: 12, display: "block" }}>{s.note}</Mono>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────
function FAQ() {
  const items = [
    { q: "Vem driver Startupkompassen?",             a: "Den drivs i samverkan mellan Region Gävleborg, regionens kommuner och Movexum. Inga kommersiella aktörer är involverade." },
    { q: "Kostar det något?",                         a: "Nej. Tjänsten är helt gratis för dig — finansierad regionalt och kommunalt." },
    { q: "Vad händer med min idé?",                  a: "Bara du och den partner du matchas med ser den. Vi delar aldrig idéer vidare utan ditt godkännande." },
    { q: "Måste jag bo i Gävleborg?",                a: "Du behöver ha din verksamhet eller idé kopplad till regionen. Det betyder inte att du måste bo här idag." },
    { q: "Vad om kompassen inte hittar rätt match?",  a: "Då ringer vi. En riktig människa i regionen tittar på din situation manuellt." },
  ];
  return (
    <div id="faq" className="lp-faq" style={{ padding: "120px 0" }}>
      <div className="lp-faq-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 80 }}>
        <div>
          <Mono color={INK} size={11} ls="0.18em" opacity={0.5}>Frågor &amp; svar</Mono>
          <h2 className="lp-faq-h2" style={{ margin: "20px 0 0", fontFamily: SANS, fontSize: 48, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.035em", color: INK }}>Saker folk ofta <I>undrar</I>.</h2>
          <p style={{ marginTop: 18, fontFamily: SANS, fontSize: 15, color: INK_MUT, lineHeight: 1.6 }}>
            Hittar du inte svaret? Skriv till oss på{" "}
            <a href="mailto:hej@startupkompassen.se" style={{ color: INK, fontWeight: 500 }}>hej@startupkompassen.se</a>{" "}
            — vi svarar samma dag.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((it, i) => (
            <div key={i} style={{ padding: "28px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
              <div style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, color: INK, letterSpacing: "-0.015em" }}>{it.q}</div>
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 14.5, color: INK_SOFT, lineHeight: 1.6 }}>{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CTA ───────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <div className="lp-final-cta" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 30%, #1A1A1A 0%, #0A0A0A 100%)", color: "#F5F5F5", borderRadius: 24, padding: "120px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "grid", placeItems: "center" }}>
        <Halftone size={120} color="#F5F5F5" bg="transparent" />
      </div>
      <h2 className="lp-final-h2" style={{ marginTop: 36, fontFamily: SANS, fontSize: 80, fontWeight: 500, lineHeight: 0.98, letterSpacing: "-0.04em", color: "#F5F5F5" }}>Lämna <I color="#F5F5F5">omloppsbanan</I>.</h2>
      <p style={{ marginTop: 22, fontFamily: SANS, fontSize: 18, color: "#A3A3A3", lineHeight: 1.55, maxWidth: 540, marginInline: "auto" }}>
        Du har en idé. Vi har resten av regionen. Det enda som saknas är ditt första steg.
      </p>
      <div className="lp-final-actions" style={{ marginTop: 36, display: "inline-flex", gap: 12 }}>
        <Link href="/start" style={{ padding: "16px 26px", background: "#FFFFFF", color: INK, borderRadius: 999, fontFamily: SANS, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-block" }}>Berätta om din idé →</Link>
        <a href="mailto:hej@startupkompassen.se" style={{ padding: "16px 26px", background: "transparent", color: "#F5F5F5", borderRadius: 999, fontFamily: SANS, fontSize: 14, fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none", display: "inline-block" }}>Boka demo för kommun</a>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { h: "Tjänsten",    l: ["Berätta om din idé", "Så funkar det", "För dig som"] },
    { h: "Ekosystemet", l: ["Movexum", "NyföretagarCentrum", "Almi", "Alla partner"] },
    { h: "Om",          l: ["Bakgrund", "Press", "Kontakt", "Integritet"] },
  ];
  return (
    <div className="lp-footer" style={{ padding: "80px 0 40px" }}>
      <div className="lp-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: 40 }}>
        <div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Halftone size={32} color={INK} bg="transparent" />
            <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 500, color: INK, letterSpacing: "-0.015em" }}>Startupkompassen</span>
          </span>
          <p style={{ marginTop: 18, fontFamily: SANS, fontSize: 13.5, color: INK_MUT, lineHeight: 1.6, maxWidth: 280 }}>
            Regionens kompass för dig som har en idé. Drivs i samverkan av Region Gävleborg, kommunerna och Movexum.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <Mono color={INK} size={10} ls="0.18em" opacity={0.55}>{c.h}</Mono>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {c.l.map((x) => <span key={x} style={{ fontFamily: SANS, fontSize: 14, color: INK_SOFT }}>{x}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="lp-footer-bottom" style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between" }}>
        <Mono color={INK_MUT} size={11} ls="0.14em">© 2026 Startupkompassen</Mono>
        <Mono color={INK_MUT} size={11} ls="0.14em">Gävleborg</Mono>
      </div>
    </div>
  );
}

// ── Sida ──────────────────────────────────────────────────────────
export default function HomePage() {
  const fontVars = `${interTight.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`;
  return (
    <div className={`${fontVars} lp-root`} style={{ background: PAPER, color: INK, padding: "20px 56px 40px", minHeight: "100%", fontFamily: SANS }}>
      <Hero />
      <CompassEntry />
      <HowItWorks />
      <ForWhom />
      <Ecosystem />
      <Story />
      <Numbers />
      <FAQ />
      <FinalCTA />
      <Footer />
      <style>{`
        @media (max-width: 1200px) {
          .lp-root { padding: 16px 24px 32px !important; }
          .lp-h1 { font-size: 64px !important; }
          .lp-h2 { font-size: 46px !important; }
          .lp-final-h2 { font-size: 64px !important; }
          .lp-ecosystem-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-numbers-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 960px) {
          .lp-nav-links { display: none !important; }
          .lp-hero-grid,
          .lp-story-card,
          .lp-faq-grid { grid-template-columns: 1fr !important; }
          .lp-steps-grid,
          .lp-personas-grid,
          .lp-ecosystem-grid,
          .lp-footer-grid { grid-template-columns: 1fr !important; }
          .lp-hero-mark { margin-top: 12px; }
          .lp-hero-mark > span { width: min(100%, 320px) !important; height: auto !important; }
          .lp-number-value { font-size: 62px !important; }
          .lp-final-actions { display: flex !important; flex-wrap: wrap !important; justify-content: center !important; }
        }

        @media (max-width: 640px) {
          .lp-root { padding: 10px 12px 24px !important; }
          .lp-hero,
          .lp-forwhom,
          .lp-final-cta,
          .lp-story-card { padding: 24px 18px 28px !important; border-radius: 18px !important; }
          .lp-nav { padding: 8px 0 14px !important; }
          .lp-nav-actions { gap: 8px !important; }
          .lp-nav-actions a:last-child { padding: 8px 12px !important; font-size: 12px !important; }
          .lp-h1 { font-size: 42px !important; line-height: 0.98 !important; }
          .lp-h2 { font-size: 34px !important; line-height: 1.04 !important; }
          .lp-faq-h2 { font-size: 32px !important; }
          .lp-final-h2 { font-size: 42px !important; }
          .lp-lead,
          .lp-hero-copy { font-size: 15px !important; line-height: 1.58 !important; }
          .lp-hero-cta,
          .lp-hero-partners,
          .lp-final-actions,
          .lp-footer-bottom { flex-direction: column !important; align-items: flex-start !important; }
          .lp-hero-partners > span:last-child { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; }
          .lp-compass,
          .lp-how,
          .lp-ecosystem,
          .lp-story,
          .lp-faq { padding: 64px 0 !important; }
          .lp-numbers { padding: 48px 0 !important; }
          .lp-compass-card { margin-top: 28px !important; padding: 18px !important; border-radius: 16px !important; }
          .lp-compass-input { font-size: 18px !important; min-height: 84px !important; }
          .lp-persona-quote { font-size: 24px !important; }
          .lp-story-quote { font-size: 30px !important; }
          .lp-number-value { font-size: 46px !important; }
        }
      `}</style>
    </div>
  );
}
