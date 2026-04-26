"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Halftone } from "@/components/halftone";

export function AcceptInviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "missing">(
    "checking",
  );
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowser();

      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // Surface explicit errors from Supabase verify endpoint (expired/invalid OTP, etc).
      // These can come back in either the query or the fragment depending on flow.
      const hashError = hash.get("error_description") ?? hash.get("error");
      const queryError = query.get("error_description") ?? query.get("error");
      if (hashError || queryError) {
        setStatus("missing");
        return;
      }

      // PKCE flow (default for @supabase/ssr): verify endpoint redirects with ?code=...
      const code = query.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } else {
        // Implicit flow fallback: tokens arrive in the URL fragment.
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }

      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setEmail(data.user.email);
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    };
    const t = setTimeout(check, 150);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setLoading(true);
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-muted">
        Verifierar inbjudan...
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/90 bg-surface/90 p-8 shadow-card text-center space-y-4">
        <h1 className="text-2xl font-medium tracking-tight text-fg-deep">Inbjudan saknas</h1>
        <p className="text-sm text-muted">
          Länken ser ut att ha gått ut eller öppnats i fel webbläsare. Be din
          superadmin skicka en ny inbjudan.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 space-y-4 text-center">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-fg-deep/75">
          <Halftone size={14} color="var(--color-fg-deep)" bg="transparent" aria-hidden />
          Startupkompassen
        </span>
        <h1 className="text-4xl font-medium leading-tight tracking-tight text-fg-deep sm:text-5xl">
          Välkommen
        </h1>
        <p className="text-sm text-muted">
          Sätt ett lösenord för{" "}
          <span className="font-medium text-fg">{email}</span>.
        </p>
      </div>

      <div className="rounded-[2rem] border border-border/90 bg-surface/90 p-7 shadow-card backdrop-blur sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Nytt lösenord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              minLength={8}
              className="w-full rounded-xl border border-border bg-bg/60 px-4 py-3 text-sm text-fg shadow-none outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
              placeholder="Minst 8 tecken"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Bekräfta lösenord
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-border bg-bg/60 px-4 py-3 text-sm text-fg shadow-none outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
              placeholder="Upprepa lösenordet"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-[15px]">
            <ArrowRight className="h-4 w-4" />
            {loading ? "Sparar..." : "Skapa konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
