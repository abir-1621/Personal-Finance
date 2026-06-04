"use client";

import { useActionState } from "react";
import { createMemberAction, updateMemberAction } from "@/app/actions/members";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency } from "@/lib/format";
import type { Profile, Setting } from "@/lib/types";

type MemberFormProps = {
  mode: "create" | "edit";
  member?: Profile;
  settings: Setting;
};

export function MemberForm({ mode, member, settings }: MemberFormProps) {
  const actionToUse = mode === "create" ? createMemberAction : updateMemberAction;
  const [state, action] = useActionState(actionToUse, {});
  const assignedShares = member?.assigned_shares ?? 0;
  const expected = assignedShares * settings.share_price;

  return (
    <form action={action} className="space-y-4">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Full name</span>
          <input className="form-input" name="full_name" defaultValue={member?.full_name} required />
        </label>
        <label className="space-y-2">
          <span className="form-label">Email</span>
          <input className="form-input" name="email" type="email" defaultValue={member?.email} required />
        </label>
        {mode === "create" ? (
          <label className="space-y-2">
            <span className="form-label">Initial password</span>
            <input className="form-input" name="initial_password" type="password" required minLength={8} />
          </label>
        ) : null}
        <label className="space-y-2">
          <span className="form-label">Role</span>
          <select className="form-input" name="role" defaultValue={member?.role ?? "MEMBER"}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="form-label">Assigned shares</span>
          <input
            className="form-input"
            name="assigned_shares"
            type="number"
            min={0}
            step={1}
            defaultValue={member?.assigned_shares ?? 0}
            required
          />
        </label>
        {mode === "edit" ? (
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={member?.is_active ?? true}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            Active member
          </label>
        ) : null}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Expected monthly deposit at the current share price:{" "}
        <span className="font-semibold text-slate-950">{formatCurrency(expected, settings.currency)}</span>
      </div>
      <SubmitButton pendingLabel={mode === "create" ? "Creating" : "Updating"}>
        {mode === "create" ? "Create member" : "Update member"}
      </SubmitButton>
    </form>
  );
}
