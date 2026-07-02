"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { sendMemberPasswordResetAction } from "@/app/actions/members";
import { SubmitButton } from "@/components/submit-button";
import type { Profile } from "@/lib/types";

type PasswordResetButtonProps = {
  member: Profile;
};

export function PasswordResetButton({ member }: PasswordResetButtonProps) {
  const [state, action] = useActionState(sendMemberPasswordResetAction, {});

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
      onSubmit={(event) => {
        if (!window.confirm(`Send a password reset email to ${member.email}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={member.id} />
      <div>
        <p className="text-sm font-semibold text-blue-950">Password recovery</p>
        <p className="mt-1 text-sm text-blue-800">
          Send this member a secure email link to set a new password. The admin will not see the new password.
        </p>
      </div>
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}
      <SubmitButton variant="secondary" pendingLabel="Sending">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Send reset link
      </SubmitButton>
    </form>
  );
}
