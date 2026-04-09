"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import { UsageChart } from "./usage-chart";
import type { UsageSummary } from "@/lib/types";

export function Dashboard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage?days=30&grid=global", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<UsageSummary>;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="card p-6 text-accent-co2Danger">
        Kunde inte hämta data: {error}
      </div>
    );
  }

  if (!summary) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="relative z-10 space-y-8">
      <header className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-co2" />
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
            Movexum · AI Token Usage
          </span>
          <span className="rounded-full border border-bg-border bg-bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
            {summary.source === "live" ? "Live" : "Mock"}
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          30 dagars användning
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-xl text-sm text-text-secondary"
        >
          Totalt antal tokens som Movexum har skickat till OpenAI, omräknat
          till energi (kWh) och klimatutsläpp (kg CO₂e) baserat på Sam Altmans
          publicerade siffra 0,34 Wh per ChatGPT-query.
        </motion.p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          index={0}
          accent="tokens"
          label="Tokens"
          value={summary.totals.tokens}
          unit="st"
          delta={summary.deltas.tokens}
          formula="input + output · OpenAI Usage API"
        />
        <KpiCard
          index={1}
          accent="energy"
          label="Energi"
          value={summary.totals.kwh}
          unit="kWh"
          delta={summary.deltas.kwh}
          decimals={1}
          formula="tokens × 6,8·10⁻⁷ kWh/token"
        />
        <KpiCard
          index={2}
          accent="co2"
          label="CO₂e"
          value={summary.totals.co2Kg}
          unit="kg"
          delta={summary.deltas.co2Kg}
          decimals={1}
          formula={`kWh × ${summary.grid === "sweden" ? "40" : "475"} g/kWh`}
        />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-text-secondary">
              Tokens per dag
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Senaste 30 dagarna · input + output
            </p>
          </div>
        </div>
        <UsageChart data={summary.days} />
      </motion.section>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="relative z-10 space-y-8">
      <div className="h-20 w-full max-w-md animate-pulse rounded-xl bg-bg-card/40" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-bg-card/40"
          />
        ))}
      </div>
      <div className="h-[360px] animate-pulse rounded-2xl bg-bg-card/40" />
    </div>
  );
}
