"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ListChecks, Trash2, ExternalLink, Plus, X } from "lucide-react";
import type { Module, ResultBucket } from "@/lib/modules";

export function ModuleEditor({ module: initial }: { module: Module }) {
  const router = useRouter();
  const [mod, setMod] = useState<Module>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const patch = <K extends keyof Module>(key: K, value: Module[K]) =>
    setMod({ ...mod, [key]: value });

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/modules/${mod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mod.name,
          description: mod.description,
          target_audience: mod.target_audience,
          flow_type: mod.flow_type,
          welcome_title: mod.welcome_title,
          welcome_body: mod.welcome_body,
          system_prompt: mod.system_prompt,
          consent_text: mod.consent_text,
          accent_color: mod.accent_color,
          hero_eyebrow: mod.hero_eyebrow,
          lead_source_id: mod.lead_source_id,
          is_active: mod.is_active,
          require_email: mod.require_email,
          require_phone: mod.require_phone,
          result_buckets: mod.result_buckets,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte spara" });
        return;
      }
      setMod(data.module);
      setStatus({ kind: "ok", text: "Sparat" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Ta bort modulen "${mod.name}"? Åtgärden kan inte ångras.`)) return;
    const res = await fetch(`/api/admin/modules/${mod.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/modules");
    else setStatus({ kind: "err", text: "Kunde inte ta bort" });
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Modul</span>
          <h1 className="mt-2 text-4xl">{mod.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <code className="rounded-full bg-bg px-2 py-0.5 text-fg">
              /m/{mod.slug}
            </code>
            <Link
              href={`/m/${mod.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              Öppna <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/modules/${mod.id}/questions`}
            className="btn-secondary"
          >
            <ListChecks className="h-4 w-4" />
            Frågor
          </Link>
          <Link
            href={`/admin/modules/${mod.id}/stats`}
            className="btn-secondary"
          >
            <BarChart3 className="h-4 w-4" />
            Statistik
          </Link>
        </div>
      </header>

      <section className="card space-y-5 p-6">
        <h2 className="eyebrow">Grundinformation</h2>
        <Field label="Namn">
          <input
            className="input"
            value={mod.name}
            onChange={(e) => patch("name", e.target.value)}
          />
        </Field>
        <Field label="Beskrivning (intern)">
          <textarea
            className="textarea"
            rows={2}
            value={mod.description ?? ""}
            onChange={(e) => patch("description", e.target.value)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Målgrupp">
            <input
              className="input"
              value={mod.target_audience ?? ""}
              onChange={(e) => patch("target_audience", e.target.value)}
              placeholder="founders, investors, partners..."
            />
          </Field>
          <Field label="Flöde">
            <select
              className="input"
              value={mod.flow_type}
              onChange={(e) =>
                patch("flow_type", e.target.value as Module["flow_type"])
              }
            >
              <option value="wizard">Formulär (wizard)</option>
              <option value="chat">AI-chatt</option>
              <option value="quiz">Quiz med scoring och resultat</option>
              <option value="hybrid" disabled>
                Hybrid (kommer)
              </option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="eyebrow">Välkomst</h2>
        <Field label="Eyebrow (liten text ovanför rubriken)">
          <input
            className="input"
            value={mod.hero_eyebrow ?? ""}
            onChange={(e) => patch("hero_eyebrow", e.target.value)}
          />
        </Field>
        <Field label="Rubrik">
          <input
            className="input"
            value={mod.welcome_title ?? ""}
            onChange={(e) => patch("welcome_title", e.target.value)}
          />
        </Field>
        <Field label="Ingress">
          <textarea
            className="textarea"
            rows={3}
            value={mod.welcome_body ?? ""}
            onChange={(e) => patch("welcome_body", e.target.value)}
          />
        </Field>
      </section>

      {mod.flow_type === "chat" && (
        <section className="card space-y-5 p-6">
          <h2 className="eyebrow">System-prompt (AI)</h2>
          <p className="text-sm text-muted">
            Styr hur assistenten agerar. Visas aldrig publikt.
          </p>
          <textarea
            className="textarea font-mono text-xs"
            rows={10}
            value={mod.system_prompt ?? ""}
            onChange={(e) => patch("system_prompt", e.target.value)}
          />
        </section>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="eyebrow">Samtycke (GDPR)</h2>
        <p className="text-sm text-muted">
          Visas innan frågor/chatt. Om du ändrar texten bumpas consent_version
          automatiskt — tidigare samtycken räknas som ogiltiga.
        </p>
        <textarea
          className="textarea"
          rows={5}
          value={mod.consent_text}
          onChange={(e) => patch("consent_text", e.target.value)}
        />
        <p className="text-xs text-muted">
          Version: {mod.consent_version}
        </p>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="eyebrow">Tema & styrning</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Accent-färg (hex, valfritt)">
            <input
              className="input"
              value={mod.accent_color ?? ""}
              onChange={(e) => patch("accent_color", e.target.value || null)}
              placeholder="#38B4E3"
            />
          </Field>
          <Field label="Lead-källa">
            <input
              className="input"
              value={mod.lead_source_id ?? ""}
              onChange={(e) => patch("lead_source_id", e.target.value || null)}
              placeholder="ai-chat, event, web..."
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Toggle
            label="Aktiv"
            checked={mod.is_active}
            onChange={(v) => patch("is_active", v)}
          />
          <Toggle
            label="E-post obligatoriskt"
            checked={mod.require_email}
            onChange={(v) => patch("require_email", v)}
          />
          <Toggle
            label="Telefon obligatoriskt"
            checked={mod.require_phone}
            onChange={(v) => patch("require_phone", v)}
          />
        </div>
      </section>

      {mod.flow_type === "quiz" && (
        <ResultBucketsEditor
          buckets={mod.result_buckets ?? []}
          onChange={(next) => patch("result_buckets", next)}
        />
      )}

      <div className="flex items-center justify-between">
        <button onClick={remove} className="btn-ghost text-danger">
          <Trash2 className="h-4 w-4" />
          Ta bort modul
        </button>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={
                status.kind === "ok" ? "text-sm text-fg" : "text-sm text-danger"
              }
            >
              {status.text}
            </span>
          )}
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function ResultBucketsEditor({
  buckets,
  onChange,
}: {
  buckets: ResultBucket[];
  onChange: (next: ResultBucket[]) => void;
}) {
  const updateBucket = (i: number, patch: Partial<ResultBucket>) => {
    const next = buckets.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const removeBucket = (i: number) => {
    onChange(buckets.filter((_, idx) => idx !== i));
  };
  const addBucket = () => {
    onChange([
      ...buckets,
      {
        key: "ny_bucket",
        title: "Ny profil",
        description: "",
        tips: [],
        cta_label: "",
        cta_url: "",
      },
    ]);
  };

  return (
    <section className="card space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="eyebrow">Resultat-profiler</h2>
          <p className="mt-1 text-sm text-muted">
            Användarens svar räknas till buckets; den med högst poäng vinner
            och dess profil visas. Nyckeln används i alternativens scoring.
          </p>
        </div>
        <button onClick={addBucket} className="btn-ghost">
          <Plus className="h-4 w-4" />
          Profil
        </button>
      </div>

      {buckets.length === 0 && (
        <p className="text-sm text-muted">Inga profiler än.</p>
      )}

      <div className="space-y-6">
        {buckets.map((b, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-bg p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 gap-3">
                <input
                  className="w-32 rounded-full bg-surface px-3 py-1.5 text-xs font-medium shadow-soft focus:outline-none"
                  placeholder="Nyckel"
                  value={b.key}
                  onChange={(e) => updateBucket(i, { key: e.target.value })}
                />
                <input
                  className="flex-1 rounded-full bg-surface px-3 py-1.5 text-sm shadow-soft focus:outline-none"
                  placeholder="Titel"
                  value={b.title}
                  onChange={(e) => updateBucket(i, { title: e.target.value })}
                />
              </div>
              <button
                onClick={() => removeBucket(i)}
                className="text-muted hover:text-danger"
                title="Ta bort profil"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              className="textarea text-sm"
              rows={2}
              placeholder="Beskrivning"
              value={b.description}
              onChange={(e) => updateBucket(i, { description: e.target.value })}
            />
            <TipsEditor
              tips={b.tips ?? []}
              onChange={(tips) => updateBucket(i, { tips })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input"
                placeholder="CTA-etikett"
                value={b.cta_label}
                onChange={(e) => updateBucket(i, { cta_label: e.target.value })}
              />
              <input
                className="input"
                placeholder="CTA-länk (/m/... eller https://...)"
                value={b.cta_url}
                onChange={(e) => updateBucket(i, { cta_url: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TipsEditor({
  tips,
  onChange,
}: {
  tips: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div>
      <span className="eyebrow">Tips</span>
      <ul className="mt-2 space-y-1">
        {tips.map((t, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
            <span className="flex-1">{t}</span>
            <button
              onClick={() => onChange(tips.filter((_, idx) => idx !== i))}
              className="text-muted hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Lägg till tips..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...tips, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onChange([...tips, draft.trim()]);
              setDraft("");
            }
          }}
          className="btn-ghost"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}
