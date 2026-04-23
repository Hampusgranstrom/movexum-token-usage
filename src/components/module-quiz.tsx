"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { QuestionWithVariant } from "@/lib/questions";
import type { ResultBucket } from "@/lib/modules";
import { cn } from "@/lib/utils";

type QuizResult = {
  bucket: ResultBucket;
  scores: Record<string, number>;
  all_buckets: ResultBucket[];
};

export function ModuleQuiz({
  slug,
  sessionId,
  questions,
}: {
  slug: string;
  sessionId: string;
  questions: QuestionWithVariant[];
}) {
  const active = questions.filter(
    (q) => q.is_active && q.type === "single_choice",
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
  }, [idx]);

  if (active.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
        <p className="text-sm text-muted">
          Den här quizen saknar frågor. Kontakta Movexum direkt.
        </p>
      </div>
    );
  }

  if (result) {
    return <QuizResultView result={result} onRestart={() => location.reload()} />;
  }

  const q = active[idx];
  const selected = answers[q.key];
  const isLast = idx === active.length - 1;

  const pick = (value: string) => {
    setAnswers({ ...answers, [q.key]: value });
  };

  const logAnswer = async () => {
    const responseTimeMs = Date.now() - startRef.current;
    await fetch(`/api/modules/${slug}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: q.id,
        variantId: q.variant_id,
        answer: answers[q.key] ?? null,
        responseTimeMs,
        skipped: !answers[q.key],
      }),
    }).catch(() => {
      /* best-effort */
    });
  };

  const next = async () => {
    if (!selected) return;
    await logAnswer();
    if (isLast) {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/modules/${slug}/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Kunde inte beräkna resultat");
          return;
        }
        setResult(data);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setIdx(idx + 1);
  };

  const prev = () => setIdx(Math.max(0, idx - 1));

  const progress = ((idx + 1) / active.length) * 100;

  return (
    <div className="rounded-2xl bg-surface p-8 shadow-card">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-deep">
          <motion.div
            className="h-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs font-medium text-muted">
          {idx + 1} / {active.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-xl font-medium text-fg-deep sm:text-2xl">
            {q.text}
          </h2>
          {q.help && <p className="mt-2 text-sm text-muted">{q.help}</p>}

          <div className="mt-6 space-y-2">
            {(q.options ?? []).map((opt) => {
              const isActive = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition",
                    isActive
                      ? "bg-fg text-white shadow-card"
                      : "bg-bg text-fg-deep shadow-soft hover:bg-surface hover:shadow-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-medium",
                      isActive ? "bg-white/20 text-white" : "bg-surface text-muted",
                    )}
                  >
                    {opt.value}
                  </span>
                  <span className="flex-1 text-sm sm:text-base">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={idx === 0 || submitting}
              className="btn-ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              Tillbaka
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!selected || submitting}
              className="btn-primary"
            >
              <ArrowRight className="h-4 w-4" />
              {submitting
                ? "Räknar ut..."
                : isLast
                  ? "Visa resultat"
                  : "Nästa"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuizResultView({
  result,
  onRestart,
}: {
  result: QuizResult;
  onRestart: () => void;
}) {
  const { bucket, scores, all_buckets } = result;
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <section className="rounded-2xl bg-surface p-8 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-fg-deep">
            <CheckCircle className="h-6 w-6" />
          </div>
          <span className="eyebrow">Ditt resultat</span>
        </div>

        <h2 className="mt-6 text-4xl sm:text-5xl">
          <span className="text-accent">{bucket.title}</span>
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          {bucket.description}
        </p>

        {bucket.tips?.length > 0 && (
          <div className="mt-8 space-y-3">
            <span className="eyebrow">Nästa steg</span>
            <ul className="space-y-2">
              {bucket.tips.map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-fg-deep"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bucket.cta_label && bucket.cta_url && (
          <div className="mt-8">
            {bucket.cta_url.startsWith("/") ? (
              <Link href={bucket.cta_url} className="btn-primary">
                <ArrowRight className="h-4 w-4" />
                {bucket.cta_label}
              </Link>
            ) : (
              <a
                href={bucket.cta_url}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary"
              >
                <ArrowRight className="h-4 w-4" />
                {bucket.cta_label}
              </a>
            )}
          </div>
        )}
      </section>

      <section className="card p-6">
        <span className="eyebrow">Din poängfördelning</span>
        <div className="mt-4 space-y-3">
          {all_buckets.map((b) => {
            const s = scores[b.key] ?? 0;
            const pct = (s / total) * 100;
            const isWinner = b.key === bucket.key;
            return (
              <div key={b.key} className="flex items-center gap-3">
                <span className="w-32 text-sm text-muted">{b.title}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-deep">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      isWinner ? "bg-accent" : "bg-subtle",
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs text-muted">
                  {Math.round(s)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button onClick={onRestart} className="btn-ghost">
          Gör om testet
        </button>
      </div>
    </motion.div>
  );
}
