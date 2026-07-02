"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChangePasswordForm } from "@/app/change-password/change-password-form";
import { createClient } from "@/lib/supabase/browser";

type ResetStatus = "checking" | "ready" | "error";

type ResetPasswordClientProps = {
  canReset: boolean;
};

export function ResetPasswordClient({ canReset }: ResetPasswordClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ResetStatus>(canReset ? "ready" : "checking");
  const [message, setMessage] = useState("Preparing your password reset form.");

  useEffect(() => {
    let ignore = false;

    async function recoverSession() {
      if (canReset) {
        setStatus("ready");
        return;
      }

      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const linkError = params.get("error_code") ?? params.get("error");

      if (linkError) {
        setMessage(resetLinkErrorMessage(linkError));
        setStatus("error");
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (!accessToken || !refreshToken || (type && type !== "recovery")) {
        setMessage("Open the newest password reset email, or request a fresh reset link.");
        setStatus("error");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (ignore) {
        return;
      }

      if (error) {
        setMessage("That password reset link could not be verified. Request a fresh reset link and use the newest email.");
        setStatus("error");
        return;
      }

      window.history.replaceState(null, "", "/reset-password");
      setStatus("ready");
      router.refresh();
    }

    void recoverSession();

    return () => {
      ignore = true;
    };
  }, [canReset, router]);

  if (status === "checking") {
    return (
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
        Preparing your password reset form.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-medium text-teal-700 hover:text-teal-800" href="/forgot-password">
            Request new reset link
          </Link>
          <Link className="font-medium text-slate-500 hover:text-slate-700" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return <ChangePasswordForm />;
}

function resetLinkErrorMessage(error: string) {
  return error === "otp_expired" || error === "access_denied"
    ? "That password reset link is invalid or has expired. Request a fresh reset link and use the newest email."
    : "The password reset link could not be used. Request a fresh reset link and use the newest email.";
}
