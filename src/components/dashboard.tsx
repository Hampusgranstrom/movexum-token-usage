"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { KpiCard } from "./kpi-card";
import { UsageChart } from "./usage-chart";
import type { UsageSummary } from "@/lib/types";

type ApiError = {
  error: string;
  details?: string[];
  hints?: string[];
};

export function Dashboard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage?days=30&grid=global", { cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json()) as UsageSummary | ApiError;
        if (!r.ok) {
          throw body as ApiError;
        }
        return body as UsageSummary;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err && typeof err === "object" && "error" in err) {
          setApiError(err as ApiError);
        } else {
          setApiError({ error: String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (apiError) {
    return <ErrorPanel err={apiError} />;
  }

  if (!summary) {
    return <SkeletonDashboard />;
  }

  const sourceLabel =
    summary.source === "supabase" ? "Supabase" : "OpenAI live";

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
          <span
            className="rounded-full border border-accent-co2/40 bg-accent-co2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-co2"
            title={`Datakälla: ${sourceLabel}`}
          >
            {sourceLabel}
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

function ErrorPanel({ err }: { err: ApiError }) {
  return (
    <div className="relative z-10 space-y-6">
      <div className="card border-accent-co2Danger/40 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-accent-co2Danger" />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-co2Danger">
                Ingen data
              </h2>
              <p className="mt-1 text-sm text-text-primary">{err.error}</p>
            </div>

            {err.details && err.details.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Detaljer
                </p>
                <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                  {err.details.map((d, i) => (
                    <li key={i} className="font-mono">
                      · {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {err.hints && err.hints.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Så löser du det
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-text-secondary">
                  {err.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
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
