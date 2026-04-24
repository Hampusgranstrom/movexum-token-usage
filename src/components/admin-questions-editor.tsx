"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Beaker } from "lucide-react";
import { cn } from "@/lib/utils";

type QType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "url"
  | "single_choice"
  | "multi_choice"
  | "number"
  | "scale_1_5"
  | "consent";

type QOption = {
  value: string;
  label: string;
  scores?: Record<string, number>;
};

type Question = {
  id: string;
  key: string;
  display_order: number;
  type: QType;
  required: boolean;
  help_text: string | null;
  options: QOption[];
  is_active: boolean;
};

type Variant = {
  id: string;
  question_id: string;
  label: string;
  text: string;
  help_text: string | null;
  weight: number;
  is_control: boolean;
  ended_at: string | null;
};

export function QuestionsEditor({
  moduleId,
  moduleName,
  slug,
}: {
  moduleId: string;
  moduleName: string;
  slug: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<QType>("short_text");
  const [newRequired, setNewRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`);
      if (res.ok) {
        const d = await res.json();
        setQuestions(d.questions ?? []);
        setVariants(d.variants ?? []);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Kunde inte ladda frågor");
      }
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const normalizedKey = newKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: normalizedKey,
          text: newText,
          type: newType,
          required: newRequired,
        }),
      });
      if (res.ok) {
        setNewKey("");
        setNewText("");
        setNewType("short_text");
        setNewRequired(false);
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Kunde inte lägga till fråga");
      }
    } finally {
      setAdding(false);
    }
  };

  const removeQuestion = async (id: string) => {
    if (!confirm("Ta bort frågan?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    await load();
  };

  const toggleActive = async (q: Question) => {
    await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !q.is_active }),
    });
    await load();
  };

  const variantsFor = (qid: string) =>
    variants
      .filter((v) => v.question_id === qid && !v.ended_at)
      .sort((a, b) => (a.is_control === b.is_control ? 0 : a.is_control ? -1 : 1));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/admin/modules/${moduleId}`} className="icon-btn-outline">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <span className="eyebrow">Frågor</span>
          <h1 className="mt-1 text-3xl">
            <span className="text-accent">{moduleName}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Dynamiska frågor med varianter för A/B-test. URL:{" "}
            <code className="rounded-full bg-bg px-2 py-0.5 text-xs text-fg">
              /m/{slug}
            </code>
          </p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="eyebrow">Ny fråga</h2>
        <form onSubmit={addQuestion} className="mt-4 space-y-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              className="input"
              placeholder="Nyckel (idea_summary)"
              pattern="[a-z0-9_]{2,40}"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as QType)}
              className="input"
            >
              <option value="short_text">Kort text</option>
              <option value="long_text">Lång text</option>
              <option value="email">E-post</option>
              <option value="phone">Telefon</option>
              <option value="url">URL</option>
              <option value="number">Tal</option>
              <option value="scale_1_5">Skala 1–5</option>
              <option value="single_choice">Välj ett</option>
              <option value="multi_choice">Välj flera</option>
              <option value="consent">Samtycke</option>
            </select>
          </div>
          <input
            required
            className="input"
            placeholder="Frågetext (control-variant)"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="h-4 w-4"
              />
              Obligatorisk
            </label>
            <button type="submit" disabled={adding} className="btn-primary">
              <Plus className="h-4 w-4" />
              Lägg till
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <p className="text-sm text-muted">Laddar...</p>
      ) : questions.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-card">
          Inga frågor än.
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              variants={variantsFor(q.id)}
              onRemove={() => removeQuestion(q.id)}
              onToggleActive={() => toggleActive(q)}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  variants,
  onRemove,
  onToggleActive,
  onRefresh,
}: {
  question: Question;
  variants: Variant[];
  onRemove: () => void;
  onToggleActive: () => void;
  onRefresh: () => void;
}) {
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantLabel, setVariantLabel] = useState("");
  const [variantText, setVariantText] = useState("");
  const [variantWeight, setVariantWeight] = useState(50);

  const addVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVariant(true);
    try {
      await fetch(`/api/admin/questions/${question.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: variantLabel,
          text: variantText,
          weight: variantWeight,
          is_control: false,
        }),
      });
      setVariantLabel("");
      setVariantText("");
      setVariantWeight(50);
      onRefresh();
    } finally {
      setAddingVariant(false);
    }
  };

  const removeVariant = async (id: string) => {
    if (!confirm("Ta bort varianten?")) return;
    await fetch(`/api/admin/variants/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const updateWeight = async (id: string, weight: number) => {
    await fetch(`/api/admin/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight }),
    });
    onRefresh();
  };

  return (
    <article className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <code className="rounded-full bg-bg px-2 py-0.5 text-fg">
              {question.key}
            </code>
            <span>{question.type}</span>
            {question.required && (
              <span className="text-accent">obligatorisk</span>
            )}
            {!question.is_active && <span>· inaktiv</span>}
          </div>
          <h3 className="mt-2 text-lg font-medium text-fg-deep">
            {variants.find((v) => v.is_control)?.text ?? "(saknar control)"}
          </h3>
        </div>
        <div className="flex gap-1">
          <button onClick={onToggleActive} className="btn-ghost">
            {question.is_active ? "Pausa" : "Aktivera"}
          </button>
          <button onClick={onRemove} className="btn-ghost text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-muted" />
          <span className="eyebrow">Varianter ({variants.length})</span>
        </div>
        <div className="space-y-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-full bg-bg px-4 py-2 text-sm"
            >
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                  v.is_control
                    ? "bg-fg text-white"
                    : "bg-surface text-fg shadow-soft",
                )}
              >
                {v.label}
              </span>
              <span className="flex-1 truncate text-fg-deep">{v.text}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-16 rounded-full bg-surface px-3 py-1 text-right text-xs shadow-soft focus:outline-none"
                value={v.weight}
                onChange={(e) => updateWeight(v.id, Number(e.target.value))}
                title="Vikt i procent"
              />
              {!v.is_control && (
                <button
                  onClick={() => removeVariant(v.id)}
                  className="text-muted hover:text-danger"
                  title="Ta bort variant"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={addVariant}
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            required
            className="input sm:w-32"
            placeholder="label"
            value={variantLabel}
            onChange={(e) => setVariantLabel(e.target.value)}
          />
          <input
            required
            className="input flex-1"
            placeholder="Variantens frågetext"
            value={variantText}
            onChange={(e) => setVariantText(e.target.value)}
          />
          <input
            type="number"
            min={0}
            max={100}
            className="input sm:w-20"
            value={variantWeight}
            onChange={(e) => setVariantWeight(Number(e.target.value))}
          />
          <button
            type="submit"
            disabled={addingVariant}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Variant
          </button>
        </form>
      </div>

      {(question.type === "single_choice" || question.type === "multi_choice") && (
        <OptionsEditor question={question} onRefresh={onRefresh} />
      )}
    </article>
  );
}

function OptionsEditor({
  question,
  onRefresh,
}: {
  question: Question;
  onRefresh: () => void;
}) {
  const [options, setOptions] = useState<QOption[]>(question.options ?? []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const allBucketKeys = Array.from(
    new Set(
      options.flatMap((o) => Object.keys(o.scores ?? {})),
    ),
  );

  const updateOption = (i: number, patch: Partial<QOption>) => {
    const next = options.slice();
    next[i] = { ...next[i], ...patch };
    setOptions(next);
    setDirty(true);
  };

  const updateScore = (i: number, bucket: string, value: number) => {
    const next = options.slice();
    const scores = { ...(next[i].scores ?? {}) };
    if (value === 0) delete scores[bucket];
    else scores[bucket] = value;
    next[i] = { ...next[i], scores };
    setOptions(next);
    setDirty(true);
  };

  const addOption = () => {
    const nextLetter = String.fromCharCode(65 + options.length);
    setOptions([...options, { value: nextLetter, label: "", scores: {} }]);
    setDirty(true);
  };

  const removeOption = (i: number) => {
    setOptions(options.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const addBucket = () => {
    const key = prompt("Ny bucket-nyckel (t.ex. green, builder):");
    if (!key) return;
    const next = options.map((o) => ({
      ...o,
      scores: { ...(o.scores ?? {}), [key]: 0 },
    }));
    setOptions(next);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options }),
      });
      if (res.ok) {
        setDirty(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="eyebrow">Alternativ & scoring</span>
          <p className="mt-1 text-xs text-muted">
            Varje alternativ kan ge poäng till en eller flera bucketar.
            Bucketar definierar du på modulen (Resultat-profiler).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={addBucket} className="btn-ghost">
            + Bucket
          </button>
          <button onClick={addOption} className="btn-ghost">
            <Plus className="h-4 w-4" />
            Alternativ
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-bg px-4 py-3 text-sm"
          >
            <input
              className="w-12 rounded-full bg-surface px-3 py-1 text-xs font-medium shadow-soft focus:outline-none"
              value={opt.value}
              onChange={(e) => updateOption(i, { value: e.target.value })}
              placeholder="A"
            />
            <input
              className="min-w-[220px] flex-1 rounded-full bg-surface px-3 py-1 text-xs shadow-soft focus:outline-none"
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              placeholder="Svarstext"
            />
            {allBucketKeys.map((b) => (
              <label
                key={b}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted"
              >
                {b}
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="w-12 rounded-full bg-surface px-2 py-1 text-right text-xs shadow-soft focus:outline-none"
                  value={opt.scores?.[b] ?? 0}
                  onChange={(e) =>
                    updateScore(i, b, Number(e.target.value))
                  }
                />
              </label>
            ))}
            <button
              onClick={() => removeOption(i)}
              className="text-muted hover:text-danger"
              title="Ta bort alternativ"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-xs text-muted">Inga alternativ än.</p>
        )}
      </div>

      {dirty && (
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Sparar..." : "Spara alternativ"}
        </button>
      )}
    </div>
  );
}
