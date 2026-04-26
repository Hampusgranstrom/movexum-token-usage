"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { DataFilters } from "./data-filters";
import { KpiCard } from "./kpi-card";
import { MetricInfo } from "./metric-info";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { AnalysisSummary } from "@/lib/types";

const LeadsChart = dynamic(
  () => import("./leads-chart").then((m) => m.LeadsChart),
  { ssr: false },
);
const SourceChart = dynamic(
  () => import("./source-chart").then((m) => m.SourceChart),
  { ssr: false },
);

type AnalysisTab = "overview" | "acquisition" | "engagement" | "conversion" | "performance";

const TAB_LABELS: Array<{ id: AnalysisTab; label: string }> = [
  { id: "overview", label: "Översikt" },
  { id: "acquisition", label: "Acquisition" },
  { id: "engagement", label: "Engagement" },
  { id: "conversion", label: "Conversion" },
  { id: "performance", label: "Performance" },
];

export function AnalysisDashboard({ initialData }: { initialData: AnalysisSummary }) {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<AnalysisTab>("overview");
  const [data, setData] = useState<AnalysisSummary | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      if (initialData.periodDays === days) return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/analysis?days=${days}`);
        const body = (await res.json()) as AnalysisSummary | { error?: string };
        if (!res.ok) {
          throw new Error("error" in body ? (body.error ?? "Kunde inte ladda analys") : "Kunde inte ladda analys");
        }
        if (alive) setData(body as AnalysisSummary);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Okänt fel");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [days, initialData.periodDays]);

  const sourceChartData = useMemo(
    () =>
      (data?.quality.sourcePerformance ?? []).map((s) => ({
        source_id: s.source_id,
        label: s.label,
        count: s.total,
        color: "#FF5A3C",
      })),
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-full bg-bg-deep" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-40 animate-pulse p-6" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card h-80 animate-pulse" />
          <div className="card h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-danger">Kunde inte ladda analys</h2>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Analys</span>
          <h1 className="mt-2 text-4xl sm:text-5xl">Statistik &amp; analys</h1>
          <p className="mt-2 text-sm text-muted">
            {data.periodDays} dagar · uppdaterad {new Date(data.generatedAt).toLocaleString("sv-SE")}
          </p>
        </div>

      </header>

      <DataFilters
        selects={[
          {
            key: "period",
            label: "Period",
            value: String(days),
            onChange: (value) => setDays(Number(value)),
            options: [
              { value: "30", label: "30 dagar" },
              { value: "60", label: "60 dagar" },
              { value: "90", label: "90 dagar" },
            ],
          },
          {
            key: "view",
            label: "Vy",
            value: tab,
            onChange: (value) => setTab(value as AnalysisTab),
            options: TAB_LABELS.map((item) => ({
              value: item.id,
              label: item.label,
            })),
          },
        ]}
      />

      {tab === "overview" && (
        <OverviewTab data={data} sourceChartData={sourceChartData} />
      )}
      {tab === "acquisition" && <AcquisitionTab data={data} />}
      {tab === "engagement" && <EngagementTab data={data} />}
      {tab === "conversion" && <ConversionTab data={data} />}
      {tab === "performance" && <PerformanceTab data={data} />}
    </div>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted">
      {text}
    </div>
  );
}

function MetricLabel({ label, info }: { label: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <MetricInfo text={info} />
    </span>
  );
}

function vitalInfoText(metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB") {
  if (metric === "CLS") return "Visar hur stabil layouten ar under inlasning. Lagre ar battre.";
  if (metric === "FCP") return "Visar nar forsta synliga innehallet visas for besokaren. Lagre ar battre.";
  if (metric === "LCP") return "Visar nar sidans viktigaste synliga innehall ar laddat. Lagre ar battre.";
  if (metric === "INP") return "Visar hur snabbt sidan svarar nar besokaren klickar eller skriver. Lagre ar battre.";
  return "Visar serverns svarstid till webblasaren. Lagre ar battre.";
}

function formatVitalValue(metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB", value: number) {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function thresholdText(metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB") {
  if (metric === "CLS") return "Good <= 0.10, NI <= 0.25, Poor > 0.25";
  if (metric === "INP") return "Good <= 200 ms, NI <= 500 ms, Poor > 500 ms";
  if (metric === "LCP") return "Good <= 2500 ms, NI <= 4000 ms, Poor > 4000 ms";
  if (metric === "FCP") return "Good <= 1800 ms, NI <= 3000 ms, Poor > 3000 ms";
  return "Good <= 800 ms, NI <= 1800 ms, Poor > 1800 ms";
}

function downloadVitalsCsv(data: AnalysisSummary) {
  const rows: string[] = [];
  rows.push("type,metric,path,samples,avg,p75,prev_p75,p75_delta_pct,poor_rate_pct,rating");

  for (const m of data.performance.webVitals) {
    rows.push(
      [
        "metric",
        m.metric,
        "",
        m.samples,
        m.avg.toFixed(2),
        m.p75.toFixed(2),
        m.prevP75.toFixed(2),
        (m.p75Delta * 100).toFixed(2),
        (m.poorRate * 100).toFixed(2),
        m.rating,
      ].join(","),
    );
  }

  for (const p of data.performance.slowPaths) {
    rows.push(
      [
        "path",
        p.metric,
        `"${p.path.replaceAll('"', '""')}"`,
        p.samples,
        "",
        p.p75.toFixed(2),
        "",
        "",
        (p.poorRate * 100).toFixed(2),
        "",
      ].join(","),
    );
  }

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `web-vitals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PerformanceTab({ data }: { data: AnalysisSummary }) {
  return (
    <div className="space-y-5">
      <InfoBox text="Denna vy visar hur snabb webbplatsen upplevs av riktiga besokare. Fokus ligger pa Core Web Vitals: om de blir battre far fler en snabb och stabil upplevelse." />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => downloadVitalsCsv(data)}
          className="btn-secondary"
        >
          <Download className="h-4 w-4" />
          Exportera Web Vitals CSV
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.performance.webVitals.slice(0, 4).map((metric, index) => (
          <KpiCard
            key={metric.metric}
            label={`${metric.metric} p75`}
            value={metric.metric === "CLS" ? Number(metric.p75.toFixed(3)) : Math.round(metric.p75)}
            unit={metric.metric === "CLS" ? "" : "ms"}
            delta={metric.p75Delta}
            formula={`${metric.samples} sampel · poor rate ${formatPercent(metric.poorRate)}`}
            info={`p75 betyder att 75% av besoken ar snabbare an detta varde. ${metric.metric === "CLS" ? "Lagre ar battre for stabil layout." : "Lagre ar battre for snabbare upplevelse."}`}
            decimals={metric.metric === "CLS" ? 3 : 0}
            index={index}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Core Web Vitals
            <MetricInfo text="Fem standardmatt for laddning, respons och stabilitet i verkliga besok." />
          </h3>
          <div className="space-y-3">
            {data.performance.webVitals.map((metric) => (
              <div key={metric.metric} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium text-fg-deep">
                    {metric.metric}
                    <MetricInfo text={vitalInfoText(metric.metric)} />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      metric.rating === "good"
                        ? "bg-success/15 text-success"
                        : metric.rating === "needs-improvement"
                          ? "bg-accent-soft text-fg-deep"
                          : "bg-danger/15 text-danger",
                    )}
                  >
                    {metric.rating}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  p75 {formatVitalValue(metric.metric, metric.p75)} · forra perioden {formatVitalValue(metric.metric, metric.prevP75)} · trend {formatPercent(metric.p75Delta)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  snitt {formatVitalValue(metric.metric, metric.avg)} · {metric.samples} sampel · poor {formatPercent(metric.poorRate)}
                </p>
                <p className="mt-1 text-[11px] text-subtle">
                  {thresholdText(metric.metric)}
                </p>
              </div>
            ))}
            {data.performance.webVitals.length === 0 && (
              <p className="text-xs text-muted">Inga Web Vitals registrerade ännu.</p>
            )}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Långsammaste paths
            <MetricInfo text="Visar de sidvagar dar prestandan ar samst, sorterat pa p75." />
          </h3>
          <div className="space-y-3">
            {data.performance.slowPaths.map((row) => (
              <div key={`${row.path}-${row.metric}`} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-fg-deep">{row.path}</span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    {row.metric}
                    <MetricInfo text={vitalInfoText(row.metric)} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  <MetricLabel label="p75" info="Det varde som 75% av besoken ar snabbare an." /> {formatVitalValue(row.metric, row.p75)} · {" "}
                  <MetricLabel label="sampel" info="Antal matningar som ligger till grund for vardet." /> {row.samples} · {" "}
                  <MetricLabel label="poor" info="Andel besok som hamnar i dalig niva enligt standardgranser." /> {formatPercent(row.poorRate)}
                </p>
              </div>
            ))}
            {data.performance.slowPaths.length === 0 && (
              <p className="text-xs text-muted">Ingen path-data för Web Vitals ännu.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function OverviewTab({
  data,
  sourceChartData,
}: {
  data: AnalysisSummary;
  sourceChartData: Array<{ source_id: string; label: string; count: number; color: string }>;
}) {
  return (
    <div className="space-y-6">
      <InfoBox text="Oversikten sammanfattar helheten: hur mycket trafik ni har, hur manga som stannar kvar och hur stor andel som blir leads." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Användare"
          value={data.overview.users}
          unit="st"
          delta={0}
          formula="Unika ip_hash i perioden"
          info="Unika personer uppskattat via anonym identifierare under perioden."
          index={0}
        />
        <KpiCard
          label="Sessioner"
          value={data.overview.sessions}
          unit="st"
          delta={0}
          formula="module_sessions startade"
          info="Antal besok som startat ett inflodesflode."
          index={1}
        />
        <KpiCard
          label="Bounce rate"
          value={Math.round(data.overview.bounceRate * 100)}
          unit="%"
          delta={0}
          formula="Ej engagerade sessioner / sessioner"
          info="Andel besok som lamnar utan tydlig interaktion. Lagre ar normalt battre."
          index={2}
        />
        <KpiCard
          label="Lead conversion"
          value={Math.round(data.overview.leadConversionRate * 100)}
          unit="%"
          delta={0}
          formula="Leads / sessioner"
          info="Andel sessioner som faktiskt leder till ett inskickat lead."
          index={3}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="eyebrow mb-4">Sessioner per dag</h3>
          <div className="min-h-[320px]">
            <LeadsChart data={data.trend.sessionsPerDay} />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="eyebrow mb-4">Leads per dag</h3>
          <div className="min-h-[320px]">
            <LeadsChart data={data.trend.leadsPerDay} />
          </div>
        </motion.section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Källor
            <MetricInfo text="Visar var leads kommer ifran och hur bra varje kalla presterar." />
          </h3>
          <div className="min-h-[320px]">
            <SourceChart data={sourceChartData} />
          </div>
          <div className="mt-4 space-y-2">
            {data.quality.sourcePerformance.map((s) => (
              <div key={s.source_id} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">
                  <MetricLabel label="leads" info="Antal leads fran denna kalla." /> {s.total} · {" "}
                  <MetricLabel label="accepted" info="Andel leads fran kallan som blivit antagna." /> {formatPercent(s.acceptedRate)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Kvalitet
            <MetricInfo text="Bryter ned leadstatus och kvalitetsindikatorer i perioden." />
          </h3>
          <div className="space-y-2">
            {data.quality.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">{formatNumber(s.count)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            <MetricLabel label="Snittscore" info="Genomsnittlig AI-score for periodens leads." />: {data.overview.avgScore} · {" "}
            <MetricLabel label="Snitt assistant output-tokens" info="Genomsnittligt antal output-tokens som assistenten genererar per svar." />: {data.overview.avgAssistantOutputTokens}
          </p>
        </section>
      </div>

      <InfoBox text="Tips: Om sessionskar men lead conversion star stilla pekar det ofta pa att fraga/erbjudande behovs justeras tidigt i flodet." />
    </div>
  );
}

function AcquisitionTab({ data }: { data: AnalysisSummary }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <InfoBox text="Acquisition visar var besokarna kommer fran. Syftet ar att se vilka kanaler som inte bara driver trafik utan ocksa leder till fler kvalificerade leads." />
      </div>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Channels
          <MetricInfo text="Trafikkanaler med sessionsvolym och konvertering." />
        </h3>
        <div className="space-y-2">
          {data.acquisition.channels.map((c) => (
            <div key={`${c.channel}-${c.medium}`} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{c.channel} / {c.medium}</span>
                <span className="text-muted">
                  {c.sessions} <MetricLabel label="sessions" info="Antal besok i kanalen under perioden." />
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                <MetricLabel label="Engaged" info="Sessioner med aktiv interaktion." /> {c.engagedSessions} · {" "}
                <MetricLabel label="Leads" info="Antal leads skapade fran kanalen." /> {c.leads} · {" "}
                <MetricLabel label="CVR" info="Konverteringsgrad: andel sessioner som blir leads." /> {formatPercent(c.conversionRate)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Campaigns
          <MetricInfo text="Kampanjnivå med sessions- och lead-volym." />
        </h3>
        <div className="space-y-2">
          {data.acquisition.campaigns.map((c) => (
            <div key={c.campaign} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{c.campaign}</span>
              <span className="text-muted">
                {c.sessions} <MetricLabel label="sessions" info="Besok med denna kampanjtagg." /> · {" "}
                {c.leads} <MetricLabel label="leads" info="Leads fran denna kampanjtagg." />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Referrers
          <MetricInfo text="Externa domaner som skickar trafik till er." />
        </h3>
        <div className="space-y-2">
          {data.acquisition.referrers.map((r) => (
            <div key={r.referrer} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{r.referrer}</span>
              <span className="text-muted">
                {r.sessions} <MetricLabel label="sessions" info="Besok som kom via denna referenskalla." />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Locales
          <MetricInfo text="Sprak- eller lokalinställning som besokaren anvander." />
        </h3>
        <div className="space-y-2">
          {data.acquisition.locales.map((l) => (
            <div key={l.locale} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{l.locale}</span>
              <span className="text-muted">
                {l.sessions} <MetricLabel label="sessions" info="Besok med denna locale under perioden." />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EngagementTab({ data }: { data: AnalysisSummary }) {
  return (
    <div className="space-y-5">
      <InfoBox text="Engagement beskriver hur djupt besokare interagerar. Hogre engagement betyder oftast att fragor och budskap ar relevanta for malgruppen." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Msgs / conversation"
          value={data.engagement.avgMessagesPerConversation}
          unit="st"
          delta={0}
          formula="messages / conversations"
          info="Hur manga meddelanden en genomsnittlig konversation innehaller."
          decimals={2}
          index={0}
        />
        <KpiCard
          label="Answers / session"
          value={data.engagement.avgQuestionsAnsweredPerSession}
          unit="st"
          delta={0}
          formula="answered question_responses / sessions"
          info="Antal fragor som faktiskt besvaras per besok."
          decimals={2}
          index={1}
        />
        <KpiCard
          label="Svarstid"
          value={data.engagement.avgResponseTimeMs}
          unit="ms"
          delta={0}
          formula="medel response_time_ms (ej skip)"
          info="Genomsnittlig svarstid i flodet. Kortare tid brukar ge battre upplevelse."
          index={2}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Module engagement
            <MetricInfo text="Hur djupt besokare engagerar sig i varje modul." />
          </h3>
          <div className="space-y-2">
            {data.engagement.moduleEngagement.map((m) => (
              <div key={m.module_id} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-fg-deep">{m.name}</span>
                  <span className="text-muted">/{m.slug}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  <MetricLabel label="Sessions" info="Antal startade besok i modulen." /> {m.sessions} · {" "}
                  <MetricLabel label="Engaged" info="Andel eller antal besok med aktiv interaktion." /> {m.engagedSessions} · {" "}
                  <MetricLabel label="Completion" info="Andel som fullfoljer modulens flode." /> {formatPercent(m.completionRate)} · {" "}
                  <MetricLabel label="Lead rate" info="Andel sessioner som blir leads i modulen." /> {formatPercent(m.leadRate)} · {" "}
                  <MetricLabel label="Avg responses" info="Genomsnittligt antal svar per session i modulen." /> {m.avgResponsesPerSession.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
            Top events
            <MetricInfo text="Mest forekommande handelser i den valda perioden." />
          </h3>
          <div className="space-y-2">
            {data.engagement.events.map((e) => (
              <div key={e.eventType} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
                <span className="text-fg-deep">{e.eventType}</span>
                <span className="text-muted">
                  {e.count} <MetricLabel label="antal" info="Hur manga ganger eventet registrerats." />
                </span>
              </div>
            ))}
            {data.engagement.events.length === 0 && (
              <p className="text-xs text-muted">Inga events registrerade i perioden.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ConversionTab({ data }: { data: AnalysisSummary }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <InfoBox text="Conversion visar stegen fran start till antagen lead. Har ser ni exakt var i tratten ni tappar flest personer och var forbattringar ger storst effekt." />
      </div>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Funnel steps
          <MetricInfo text="Visar hur manga som finns kvar i varje steg av tratten." />
        </h3>
        <div className="space-y-2">
          {data.conversion.steps.map((s) => (
            <div key={s.step} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{s.step}</span>
                <span className="text-muted">{formatNumber(s.count)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                <MetricLabel label="Rate from previous" info="Andel som gar vidare hit fran foregaende steg." />: {formatPercent(s.rateFromPrevious)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Module funnel
          <MetricInfo text="Jämfor funnel-resultat mellan moduler." />
        </h3>
        <div className="space-y-2">
          {data.conversion.moduleFunnel.map((m) => (
            <div key={m.module_id} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{m.name}</span>
                <span className="text-muted">/{m.slug}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                <MetricLabel label="Started" info="Hur manga sessioner som startade modulen." /> {m.started} · {" "}
                <MetricLabel label="Completed" info="Hur manga som fullfoljde modulen." /> {m.completed} · {" "}
                <MetricLabel label="Leads" info="Hur manga leads som skapades via modulen." /> {m.leads} · {" "}
                <MetricLabel label="Accepted" info="Hur manga leads fran modulen som markerats antagna." /> {m.accepted}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 lg:col-span-2">
        <h3 className="eyebrow mb-4 inline-flex items-center gap-1.5">
          Geografi
          <MetricInfo text="Fordelning av leads per kommun i vald period." />
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.geography.municipalities.map((m) => (
            <div key={m.municipality} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{m.municipality}</span>
              <span className="text-muted">
                {m.count} <MetricLabel label="leads" info="Antal leads registrerade i kommunen." />
              </span>
            </div>
          ))}
          {data.geography.municipalities.length === 0 && (
            <p className="text-xs text-muted">Ingen kommundata i vald period.</p>
          )}
        </div>
      </section>
    </div>
  );
}
