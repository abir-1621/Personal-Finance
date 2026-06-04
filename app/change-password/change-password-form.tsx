"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      <label className="block space-y-2">
        <span className="form-label">New password</span>
        <input className="form-input" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label className="block space-y-2">
        <span className="form-label">Confirm password</span>
        <input
          className="form-input"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      <SubmitButton className="w-full" pendingLabel="Updating">
        Change password
      </SubmitButton>
    </form>
  );
}
