import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/reset-password";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(requestUrl.searchParams.get("next")) ?? DEFAULT_NEXT;
  const authError = requestUrl.searchParams.get("error_code") ?? requestUrl.searchParams.get("error");

  if (authError) {
    return loginErrorRedirect(requestUrl, authError);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    return loginErrorRedirect(requestUrl, authErrorCode(error.message));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    return loginErrorRedirect(requestUrl, authErrorCode(error.message));
  }

  if (next === DEFAULT_NEXT) {
    return hashRecoveryRedirect(next);
  }

  return loginErrorRedirect(requestUrl, "reset-link");
}

function sanitizeNextPath(value: string | null) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function loginErrorRedirect(requestUrl: URL, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin));
}

function authErrorCode(message: string) {
  return message.toLowerCase().includes("expired") ? "otp_expired" : "reset-link";
}

function hashRecoveryRedirect(next: string) {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Preparing password reset</title>
  </head>
  <body>
    <script>
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const error = params.get("error_code") || params.get("error");

      if (error) {
        window.location.replace("/login?error=" + encodeURIComponent(error));
      } else if (params.get("access_token") && params.get("refresh_token")) {
        window.location.replace(${JSON.stringify(next)} + hash);
      } else {
        window.location.replace("/login?error=reset-link");
      }
    </script>
    <noscript>
      JavaScript is required to finish password recovery.
    </noscript>
  </body>
</html>`;

  return new NextResponse(body, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8"
    }
  });
}
