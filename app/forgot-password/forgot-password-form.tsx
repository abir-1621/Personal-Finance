"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}
      <label className="block space-y-2">
        <span className="form-label">Email</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input className="form-input pl-9" name="email" type="email" autoComplete="email" required />
        </span>
      </label>
      <SubmitButton className="w-full" pendingLabel="Sending">
        Send reset link
      </SubmitButton>
      <div className="text-center">
        <Link href="/login" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
          Back to login
        </Link>
      </div>
    </form>
  );
}
