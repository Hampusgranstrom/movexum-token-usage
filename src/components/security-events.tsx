"use client";

import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type Event = {
  id: string;
  actor_email: string | null;
  event_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_hash: string | null;
  created_at: string;
};

export function SecurityEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security-events?limit=200");
      if (res.ok) {
        const d = await res.json();
        setEvents(d.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runRetention = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/retention", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`Fel: ${data.error ?? "okänt"}`);
        return;
      }
      setMsg(`Anonymiserade ${data.anonymized} leads`);
      await load();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          <span className="text-accent">Säkerhet</span> och granskning
        </h1>
        <p className="text-base text-muted">
          Alla admin-åtgärder loggas här. Kör också retention-jobbet manuellt
          vid behov — produktionsmiljön kan schemalägga detta automatiskt.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="eyebrow">Retention</h2>
        <p className="mt-3 text-sm text-muted">
          Anonymiserar avvisade leads äldre än 12 månader och inaktiva leads
          äldre än 24 månader. Idempotent.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={runRetention} disabled={running} className="btn-primary">
            <Play className="h-4 w-4" />
            {running ? "Kör..." : "Kör retention nu"}
          </button>
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="eyebrow">Senaste händelser</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">När</th>
                <th className="px-6 py-3">Aktör</th>
                <th className="px-6 py-3">Händelse</th>
                <th className="px-6 py-3">Mål</th>
                <th className="px-6 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Laddar...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Inga händelser loggade än.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-3 text-muted">{formatDate(e.created_at)}</td>
                    <td className="px-6 py-3">{e.actor_email ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          destructive(e.event_type)
                            ? "bg-[#FCE4E9] text-danger"
                            : "bg-accent-soft text-fg-deep",
                        )}
                      >
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted">
                      <code className="text-xs">{e.target_id ?? "—"}</code>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted">
                      {e.metadata && Object.keys(e.metadata).length > 0
                        ? JSON.stringify(e.metadata)
                        : "—"}
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

function destructive(event: string) {
  return (
    event === "delete_lead" ||
    event === "delete_user" ||
    event === "module_delete" ||
    event === "not_invited_login"
  );
}
