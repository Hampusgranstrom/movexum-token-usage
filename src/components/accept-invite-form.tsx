"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Halftone } from "@/components/halftone";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email"
  | "email_change";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
];

function isEmailOtpType(value: string): value is EmailOtpType {
  return VALID_OTP_TYPES.includes(value as EmailOtpType);
}

type Mode =
  | { kind: "checking" }
  | { kind: "token"; tokenHash: string; type: EmailOtpType }
  | { kind: "session"; email: string }
  | { kind: "missing"; hint?: string };

export function AcceptInviteForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const hashError = hash.get("error_description") ?? hash.get("error");
      const queryError = query.get("error_description") ?? query.get("error");
      if (hashError || queryError) {
        setMode({
          kind: "missing",
          hint: "Inbjudningslänken kunde inte verifieras. Den kan vara förbrukad eller ha gått ut.",
        });
        return;
      }

      // Primary path: token_hash + type in the query string. The token is NOT
      // verified now — we only show the password form. Verification happens
      // when the user submits the form. This makes the flow immune to
      // corporate email link scanners that pre-fetch URLs.
      const tokenHash = query.get("token_hash");
      const otpType = query.get("type");
      if (tokenHash && otpType && isEmailOtpType(otpType)) {
        setMode({ kind: "token", tokenHash, type: otpType });
        return;
      }

      // Backwards-compat: links generated before this fix or via Supabase's
      // {{ .ConfirmationURL }} default may arrive with access_token in the
      // hash (implicit flow) or a PKCE code. Handle them client-side as a
      // fallback so older invite links don't dead-end.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      if (accessToken && refreshToken) {
        const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
        const supabase = getSupabaseBrowser();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", window.location.pathname);
        if (sessionError) {
          setMode({
            kind: "missing",
            hint: "Inbjudningslänken kunde inte verifieras. Den kan vara förbrukad eller ha gått ut.",
          });
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          setMode({ kind: "session", email: data.user.email });
          return;
        }
      }

      if (code) {
        const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
        const supabase = getSupabaseBrowser();
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", window.location.pathname);
        if (exchangeError) {
          setMode({
            kind: "missing",
            hint: "Inbjudningslänken kunde inte verifieras. Den kan vara förbrukad eller ha gått ut.",
          });
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          setMode({ kind: "session", email: data.user.email });
          return;
        }
      }

      // Last resort: maybe the user already has a session (e.g. logged in in
      // another tab). If so, let them set/replace their password.
      const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setMode({ kind: "session", email: data.user.email });
        return;
      }

      setMode({ kind: "missing" });
    };

    void init();
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
      if (mode.kind === "token") {
        const res = await fetch("/api/auth/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token_hash: mode.tokenHash,
            type: mode.type,
            password,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        if (!res.ok) {
          if (data.error === "verify_failed") {
            setError(
              "Inbjudningslänken kunde inte verifieras. Be din superadmin skicka en ny.",
            );
          } else if (data.error === "weak_password") {
            setError("Lösenordet måste vara minst 8 tecken.");
          } else {
            setError(
              data.detail ?? "Något gick fel när lösenordet skulle sparas.",
            );
          }
          return;
        }
        // Hard navigation so the new session cookie is picked up by the
        // server on the next request.
        window.location.assign("/dashboard");
        return;
      }

      if (mode.kind === "session") {
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
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode.kind === "checking") {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-muted">
        Verifierar inbjudan...
      </div>
    );
  }

  if (mode.kind === "missing") {
    return (
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/90 bg-surface/90 p-8 text-center shadow-card space-y-4">
        <h1 className="text-2xl font-medium tracking-tight text-fg-deep">
          Inbjudan saknas
        </h1>
        <p className="text-sm text-muted">
          Länken ser ut att ha gått ut eller öppnats i fel webbläsare. Be din
          superadmin skicka en ny inbjudan.
        </p>
        {mode.hint && <p className="text-sm text-danger">{mode.hint}</p>}
      </div>
    );
  }

  const headingEmail = mode.kind === "session" ? mode.email : null;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 space-y-4 text-center">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-fg-deep/75">
          <Halftone
            size={14}
            color="var(--color-fg-deep)"
            bg="transparent"
            aria-hidden
          />
          Startupkompassen
        </span>
        <h1 className="text-4xl font-medium leading-tight tracking-tight text-fg-deep sm:text-5xl">
          Välkommen
        </h1>
        <p className="text-sm text-muted">
          {headingEmail ? (
            <>
              Sätt ett lösenord för{" "}
              <span className="font-medium text-fg">{headingEmail}</span>.
            </>
          ) : (
            <>Sätt ett lösenord för ditt nya admin-konto.</>
          )}
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-[15px]"
          >
            <ArrowRight className="h-4 w-4" />
            {loading ? "Sparar..." : "Skapa konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
