"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import { LeadsChart } from "./leads-chart";
import { SourceChart } from "./source-chart";
import { FunnelChart } from "./funnel-chart";
import type { DashboardSummary } from "@/lib/types";

export function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard?days=30");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Okänt fel");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <SkeletonDashboard />;

  if (error) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-danger">
          Kunde inte ladda data
        </h2>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, leadsPerDay, leadsPerSource, funnel } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Leads denna period"
          value={kpis.leadsThisPeriod}
          unit="st"
          delta={kpis.leadsDelta}
          formula={`Totalt ${kpis.totalLeads} leads`}
          index={0}
        />
        <KpiCard
          label="Konverteringsgrad"
          value={Math.round(kpis.conversionRate * 100)}
          unit="%"
          delta={kpis.conversionDelta}
          formula="Antagna / totalt antal leads"
          decimals={0}
          index={1}
        />
        <KpiCard
          label="Aktiv pipeline"
          value={kpis.activePipeline}
          unit="st"
          delta={kpis.pipelineDelta}
          formula="Leads i aktiva steg"
          index={2}
        />
        <KpiCard
          label="Snittpoäng"
          value={kpis.avgScore}
          unit="/ 100"
          delta={kpis.scoreDelta}
          formula="AI-baserad lead scoring"
          index={3}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="card p-6"
        >
          <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Leads per dag
          </h3>
          <LeadsChart data={leadsPerDay} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="card p-6"
        >
          <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Leads per källa
          </h3>
          <SourceChart data={leadsPerSource} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="card p-6"
      >
        <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Konverteringstratt
        </h3>
        <FunnelChart data={funnel} />
      </motion.div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-40 animate-pulse p-6">
            <div className="h-3 w-24 rounded bg-bg" />
            <div className="mt-6 h-10 w-32 rounded bg-bg" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card h-80 animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </div>
      <div className="card h-64 animate-pulse" />
    </div>
  );
}
