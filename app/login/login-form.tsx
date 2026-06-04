"use client";

import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      <label className="block space-y-2">
        <span className="form-label">Email</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input className="form-input pl-9" name="email" type="email" autoComplete="email" required />
        </span>
      </label>
      <label className="block space-y-2">
        <span className="form-label">Password</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            className="form-input pl-9"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </span>
      </label>
      <SubmitButton className="w-full" pendingLabel="Signing in">
        Sign in
      </SubmitButton>
    </form>
  );
}
