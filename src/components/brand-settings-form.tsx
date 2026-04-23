"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Varumärke</h1>
        <p className="text-sm text-muted">
          Ladda upp en logotyp som visas i navigeringen och vid inloggning.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          Logotyp
        </h2>

        <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl bg-bg shadow-soft">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logotyp"
                className="max-h-16 max-w-16 object-contain"
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
    </div>
  );
}
