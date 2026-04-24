"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { DataFilters } from "./data-filters";
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
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [declinedMonths, setDeclinedMonths] = useState(12);
  const [inactiveMonths, setInactiveMonths] = useState(24);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("alla");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, retentionRes] = await Promise.all([
        fetch("/api/admin/security-events?limit=200"),
        fetch("/api/admin/retention"),
      ]);

      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setEvents(d.events ?? []);
      }

      if (retentionRes.ok) {
        const d = await retentionRes.json();
        setDeclinedMonths(d.config?.declinedMonths ?? 12);
        setInactiveMonths(d.config?.inactiveMonths ?? 24);
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

  const savePolicy = async () => {
    setSavingPolicy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/retention", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declinedMonths, inactiveMonths }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`Fel: ${data.error ?? "okänt"}`);
        return;
      }
      setMsg("Retention-policy uppdaterad");
    } finally {
      setSavingPolicy(false);
    }
  };

  const eventTypeOptions = useMemo(() => {
    const types = Array.from(new Set(events.map((event) => event.event_type))).sort();
    return [{ value: "alla", label: "Alla" }, ...types.map((type) => ({ value: type, label: type }))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      const typeOk = eventTypeFilter === "alla" ? true : event.event_type === eventTypeFilter;
      const searchOk =
        q.length === 0
          ? true
          : [
              event.actor_email ?? "",
              event.event_type,
              event.target_id ?? "",
              JSON.stringify(event.metadata ?? {}),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q);
      return typeOk && searchOk;
    });
  }, [events, search, eventTypeFilter]);

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          Säkerhet och granskning
        </h1>
        <p className="text-base text-muted">
          Alla admin-åtgärder loggas här. Kör också retention-jobbet manuellt
          vid behov — produktionsmiljön kan schemalägga detta automatiskt.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="eyebrow">Retention</h2>
        <p className="mt-3 text-sm text-muted">
          Ställ in anonymiseringspolicy och kör retention manuellt vid behov. För autonom körning kan en scheduler anropa samma endpoint med x-retention-token (RETENTION_CRON_SECRET).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Declined anonymiseras efter (mån)
            </span>
            <input
              type="number"
              min={1}
              max={120}
              className="input"
              value={declinedMonths}
              onChange={(e) => setDeclinedMonths(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Övriga anonymiseras efter (mån)
            </span>
            <input
              type="number"
              min={1}
              max={120}
              className="input"
              value={inactiveMonths}
              onChange={(e) => setInactiveMonths(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={savePolicy} disabled={savingPolicy} className="btn-secondary">
            {savingPolicy ? "Sparar..." : "Spara policy"}
          </button>
          <button onClick={runRetention} disabled={running} className="btn-primary">
            <Play className="h-4 w-4" />
            {running ? "Kör..." : "Kör retention nu"}
          </button>
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </section>

      <DataFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrera aktör, händelse, mål eller metadata..."
        selects={[
          {
            key: "eventType",
            label: "Händelsetyp",
            value: eventTypeFilter,
            onChange: setEventTypeFilter,
            options: eventTypeOptions,
          },
        ]}
        onClear={() => {
          setSearch("");
          setEventTypeFilter("alla");
        }}
      />

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
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Inga händelser loggade än.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
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
