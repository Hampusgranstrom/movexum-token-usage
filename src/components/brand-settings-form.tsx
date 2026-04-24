"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PartnerLogo = {
  id: string;
  name: string;
  logo_path: string | null;
  logo_url: string;
  website_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export function BrandSettingsForm({
  initialLogoUrl,
}: {
  initialLogoUrl: string | null;
}) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [partners, setPartners] = useState<PartnerLogo[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersBusy, setPartnersBusy] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerWebsite, setPartnerWebsite] = useState("");
  const [partnerLogoUrl, setPartnerLogoUrl] = useState("");
  const [partnerFile, setPartnerFile] = useState<File | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/brand", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Uppladdning misslyckades" });
        return;
      }
      setLogoUrl(data.url);
      setStatus({ kind: "ok", text: "Logotypen uppdaterad" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Ta bort logotyp?")) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/brand", { method: "DELETE" });
      if (res.ok) {
        setLogoUrl(null);
        setStatus({ kind: "ok", text: "Logotyp borttagen" });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({ kind: "err", text: data.error ?? "Borttagning misslyckades" });
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const loadPartners = async () => {
      setPartnersLoading(true);
      try {
        const res = await fetch("/api/admin/partners");
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setPartners(data.partners ?? []);
        }
      } finally {
        setPartnersLoading(false);
      }
    };

    loadPartners();
  }, []);

  const addPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnersBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("name", partnerName);
      if (partnerWebsite.trim()) form.append("website_url", partnerWebsite.trim());
      if (partnerLogoUrl.trim()) form.append("logo_url", partnerLogoUrl.trim());
      if (partnerFile) form.append("file", partnerFile);

      const res = await fetch("/api/admin/partners", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte lägga till partner" });
        return;
      }

      setPartners((prev) => [...prev, data.partner]);
      setPartnerName("");
      setPartnerWebsite("");
      setPartnerLogoUrl("");
      setPartnerFile(null);
      setStatus({ kind: "ok", text: "Partner tillagd" });
      router.refresh();
    } finally {
      setPartnersBusy(false);
    }
  };

  const savePartners = async (next: PartnerLogo[]) => {
    setPartnersBusy(true);
    setStatus(null);
    try {
      const payload = {
        partners: next.map((p, idx) => ({
          ...p,
          sort_order: idx,
        })),
      };
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte spara partnerloggor" });
        return;
      }
      setPartners(data.partners ?? next);
      setStatus({ kind: "ok", text: "Partnerloggor sparade" });
      router.refresh();
    } finally {
      setPartnersBusy(false);
    }
  };

  const deletePartner = async (id: string) => {
    if (!confirm("Ta bort partnerlogga?")) return;
    setPartnersBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte ta bort partner" });
        return;
      }
      setPartners((prev) => prev.filter((p) => p.id !== id));
      setStatus({ kind: "ok", text: "Partner borttagen" });
      router.refresh();
    } finally {
      setPartnersBusy(false);
    }
  };

  const movePartner = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= partners.length) return;
    const next = partners.slice();
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setPartners(next.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  const updatePartner = (id: string, patch: Partial<PartnerLogo>) => {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          Ert varumärke
        </h1>
        <p className="text-base text-muted">
          Ladda upp logotyp och hantera partnerloggor i karusellen.
        </p>
      </header>

      <section className="card p-8">
        <h2 className="eyebrow">Logotyp</h2>

        <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 flex-none items-center justify-center rounded-3xl bg-bg shadow-soft">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logotyp"
                className="max-h-20 max-w-20 object-contain"
              />
            ) : (
              <span className="text-xs text-muted">Ingen</span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <label
              className={cn(
                "btn-primary inline-flex cursor-pointer items-center justify-center gap-2",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="h-4 w-4" />
              <span>Ladda upp ny logotyp</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </label>

            {logoUrl && (
              <button
                onClick={remove}
                disabled={busy}
                className="btn-ghost inline-flex items-center gap-2 self-start text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Ta bort logotyp
              </button>
            )}

            <p className="text-xs text-muted">
              PNG, JPG, SVG eller WebP. Max 1.5 MB. Kvadratisk eller liggande
              fungerar bäst.
            </p>
          </div>
        </div>

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

      <section className="card space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="eyebrow">Partnerloggor i karusell</h2>
            <p className="mt-1 text-sm text-muted">
              Lägg till, redigera, sortera och ta bort loggor. Visningen i karusellen
              hålls enhetlig automatiskt med fast storlek och proportioner.
            </p>
          </div>
          <button
            onClick={() => savePartners(partners)}
            disabled={partnersBusy || partnersLoading}
            className="btn-secondary"
          >
            <Save className="h-4 w-4" />
            Spara ordning och ändringar
          </button>
        </div>

        <form onSubmit={addPartner} className="rounded-2xl bg-bg p-4 sm:p-5">
          <h3 className="text-sm font-medium text-fg-deep">Lägg till partner</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              className="input"
              placeholder="Namn, t.ex. Gävle kommun"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Webbplats (valfritt)"
              value={partnerWebsite}
              onChange={(e) => setPartnerWebsite(e.target.value)}
            />
            <input
              className="input"
              placeholder="Extern logo-URL (valfritt)"
              value={partnerLogoUrl}
              onChange={(e) => setPartnerLogoUrl(e.target.value)}
            />
            <label className="input inline-flex cursor-pointer items-center justify-center">
              <Upload className="mr-2 h-4 w-4" />
              <span className="truncate text-sm">
                {partnerFile ? partnerFile.name : "Ladda upp logofil"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => setPartnerFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="mt-3">
            <button type="submit" disabled={partnersBusy} className="btn-primary">
              <Plus className="h-4 w-4" />
              Lägg till logga
            </button>
          </div>
        </form>

        {partnersLoading ? (
          <p className="text-sm text-muted">Laddar partnerloggor...</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-muted">Inga partnerloggor tillagda ännu.</p>
        ) : (
          <div className="space-y-3">
            {partners.map((p, idx) => (
              <div key={p.id} className="rounded-2xl bg-bg p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-40 items-center justify-center rounded-xl bg-white px-2 shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="h-7 w-auto max-w-[130px] object-contain"
                    />
                  </div>

                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <input
                      className="input"
                      value={p.name}
                      onChange={(e) => updatePartner(p.id, { name: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Webbplats (valfritt)"
                      value={p.website_url ?? ""}
                      onChange={(e) =>
                        updatePartner(p.id, { website_url: e.target.value || null })
                      }
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-fg">
                    <input
                      type="checkbox"
                      checked={p.is_active}
                      onChange={(e) => updatePartner(p.id, { is_active: e.target.checked })}
                    />
                    Aktiv
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => movePartner(idx, -1)}
                      className="btn-ghost"
                      title="Flytta upp"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePartner(idx, 1)}
                      className="btn-ghost"
                      title="Flytta ned"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePartner(p.id)}
                      className="btn-ghost text-danger"
                      title="Ta bort"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
