import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (verifyError) {
    return NextResponse.json(
      { error: "verify_failed", detail: verifyError.message },
      { status: 400 },
    );
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return NextResponse.json(
      { error: "password_failed", detail: passwordError.message },
      { status: 400 },
    );
  }

  return response;
}
