"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { QuestionWithVariant } from "@/lib/questions";
import { cn } from "@/lib/utils";

type AnswerMap = Record<string, unknown>;

export function ModuleWizard({
  slug,
  sessionId,
  questions,
  requireEmail,
  requirePhone,
}: {
  slug: string;
  sessionId: string;
  questions: QuestionWithVariant[];
  requireEmail: boolean;
  requirePhone: boolean;
}) {
  const activeQuestions = questions.filter((q) => q.is_active);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [idx]);

  if (activeQuestions.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
        <p className="text-sm text-muted">
          Den här modulen saknar frågor. Kontakta Movexum direkt.
        </p>
      </div>
    );
  }

  const q = activeQuestions[idx];
  const value = answers[q.key];
  const isLast = idx === activeQuestions.length - 1;

  const setValue = (v: unknown) => setAnswers({ ...answers, [q.key]: v });

  const canAdvance = (() => {
    if (!q.required) return true;
    if (q.type === "multi_choice") {
      return Array.isArray(value) && value.length > 0;
    }
    if (q.type === "scale_1_5" || q.type === "number") {
      return typeof value === "number" && !Number.isNaN(value);
    }
    return typeof value === "string" && value.trim().length > 0;
  })();

  const logAnswer = async (skipped: boolean) => {
    const responseTimeMs = Date.now() - questionStartRef.current;
    await fetch(`/api/modules/${slug}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: q.id,
        variantId: q.variant_id,
        answer: skipped ? null : answers[q.key] ?? null,
        responseTimeMs,
        skipped,
      }),
    }).catch(() => {
      /* best effort */
    });
  };

  const next = async () => {
    await logAnswer(false);
    if (isLast) {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/modules/${slug}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answers }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Kunde inte skicka in svaren");
          return;
        }
        setDone(true);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setIdx(idx + 1);
  };

  const skip = async () => {
    await logAnswer(true);
    if (isLast) {
      setSubmitting(true);
      try {
        await fetch(`/api/modules/${slug}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answers }),
        });
        setDone(true);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setIdx(idx + 1);
  };

  const prev = () => setIdx(Math.max(0, idx - 1));

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-surface p-10 text-center shadow-card"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-fg-deep">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl">Tack för din idé</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Vi återkommer inom några arbetsdagar. Om du vill att vi glömmer dina
          uppgifter — svara bara &quot;radera&quot; på vårt kontaktmail.
        </p>
      </motion.div>
    );
  }

  const progress = ((idx + 1) / activeQuestions.length) * 100;

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
          {idx + 1} / {activeQuestions.length}
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
          <label
            htmlFor={`q-${q.id}`}
            className="block text-xl font-medium text-fg-deep sm:text-2xl"
          >
            {q.text}
            {q.required && (
              <span className="ml-1 text-accent" aria-hidden>
                *
              </span>
            )}
          </label>
          {q.help && (
            <p className="mt-2 text-sm text-muted" id={`q-${q.id}-help`}>
              {q.help}
            </p>
          )}

          <div className="mt-6">
            <QuestionInput
              question={q}
              value={value}
              onChange={setValue}
              requireEmail={requireEmail}
              requirePhone={requirePhone}
            />
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
            <div className="flex items-center gap-2">
              {!q.required && (
                <button
                  type="button"
                  onClick={skip}
                  disabled={submitting}
                  className="btn-ghost"
                >
                  Hoppa över
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance || submitting}
                className="btn-primary"
              >
                <ArrowRight className="h-4 w-4" />
                {submitting
                  ? "Skickar..."
                  : isLast
                    ? "Skicka in"
                    : "Nästa"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuestionWithVariant;
  value: unknown;
  onChange: (v: unknown) => void;
  requireEmail: boolean;
  requirePhone: boolean;
}) {
  const id = `q-${question.id}`;
  const describedBy = question.help ? `${id}-help` : undefined;

  switch (question.type) {
    case "long_text":
      return (
        <textarea
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="textarea"
          aria-describedby={describedBy}
        />
      );
    case "email":
      return (
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          aria-describedby={describedBy}
        />
      );
    case "phone":
      return (
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          aria-describedby={describedBy}
        />
      );
    case "url":
      return (
        <input
          id={id}
          type="url"
          inputMode="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          aria-describedby={describedBy}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input"
          aria-describedby={describedBy}
        />
      );
    case "scale_1_5":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-12 w-12 rounded-full text-base font-medium shadow-soft transition",
                value === n
                  ? "bg-fg text-white"
                  : "bg-surface text-fg hover:shadow-card",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    case "single_choice":
      return (
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(question.options ?? []).map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium shadow-soft transition",
                  active
                    ? "bg-fg text-white"
                    : "bg-surface text-fg hover:shadow-card",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    case "multi_choice": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) => {
        if (arr.includes(v)) onChange(arr.filter((x) => x !== v));
        else onChange([...arr, v]);
      };
      return (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((opt) => {
            const active = arr.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(opt.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium shadow-soft transition",
                  active
                    ? "bg-fg text-white"
                    : "bg-surface text-fg hover:shadow-card",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "consent":
      return (
        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>{question.help ?? "Jag samtycker"}</span>
        </label>
      );
    case "short_text":
    default:
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          aria-describedby={describedBy}
        />
      );
  }
}
