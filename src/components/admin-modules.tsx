"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { QrDownloadButton } from "@/components/qr-download-button";

type Module = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  target_audience: string | null;
  flow_type: "wizard" | "chat" | "hybrid";
  is_active: boolean;
  created_at: string;
};

export function AdminModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [flow, setFlow] = useState<"wizard" | "chat" | "quiz">("wizard");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/modules");
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteModule = async (id: string, name: string) => {
    if (!confirm(`Ta bort modulen "${name}"? Åtgärden kan inte ångras.`)) return;
    const res = await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Kunde inte ta bort modulen");
    }
  };

  const create = async (e: React.FormEvent) => {    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, flow_type: flow }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kunde inte skapa modul");
        return;
      }
      setSlug("");
      setName("");
      setFlow("wizard");
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          Moduler per målgrupp
        </h1>
        <p className="text-base text-muted">
          Varje modul har egen URL, egen välkomst, egna frågor och egen
          samtyckestext. A/B-testa varianter och mät utfall per målgrupp.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="eyebrow">Ny modul</h2>
        <form onSubmit={create} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Slug (visas i URL)
            </label>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="input"
              placeholder="t.ex. investors"
              pattern="[a-z0-9][a-z0-9-]{2,39}"
              title="3–40 tecken, a–z, 0–9 eller bindestreck"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Namn
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="t.ex. Investerare"
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Flöde
            </label>
            <select
              value={flow}
              onChange={(e) => setFlow(e.target.value as "wizard" | "chat" | "quiz")}
              className="input"
            >
              <option value="wizard">Formulär (wizard)</option>
              <option value="chat">AI-chatt</option>
              <option value="quiz">Quiz med scoring</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="btn-primary sm:w-48"
          >
            <ArrowRight className="h-4 w-4" />
            {creating ? "Skapar..." : "Skapa modul"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-4 eyebrow">Modul</th>
                <th className="px-6 py-4 eyebrow">Slug</th>
                <th className="px-6 py-4 eyebrow">Flöde</th>
                <th className="px-6 py-4 eyebrow">Status</th>
                <th className="px-6 py-4 eyebrow">Skapad</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted">
                    Laddar...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted">
                    Inga moduler än. Skapa en ovan.
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr key={m.id}>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/modules/${m.id}`}
                        className="font-medium text-fg-deep hover:underline"
                      >
                        {m.name}
                      </Link>
                      {m.description && (
                        <div className="text-xs text-muted">{m.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="rounded-full bg-bg px-2 py-0.5 text-xs text-fg">
                        /m/{m.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-muted">{m.flow_type}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          m.is_active
                            ? "bg-accent-soft text-fg-deep"
                            : "bg-bg-deep text-muted",
                        )}
                      >
                        {m.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/modules/${m.id}`}
                          className="btn-ghost"
                          title="Redigera"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/m/${m.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                          title="Öppna publik sida"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <QrDownloadButton
                          url={`${typeof window !== "undefined" ? window.location.origin : ""}/m/${m.slug}`}
                          filename={`qr-${m.slug}.png`}
                          title="Ladda ned QR-kod som PNG"
                        />
                        <button
                          onClick={() => deleteModule(m.id, m.name)}
                          className="btn-ghost text-danger"
                          title="Ta bort"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
