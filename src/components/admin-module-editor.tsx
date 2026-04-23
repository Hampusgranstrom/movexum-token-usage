"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ListChecks, Trash2, ExternalLink } from "lucide-react";
import type { Module } from "@/lib/modules";

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
