"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/actions/settings";
import { SubmitButton } from "@/components/submit-button";
import type { Setting } from "@/lib/types";

type SettingsFormProps = {
  settings: Setting;
};

export function SettingsForm({ settings }: SettingsFormProps) {
  const [state, action] = useActionState(updateSettingsAction, {});

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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Share price</span>
          <input
            className="form-input"
            name="share_price"
            type="number"
            min="1"
            step="0.01"
            defaultValue={settings.share_price}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="form-label">Currency</span>
          <input className="form-input uppercase" name="currency" maxLength={3} defaultValue={settings.currency} required />
        </label>
      </div>
      <SubmitButton pendingLabel="Saving">Save settings</SubmitButton>
    </form>
  );
}
