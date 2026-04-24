"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import type { DashboardSummary } from "@/lib/types";

const LeadsChart = dynamic(
  () => import("./leads-chart").then((m) => m.LeadsChart),
  { ssr: false },
);
const SourceChart = dynamic(
  () => import("./source-chart").then((m) => m.SourceChart),
  { ssr: false },
);
const FunnelChart = dynamic(
  () => import("./funnel-chart").then((m) => m.FunnelChart),
  { ssr: false },
);

export function Dashboard({ initialData }: { initialData: DashboardSummary }) {
  const data = initialData;

  const { kpis, leadsPerDay, leadsPerSource, funnel } = data;

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <span className="eyebrow">Dashboard</span>
        <h1 className="mt-3 text-4xl sm:text-5xl">
          Översikt över inflödet
        </h1>
        <p className="mt-3 text-base text-muted">
          Senaste 30 dagarna · AI-scoring, källor och konverteringstratt
        </p>
      </header>

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
          <h3 className="eyebrow mb-4">
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
          <h3 className="eyebrow mb-4">
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
        <h3 className="eyebrow mb-4">Konverteringstratt</h3>
        <FunnelChart data={funnel} />
      </motion.div>
    </div>
  );
}
