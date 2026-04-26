"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataFilters } from "./data-filters";
import { MetricInfo } from "./metric-info";
import { cn } from "@/lib/utils";

type Funnel = {
  started: number;
  completed: number;
  abandoned: number;
  completion_rate: number;
};
type QStat = {
  question_id: string;
  question_key: string;
  answered: number;
  skipped: number;
  avg_ms: number;
};
type VariantStat = { id: string; label: string; shown: number; converted: number };
type AbResult = {
  id: string;
  label: string;
  shown: number;
  converted: number;
  rate: number;
  probBest: number;
  upliftVsControl: number | null;
};

type Payload = {
  range_days: number;
  funnel: Funnel;
  questions: QStat[];
  variant_stats: Record<string, VariantStat[]>;
  ab_analysis: Record<string, AbResult[]>;
};

export function ModuleStats({
  moduleId,
  moduleName,
}: {
  moduleId: string;
  moduleName: string;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [questionSearch, setQuestionSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/modules/${moduleId}/stats?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [moduleId, days]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    const q = questionSearch.trim().toLowerCase();
    if (!q) return data.questions;
    return data.questions.filter((question) => question.question_key.toLowerCase().includes(q));
  }, [data, questionSearch]);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Link href={`/admin/modules/${moduleId}`} className="icon-btn-outline">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <span className="eyebrow">Statistik</span>
          <h1 className="mt-1 text-3xl">
            {moduleName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Funnel, per-fråge-completion och Bayesiansk A/B-analys.
          </p>
        </div>
      </div>

      <DataFilters
        searchValue={questionSearch}
        onSearchChange={setQuestionSearch}
        searchPlaceholder="Filtrera frågenyckel..."
        selects={[
          {
            key: "days",
            label: "Period",
            value: String(days),
            onChange: (value) => setDays(Number(value)),
            options: [
              { value: "7", label: "7 dagar" },
              { value: "30", label: "30 dagar" },
              { value: "90", label: "90 dagar" },
              { value: "365", label: "1 år" },
            ],
          },
        ]}
        onClear={() => {
          setDays(30);
          setQuestionSearch("");
        }}
      />

      {loading || !data ? (
        <p className="text-sm text-muted">Laddar...</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            <Kpi
              label="Startade"
              info="Antal personer som började detta flöde i vald period."
              value={data.funnel.started}
            />
            <Kpi
              label="Slutförda"
              info="Antal personer som tog sig igenom hela flödet."
              value={data.funnel.completed}
            />
            <Kpi
              label="Completion"
              info="Andel av startade som slutför hela flödet."
              value={`${Math.round(data.funnel.completion_rate * 100)} %`}
            />
            <Kpi
              label="Avbrutna"
              info="Antal personer som lämnade innan flödet var klart."
              value={data.funnel.abandoned}
            />
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="eyebrow inline-flex items-center gap-1.5">
                Per fråga
                <MetricInfo text="Visar hur varje fråga presterar i svarsfrekvens och tidsåtgång." />
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Fråga</th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      Besvarade
                      <MetricInfo text="Hur många gånger frågan har besvarats." />
                    </span>
                  </th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      Hoppade
                      <MetricInfo text="Hur många gånger frågan hoppades över." />
                    </span>
                  </th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      Snittid
                      <MetricInfo text="Genomsnittlig tid att besvara frågan." />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuestions.map((q) => (
                  <tr key={q.question_id}>
                    <td className="px-6 py-3">
                      <code className="rounded-full bg-bg px-2 py-0.5 text-xs text-fg">
                        {q.question_key}
                      </code>
                    </td>
                    <td className="px-6 py-3 font-mono">{q.answered}</td>
                    <td className="px-6 py-3 font-mono text-muted">{q.skipped}</td>
                    <td className="px-6 py-3 font-mono text-muted">
                      {q.avg_ms > 0 ? `${Math.round(q.avg_ms / 100) / 10}s` : "—"}
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted">
                      Inga frågor matchar filtret.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="space-y-4">
            <h2 className="eyebrow inline-flex items-center gap-1.5">
              A/B-analys per fråga
              <MetricInfo text="Jämför varianter och visar sannolik vinnare för varje fråga." />
            </h2>
            {filteredQuestions.map((q) => {
              const ab = data.ab_analysis[q.question_id];
              if (!ab || ab.length === 0) return null;
              return (
                <article key={q.question_id} className="card p-6">
                  <div className="text-xs text-muted">
                    <code className="rounded-full bg-bg px-2 py-0.5 text-fg">
                      {q.question_key}
                    </code>
                  </div>
                  <div className="mt-4 space-y-2">
                    {ab.map((v) => {
                      const isBest = v.probBest >= 0.95;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 rounded-full bg-bg px-4 py-2 text-sm"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                              isBest
                                ? "bg-accent text-white"
                                : "bg-surface text-fg shadow-soft",
                            )}
                          >
                            {v.label}
                          </span>
                          <span className="flex-1 text-muted">
                            {v.shown} visn.
                            <span className="ml-1 inline-flex align-middle">
                              <MetricInfo text="Antal gånger varianten visats för besökare." />
                            </span>
                            {" "}· {v.converted} svar
                            <span className="ml-1 inline-flex align-middle">
                              <MetricInfo text="Antal svar eller konverteringar som varianten gav." />
                            </span>
                          </span>
                          <span className="font-mono text-fg-deep">
                            {(v.rate * 100).toFixed(1)} %
                            <span className="ml-1 inline-flex align-middle">
                              <MetricInfo text="Konverteringsgrad för varianten." />
                            </span>
                          </span>
                          <span className="w-28 text-right text-xs text-muted">
                            {(v.probBest * 100).toFixed(0)} % sannolik bäst
                            <span className="ml-1 inline-flex align-middle">
                              <MetricInfo text="Sannolikhet att varianten är bäst givet observerad data." />
                            </span>
                          </span>
                          {v.upliftVsControl != null &&
                            v.upliftVsControl !== 0 && (
                              <span
                                className={cn(
                                  "w-20 text-right text-xs font-medium",
                                  v.upliftVsControl > 0
                                    ? "text-accent"
                                    : "text-danger",
                                )}
                              >
                                {v.upliftVsControl > 0 ? "+" : ""}
                                {(v.upliftVsControl * 100).toFixed(1)} %
                                <span className="ml-1 inline-flex align-middle">
                                  <MetricInfo text="Skillnad mot kontrollvarianten i procentenheter." />
                                </span>
                              </span>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  info,
}: {
  label: string;
  value: number | string;
  info?: string;
}) {
  return (
    <div className="card p-5">
      <div className="eyebrow inline-flex items-center gap-1.5">
        {label}
        {info ? <MetricInfo text={info} /> : null}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-fg-deep">
        {value}
      </div>
    </div>
  );
}
