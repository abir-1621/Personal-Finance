import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const authError = requestUrl.searchParams.get("error_code") ?? requestUrl.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(authError)}`, requestUrl.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  if (next === "/reset-password") {
    return hashRecoveryRedirect(next);
  }

  return NextResponse.redirect(new URL("/login?error=reset-link", requestUrl.origin));
}

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
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
