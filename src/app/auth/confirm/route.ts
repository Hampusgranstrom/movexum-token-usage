import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

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

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return !!value && VALID_OTP_TYPES.includes(value as EmailOtpType);
}

function safeNextPath(raw: string | null): string {
  if (!raw) return "/accept-invite";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/accept-invite";
  return raw;
}

/**
 * Server-side confirmation handler for Supabase auth links (invite, recovery,
 * magic-link, signup). Verifies the token via the SSR-aware Supabase client so
 * session cookies are written before redirecting the user back into the app.
 *
 * Accepts both formats:
 *   /auth/confirm?token_hash=...&type=invite&next=/accept-invite
 *   /auth/confirm?code=...&next=/accept-invite          (PKCE redirect)
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const successUrl = new URL(next, request.url);
  const failureUrl = new URL(next, request.url);
  failureUrl.searchParams.set("auth_error", "verify_failed");

  if (!url || !anon) {
    return NextResponse.redirect(failureUrl, { status: 303 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(successUrl, { status: 303 });

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

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      const fail = NextResponse.redirect(failureUrl, { status: 303 });
      return fail;
    }
    return response;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fail = NextResponse.redirect(failureUrl, { status: 303 });
      return fail;
    }
    return response;
  }

  const fail = NextResponse.redirect(failureUrl, { status: 303 });
  return fail;
}
