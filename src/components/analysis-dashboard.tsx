"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import { LeadsChart } from "./leads-chart";
import { SourceChart } from "./source-chart";
import { cn, formatPercent } from "@/lib/utils";
import type { AnalysisSummary } from "@/lib/types";

export function AnalysisDashboard() {
  const [days, setDays] = useState(30);
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
      (data?.sourcePerformance ?? []).map((s) => ({
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
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Analys</span>
          <h1 className="mt-2 text-4xl sm:text-5xl">Mätning av inflöde och kvalitet</h1>
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Leads i period"
          value={data.kpis.leadsPeriod}
          unit="st"
          delta={0}
          formula="Skapade leads i vald period"
          index={0}
        />
        <KpiCard
          label="Lead till antagen"
          value={Math.round(data.kpis.leadToAcceptedRate * 100)}
          unit="%"
          delta={0}
          formula="Accepted / leads"
          index={1}
        />
        <KpiCard
          label="Lead capture"
          value={Math.round(data.kpis.leadCaptureRate * 100)}
          unit="%"
          delta={0}
          formula="Sessions med lead / completed sessions"
          index={2}
        />
        <KpiCard
          label="Snittscore"
          value={data.kpis.avgScore}
          unit="/100"
          delta={0}
          formula="Genomsnitt av lead score"
          decimals={1}
          index={3}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="eyebrow mb-4">Leads per dag</h3>
          <LeadsChart data={data.series.leadsPerDay} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="eyebrow mb-4">Samtal per dag</h3>
          <LeadsChart data={data.series.conversationsPerDay} />
        </motion.section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4">Källor (volym)</h3>
          <SourceChart data={sourceChartData} />
          <div className="mt-4 space-y-2">
            {data.sourcePerformance.map((s) => (
              <div key={s.source_id} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">
                  {s.total} leads · {formatPercent(s.acceptedRate)} accepted
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4">Token per dag</h3>
          <div className="space-y-2">
            {data.series.tokensPerDay.slice(-14).map((t) => (
              <div key={t.date} className="flex items-center justify-between rounded-full bg-bg px-4 py-2 text-xs">
                <span className="font-medium text-fg-deep">{t.date}</span>
                <span className="text-muted">in {t.input.toLocaleString("sv-SE")} · ut {t.output.toLocaleString("sv-SE")}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Snitt output-tokens per assistant-meddelande: {data.kpis.avgOutputTokensPerAssistantMessage}
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="eyebrow mb-4">Modulprestanda</h3>
          <div className="space-y-2">
            {data.modulePerformance.map((m) => (
              <div key={m.module_id} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-fg-deep">{m.name}</p>
                  <p className="text-xs text-muted">/{m.slug}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  start {m.started} · complete {m.completed} ({formatPercent(m.completionRate)}) · leads {m.leadsCreated} ({formatPercent(m.leadRate)})
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="eyebrow mb-4">Status och kommuner</h3>
          <div className="space-y-2">
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-fg-deep">{s.label}</span>
                <span className="text-muted">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="eyebrow mb-2">Top kommuner</p>
            <div className="space-y-2">
              {data.topMunicipalities.length === 0 ? (
                <p className="text-xs text-muted">Ingen kommundata ännu</p>
              ) : (
                data.topMunicipalities.map((m) => (
                  <div key={m.municipality} className="flex items-center justify-between text-sm">
                    <span className="text-fg-deep">{m.municipality}</span>
                    <span className="text-muted">{m.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="card p-6">
        <h3 className="eyebrow mb-4">Eventlogg (aggregerad)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.eventCounts.map((e) => (
            <div key={e.eventType} className="rounded-full bg-bg px-4 py-2 text-xs text-fg-deep">
              <span className="font-medium">{e.eventType}</span>
              <span className="ml-2 text-muted">{e.count}</span>
            </div>
          ))}
          {data.eventCounts.length === 0 && (
            <p className="text-xs text-muted">Inga event registrerade i vald period.</p>
          )}
        </div>
      </section>
    </div>
  );
}
