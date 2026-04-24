"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DataFilters } from "./data-filters";
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
  const [days, setDays] = useState("30");
  const [data, setData] = useState<DashboardSummary>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/dashboard?days=${days}`);
        if (!res.ok) return;
        const next = (await res.json()) as DashboardSummary;
        if (alive) setData(next);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [days]);

  const { kpis, leadsPerDay, leadsPerSource, funnel } = data;

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <span className="eyebrow">Dashboard</span>
        <h1 className="mt-3 text-4xl sm:text-5xl">
          Översikt över inflödet
        </h1>
        <p className="mt-3 text-base text-muted">
          Senaste {days} dagarna · AI-scoring, källor och konverteringstratt
        </p>
      </header>

      <DataFilters
        selects={[
          {
            key: "period",
            label: "Period",
            value: days,
            onChange: setDays,
            options: [
              { value: "7", label: "7 dagar" },
              { value: "30", label: "30 dagar" },
              { value: "60", label: "60 dagar" },
              { value: "90", label: "90 dagar" },
            ],
          },
        ]}
      />

      {loading ? (
        <p className="text-sm text-muted">Uppdaterar data...</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Leads denna period"
          value={kpis.leadsThisPeriod}
          unit="st"
          delta={kpis.leadsDelta}
          formula={`Totalt ${kpis.totalLeads} leads`}
          info="Antal nya leads under vald period. Visar hur stort inflode ni har just nu."
          index={0}
        />
        <KpiCard
          label="Konverteringsgrad"
          value={Math.round(kpis.conversionRate * 100)}
          unit="%"
          delta={kpis.conversionDelta}
          formula="Antagna / totalt antal leads"
          info="Andelen leads som blir antagna. Hogre andel betyder att fler passar erbjudandet."
          decimals={0}
          index={1}
        />
        <KpiCard
          label="Aktiv pipeline"
          value={kpis.activePipeline}
          unit="st"
          delta={kpis.pipelineDelta}
          formula="Leads i aktiva steg"
          info="Leads som fortfarande handlaggs och inte ar avslutade."
          index={2}
        />
        <KpiCard
          label="Snittpoäng"
          value={kpis.avgScore}
          unit="/ 100"
          delta={kpis.scoreDelta}
          formula="AI-baserad lead scoring"
          info="Genomsnittligt matchningsbetyg for nya leads pa skalan 0 till 100."
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
          <div className="min-h-[320px]">
            <LeadsChart data={leadsPerDay} />
          </div>
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
          <div className="min-h-[320px]">
            <SourceChart data={leadsPerSource} />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="card p-6"
      >
        <h3 className="eyebrow mb-4">Konverteringstratt</h3>
        <div className="min-h-[320px]">
          <FunnelChart data={funnel} />
        </div>
      </motion.div>
    </div>
  );
}
