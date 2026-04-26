"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LogIn } from "lucide-react";
import { Halftone } from "@/components/halftone";

export function LoginForm({
  productName,
  logoUrl,
}: {
  productName: string;
  logoUrl: string | null;
}) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const initialError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "not_invited"
      ? "Ditt konto är inte registrerat i systemet. Be superadmin bjuda in dig."
      : null,
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Felaktiga inloggningsuppgifter"
            : authError.message,
        );
        return;
      }

      window.location.href = redirect;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/90 bg-surface/90 p-7 shadow-card backdrop-blur sm:p-8">
      <div className="space-y-4 text-center">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-fg-deep/75">
          <LogIn className="h-3.5 w-3.5 text-accent" />
          Admininloggning
        </span>

        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={productName}
            width="180"
            height="40"
            decoding="async"
            fetchPriority="high"
            className="mx-auto h-10 w-auto max-w-[190px] object-contain"
          />
        ) : (
          <span className="inline-flex items-center justify-center gap-3">
            <Halftone size={44} color="var(--color-fg-deep)" bg="transparent" />
            <span className="text-2xl font-semibold tracking-tight text-fg-deep">
              {productName}
            </span>
          </span>
        )}
        <p className="text-sm text-muted">Logga in för att fortsätta till adminplattformen.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
            E-post
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-bg/60 px-4 py-3 text-sm text-fg shadow-none outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="namn@movexum.se"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Lösenord
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-bg/60 px-4 py-3 pr-11 text-sm text-fg shadow-none outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
              placeholder="Lösenord"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 inline-flex items-center rounded-md px-2 text-muted transition hover:text-fg-deep"
              aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary w-full text-[15px]">
          <ArrowRight className="h-4 w-4" />
          {loading ? "Loggar in..." : "Logga in"}
        </button>

        <p className="text-center text-xs text-muted">
          Problem att logga in? Kontakta superadmin för ny inbjudan.
        </p>
      </form>
    </div>
  );
}
