"use client";

import { useState } from "react";
import { Palette, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemePreset = {
  id: string;
  name: string;
  description: string;
};

export function ThemeSettings({
  themes,
  initialAdminThemeId,
  initialPublicThemeId,
  onSaved,
}: {
  themes: ThemePreset[];
  initialAdminThemeId: string;
  initialPublicThemeId: string;
  onSaved?: () => void;
}) {
  const [adminThemeId, setAdminThemeId] = useState(initialAdminThemeId);
  const [publicThemeId, setPublicThemeId] = useState(initialPublicThemeId);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/themes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminThemeId, publicThemeId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte spara tema" });
        return;
      }
      setStatus({ kind: "ok", text: "Temainställningar sparade" });
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-6 p-8">
      <div className="space-y-2">
        <h2 className="eyebrow inline-flex items-center gap-2">
          <Palette className="h-4 w-4 text-accent" />
          Tema
        </h2>
        <p className="text-sm text-muted">
          Välj vilket tema som ska användas i adminplattformen respektive startupkompassen.
          Nuvarande design är sparad som movexum-tema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Adminplattform</span>
          <select
            className="input"
            value={adminThemeId}
            onChange={(e) => setAdminThemeId(e.target.value)}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Startupkompassen</span>
          <select
            className="input"
            value={publicThemeId}
            onChange={(e) => setPublicThemeId(e.target.value)}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted">Tillgängliga teman</span>
        <div className="space-y-2">
          {themes.map((theme) => (
            <div key={theme.id} className="rounded-2xl bg-bg px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-fg">
                  {theme.name}
                </span>
                <span className="text-xs text-subtle">{theme.id}</span>
              </div>
              {theme.description ? (
                <p className="mt-1 text-xs text-muted">{theme.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {busy ? "Sparar..." : "Spara tema"}
        </button>
        {status ? (
          <p
            className={cn(
              "text-sm",
              status.kind === "ok" ? "text-fg" : "text-danger",
            )}
          >
            {status.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
