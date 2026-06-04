"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createDepositAction, updateDepositAction } from "@/app/actions/deposits";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency } from "@/lib/format";
import { dateToday, monthNow } from "@/lib/utils";
import type { Deposit, DepositStatus, Profile, Setting } from "@/lib/types";

type DepositFormProps = {
  mode: "create" | "edit";
  currentProfile: Profile;
  members: Profile[];
  settings: Setting;
  deposit?: Deposit;
  returnTo?: string;
};

export function DepositForm({ mode, currentProfile, members, settings, deposit, returnTo }: DepositFormProps) {
  const actionToUse = mode === "create" ? createDepositAction : updateDepositAction;
  const [state, action] = useActionState(actionToUse, {});
  const initialMemberId = deposit?.member_id ?? currentProfile.id;
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId);
  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? members[0],
    [members, selectedMemberId]
  );
  const keepStoredSnapshot = mode === "edit" && deposit?.member_id === selectedMember?.id;
  const shareCount = keepStoredSnapshot ? (deposit?.share_count_snapshot ?? 0) : (selectedMember?.assigned_shares ?? 0);
  const sharePrice = keepStoredSnapshot ? (deposit?.share_price_snapshot ?? settings.share_price) : settings.share_price;
  const amount = shareCount * sharePrice;

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" && deposit ? <input type="hidden" name="id" value={deposit.id} /> : null}
      <input type="hidden" name="return_to" value={returnTo ?? (mode === "edit" ? "/admin/deposits" : "/deposits/history")} />
      {currentProfile.role !== "ADMIN" ? <input type="hidden" name="member_id" value={currentProfile.id} /> : null}
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {currentProfile.role === "ADMIN" ? (
        <label className="block space-y-2">
          <span className="form-label">Member</span>
          <select
            className="form-input"
            name="member_id"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Deposit month</span>
          <input
            className="form-input"
            name="deposit_month"
            type="month"
            defaultValue={deposit?.deposit_month ?? monthNow()}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="form-label">Deposit date</span>
          <input
            className="form-input"
            name="deposit_date"
            type="date"
            defaultValue={deposit?.deposit_date ?? dateToday()}
            required
          />
        </label>
      </div>
      {mode === "edit" ? (
        <label className="block space-y-2">
          <span className="form-label">Status</span>
          <select className="form-input" name="status" defaultValue={deposit?.status ?? "PENDING"}>
            {(["PENDING", "APPROVED", "REJECTED"] satisfies DepositStatus[]).map((status) => (
              <option key={status} value={status}>
                {status[0] + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <ReadOnlyMetric label="Assigned shares" value={String(shareCount)} />
        <ReadOnlyMetric label="Share price" value={formatCurrency(sharePrice, settings.currency)} />
        <ReadOnlyMetric label="Calculated amount" value={formatCurrency(amount, settings.currency)} />
      </div>
      <label className="block space-y-2">
        <span className="form-label">Note</span>
        <textarea
          className="form-input min-h-24 resize-y"
          name="note"
          defaultValue={deposit?.note ?? ""}
          maxLength={500}
        />
      </label>
      <SubmitButton pendingLabel={mode === "create" ? "Submitting" : "Updating"}>
        {mode === "create" ? "Submit deposit" : "Update deposit"}
      </SubmitButton>
    </form>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
