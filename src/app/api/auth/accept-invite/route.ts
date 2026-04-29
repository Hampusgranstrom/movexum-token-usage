import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

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

function isEmailOtpType(value: unknown): value is EmailOtpType {
  return typeof value === "string" && VALID_OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Atomic accept-invite endpoint. Called by /accept-invite when the user
 * submits the password form. Verifies the OTP token and immediately sets the
 * password so a corporate email link scanner — which can pre-fetch GET URLs
 * but doesn't submit forms — can't consume the token before the human does.
 *
 * Body: { token_hash: string, type: "invite" | ..., password: string }
 * On success: session cookies are written and the user can hit /dashboard.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { token_hash?: string; type?: string; password?: string }
    | null;

  const tokenHash = body?.token_hash?.trim();
  const type = body?.type;
  const password = body?.password ?? "";

  if (!tokenHash) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }
  if (!isEmailOtpType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>,
      ) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Try the requested type first. If it fails with the generic "Token has
  // expired or is invalid" wording we also retry with type="email", since
  // newer Supabase auth servers accept "email" as a generic alias for
  // token-hash verification regardless of how the token was originally typed.
  let { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (verifyError && type !== "email") {
    const retry = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (!retry.error) {
      verifyError = null;
    }
  }

  if (verifyError) {
    await logSecurityEvent("invite_accept_failed", {
      metadata: {
        stage: "verify",
        type,
        token_hash_prefix: tokenHash.slice(0, 8),
        error_message: verifyError.message,
        error_status:
          (verifyError as unknown as { status?: number }).status ?? null,
        error_code:
          (verifyError as unknown as { code?: string }).code ?? null,
      },
      headers: request.headers,
    });
    return NextResponse.json(
      { error: "verify_failed", detail: verifyError.message },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    await logSecurityEvent("invite_accept_failed", {
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      metadata: {
        stage: "set_password",
        error_message: passwordError.message,
      },
      headers: request.headers,
    });
    return NextResponse.json(
      { error: "password_failed", detail: passwordError.message },
      { status: 400 },
    );
  }

  await logSecurityEvent("invite_accepted", {
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? null,
    headers: request.headers,
  });

  return response;
}
