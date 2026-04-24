"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import { LeadsChart } from "./leads-chart";
import { SourceChart } from "./source-chart";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { AnalysisSummary } from "@/lib/types";

type AnalysisTab = "overview" | "acquisition" | "engagement" | "conversion";

const TAB_LABELS: Array<{ id: AnalysisTab; label: string }> = [
  { id: "overview", label: "Översikt" },
  { id: "acquisition", label: "Acquisition" },
  { id: "engagement", label: "Engagement" },
  { id: "conversion", label: "Conversion" },
];

export function AnalysisDashboard() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<AnalysisTab>("overview");
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [days]);

  const sourceChartData = useMemo(
    () =>
      (data?.quality.sourcePerformance ?? []).map((s) => ({
        source_id: s.source_id,
        label: s.label,
        count: s.total,
        color: "#38B4E3",
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

        <div className="flex items-center gap-2 rounded-full bg-surface p-1 shadow-soft">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                days === d ? "bg-fg text-white" : "text-muted hover:text-fg",
              )}
            >
              {d} dagar
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-fg text-white shadow-soft"
                : "bg-surface text-muted shadow-soft hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab data={data} sourceChartData={sourceChartData} />
      )}
      {tab === "acquisition" && <AcquisitionTab data={data} />}
      {tab === "engagement" && <EngagementTab data={data} />}
      {tab === "conversion" && <ConversionTab data={data} />}
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Användare"
          value={data.overview.users}
          unit="st"
          delta={0}
          formula="Unika ip_hash i perioden"
          index={0}
        />
        <KpiCard
          label="Sessioner"
          value={data.overview.sessions}
          unit="st"
          delta={0}
          formula="module_sessions startade"
          index={1}
        />
        <KpiCard
          label="Bounce rate"
          value={Math.round(data.overview.bounceRate * 100)}
          unit="%"
          delta={0}
          formula="Ej engagerade sessioner / sessioner"
          index={2}
        />
        <KpiCard
          label="Lead conversion"
          value={Math.round(data.overview.leadConversionRate * 100)}
          unit="%"
          delta={0}
          formula="Leads / sessioner"
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
          <LeadsChart data={data.trend.sessionsPerDay} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="eyebrow mb-4">Leads per dag</h3>
          <LeadsChart data={data.trend.leadsPerDay} />
        </motion.section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4">Källor</h3>
          <SourceChart data={sourceChartData} />
          <div className="mt-4 space-y-2">
            {data.quality.sourcePerformance.map((s) => (
              <div key={s.source_id} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">{s.total} leads · {formatPercent(s.acceptedRate)} accepted</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4">Kvalitet</h3>
          <div className="space-y-2">
            {data.quality.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">{formatNumber(s.count)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Snittscore: {data.overview.avgScore} · Snitt assistant output-tokens: {data.overview.avgAssistantOutputTokens}
          </p>
        </section>
      </div>
    </div>
  );
}

function AcquisitionTab({ data }: { data: AnalysisSummary }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-6">
        <h3 className="eyebrow mb-4">Channels</h3>
        <div className="space-y-2">
          {data.acquisition.channels.map((c) => (
            <div key={`${c.channel}-${c.medium}`} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{c.channel} / {c.medium}</span>
                <span className="text-muted">{c.sessions} sessions</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Engaged {c.engagedSessions} · Leads {c.leads} · CVR {formatPercent(c.conversionRate)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4">Campaigns</h3>
        <div className="space-y-2">
          {data.acquisition.campaigns.map((c) => (
            <div key={c.campaign} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{c.campaign}</span>
              <span className="text-muted">{c.sessions} sessions · {c.leads} leads</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4">Referrers</h3>
        <div className="space-y-2">
          {data.acquisition.referrers.map((r) => (
            <div key={r.referrer} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{r.referrer}</span>
              <span className="text-muted">{r.sessions}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4">Locales</h3>
        <div className="space-y-2">
          {data.acquisition.locales.map((l) => (
            <div key={l.locale} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{l.locale}</span>
              <span className="text-muted">{l.sessions}</span>
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Msgs / conversation"
          value={data.engagement.avgMessagesPerConversation}
          unit="st"
          delta={0}
          formula="messages / conversations"
          decimals={2}
          index={0}
        />
        <KpiCard
          label="Answers / session"
          value={data.engagement.avgQuestionsAnsweredPerSession}
          unit="st"
          delta={0}
          formula="answered question_responses / sessions"
          decimals={2}
          index={1}
        />
        <KpiCard
          label="Svarstid"
          value={data.engagement.avgResponseTimeMs}
          unit="ms"
          delta={0}
          formula="medel response_time_ms (ej skip)"
          index={2}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4">Module engagement</h3>
          <div className="space-y-2">
            {data.engagement.moduleEngagement.map((m) => (
              <div key={m.module_id} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-fg-deep">{m.name}</span>
                  <span className="text-muted">/{m.slug}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Sessions {m.sessions} · Engaged {m.engagedSessions} · Completion {formatPercent(m.completionRate)} · Lead rate {formatPercent(m.leadRate)} · Avg responses {m.avgResponsesPerSession.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4">Top events</h3>
          <div className="space-y-2">
            {data.engagement.events.map((e) => (
              <div key={e.eventType} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
                <span className="text-fg-deep">{e.eventType}</span>
                <span className="text-muted">{e.count}</span>
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
      <section className="card p-6">
        <h3 className="eyebrow mb-4">Funnel steps</h3>
        <div className="space-y-2">
          {data.conversion.steps.map((s) => (
            <div key={s.step} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{s.step}</span>
                <span className="text-muted">{formatNumber(s.count)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Rate from previous: {formatPercent(s.rateFromPrevious)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="eyebrow mb-4">Module funnel</h3>
        <div className="space-y-2">
          {data.conversion.moduleFunnel.map((m) => (
            <div key={m.module_id} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-deep">{m.name}</span>
                <span className="text-muted">/{m.slug}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Started {m.started} · Completed {m.completed} · Leads {m.leads} · Accepted {m.accepted}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 lg:col-span-2">
        <h3 className="eyebrow mb-4">Geografi</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.geography.municipalities.map((m) => (
            <div key={m.municipality} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-sm">
              <span className="text-fg-deep">{m.municipality}</span>
              <span className="text-muted">{m.count}</span>
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
