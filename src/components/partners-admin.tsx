"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Plus,
  Building2,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Partner = {
  id: string;
  name: string;
  url: string | null;
  logoUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

type Status = { kind: "ok" | "err"; text: string } | null;

export function PartnersAdmin() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = useMemo(
    () => partners.filter((p) => p.active).length,
    [partners],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("name", newName.trim());
      if (newUrl.trim()) form.append("url", newUrl.trim());
      if (newFile) form.append("file", newFile);
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte spara" });
        return;
      }
      setStatus({ kind: "ok", text: `${newName} tillagd` });
      setNewName("");
      setNewUrl("");
      setNewFile(null);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const patchJson = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          kind: "err",
          text: data.error ?? "Kunde inte uppdatera",
        });
        return false;
      }
      await load();
      return true;
    } finally {
      setBusyId(null);
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = partners.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= partners.length) return;
    const a = partners[idx];
    const b = partners[swapIdx];
    // Swap sort_order values.
    await Promise.all([
      fetch(`/api/admin/partners/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sortOrder }),
      }),
      fetch(`/api/admin/partners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sortOrder }),
      }),
    ]);
    await load();
  };

  const toggleActive = (p: Partner) => patchJson(p.id, { active: !p.active });

  const remove = async (p: Partner) => {
    if (!confirm(`Ta bort "${p.name}"?`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte ta bort" });
        return;
      }
      setStatus({ kind: "ok", text: `"${p.name}" borttagen` });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          Våra <span className="text-accent">partners</span>
        </h1>
        <p className="text-base text-muted">
          Hantera logotyper för kommuner och medfinansiärer som visas i
          karusellen på hemsidan och vid AI-intaget. Stoltsera med dem som
          bygger Movexum tillsammans med oss.
        </p>
      </header>

      <SalesPitch activeCount={activeCount} totalCount={partners.length} />

      <section className="card p-6 sm:p-8">
        <h2 className="eyebrow">
          <Plus className="mr-1 inline h-3 w-3" />
          Lägg till partner
        </h2>
        <form
          onSubmit={handleCreate}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Namn *
            </label>
            <input
              required
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="T.ex. Gävle kommun"
              maxLength={120}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Länk (valfritt)
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="input"
              placeholder="https://www.gavle.se"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Logotyp
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={cn(
                  "btn-secondary inline-flex cursor-pointer items-center gap-2",
                  creating && "pointer-events-none opacity-60",
                )}
              >
                <Upload className="h-4 w-4" />
                {newFile ? "Byt fil" : "Välj fil"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {newFile && (
                <span className="text-xs text-muted">
                  {newFile.name} ({Math.round(newFile.size / 1024)} kB)
                </span>
              )}
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="btn-primary ml-auto"
              >
                {creating ? "Sparar..." : "Spara partner"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              PNG, JPG, SVG eller WebP. Max 1.5 MB. Du kan lägga till
              logotypen senare.
            </p>
          </div>
        </form>

        {status && (
          <p
            className={cn(
              "mt-4 text-sm",
              status.kind === "ok" ? "text-fg" : "text-danger",
            )}
          >
            {status.text}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Partners ({partners.length})</h2>
          <span className="text-xs text-muted">
            {activeCount} synliga i karusellen
          </span>
        </div>

        {loading ? (
          <div className="card p-10 text-center text-muted">Laddar...</div>
        ) : partners.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {partners.map((p, idx) => (
              <PartnerRow
                key={p.id}
                partner={p}
                busy={busyId === p.id}
                isFirst={idx === 0}
                isLast={idx === partners.length - 1}
                onMoveUp={() => move(p.id, -1)}
                onMoveDown={() => move(p.id, 1)}
                onToggleActive={() => toggleActive(p)}
                onRemove={() => remove(p)}
                onSave={async (name, url, file) => {
                  setBusyId(p.id);
                  try {
                    const form = new FormData();
                    form.append("name", name);
                    form.append("url", url);
                    if (file) form.append("file", file);
                    const res = await fetch(`/api/admin/partners/${p.id}`, {
                      method: "PATCH",
                      body: form,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setStatus({
                        kind: "err",
                        text: data.error ?? "Kunde inte uppdatera",
                      });
                      return false;
                    }
                    await load();
                    return true;
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SalesPitch({
  activeCount,
  totalCount,
}: {
  activeCount: number;
  totalCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-fg-deep p-8 text-white shadow-pop sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,180,227,0.35),transparent_60%)]"
      />
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="max-w-xl space-y-3">
          <span className="eyebrow text-accent-soft">Säljargument</span>
          <h2 className="text-2xl text-white sm:text-3xl">
            Synlig i varje möte med kommande entreprenörer
          </h2>
          <p className="text-sm text-white/75 sm:text-base">
            När en startup söker sig till Movexum möts hen av er logotyp på
            hemsidan och i AI-intaget. Visa att ni är en kommun som
            investerar i näringslivet - och bli ihågkommen av nästa
            generations bolag.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-56">
          <Stat value={activeCount} label="Synliga" />
          <Stat value={totalCount} label="Totalt" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="eyebrow text-accent-soft">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-muted">
        <Building2 className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted">
        Inga partners än. Börja med att lägga till den första kommunen.
      </p>
    </div>
  );
}

function PartnerRow({
  partner,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onRemove,
  onSave,
}: {
  partner: Partner;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  onSave: (name: string, url: string, file: File | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(partner.name);
  const [url, setUrl] = useState(partner.url ?? "");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setName(partner.name);
    setUrl(partner.url ?? "");
    setFile(null);
  }, [partner.id, partner.name, partner.url]);

  const save = async () => {
    const ok = await onSave(name.trim(), url.trim(), file);
    if (ok) setEditing(false);
  };

  return (
    <li
      className={cn(
        "card flex flex-col gap-4 p-4 sm:flex-row sm:items-center",
        !partner.active && "opacity-60",
      )}
    >
      <div className="flex h-20 w-32 flex-none items-center justify-center rounded-xl bg-bg ring-1 ring-border">
        {partner.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="max-h-14 max-w-[80%] object-contain"
          />
        ) : (
          <Building2 className="h-5 w-5 text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Namn"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input"
              placeholder="https://..."
              type="url"
            />
            <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 sm:col-span-2">
              <Upload className="h-4 w-4" />
              {file ? `Ny fil: ${file.name}` : "Byt logotyp"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-medium text-fg-deep">
                {partner.name}
              </h3>
              {!partner.active && (
                <span className="rounded-full bg-bg-deep px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Dold
                </span>
              )}
            </div>
            {partner.url ? (
              <a
                href={partner.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                {shortUrl(partner.url)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="mt-1 text-xs text-subtle">Ingen länk</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={busy || !name.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fg text-white shadow-soft transition hover:bg-fg-deep"
              title="Spara"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(partner.name);
                setUrl(partner.url ?? "");
                setFile(null);
              }}
              disabled={busy}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft"
              title="Avbryt"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onMoveUp}
              disabled={busy || isFirst}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft disabled:opacity-30"
              title="Flytta upp"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={busy || isLast}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft disabled:opacity-30"
              title="Flytta ner"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleActive}
              disabled={busy}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft"
              title={partner.active ? "Dölj från karusell" : "Visa i karusell"}
            >
              {partner.active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="btn-ghost"
            >
              Redigera
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-danger transition hover:bg-[#FCE4E9]"
              title="Ta bort"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
