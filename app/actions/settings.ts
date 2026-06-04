"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSettings, normalizeSetting } from "@/lib/data";
import { actionError, numberValue, textValue } from "@/lib/form";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const settingsSchema = z.object({
  share_price: z.number().positive("Share price must be greater than zero."),
  currency: z.string().min(3, "Use a 3-letter currency code.").max(3).toUpperCase()
});

export async function updateSettingsAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { profile: actor } = await requireAdmin();
    const values = settingsSchema.parse({
      share_price: numberValue(formData, "share_price"),
      currency: textValue(formData, "currency").toUpperCase()
    });

    const admin = createServiceRoleClient();
    const oldSettings = await getSettings(admin);
    const payload = {
      share_price: values.share_price,
      currency: values.currency,
      updated_by: actor.id,
      updated_at: new Date().toISOString()
    };

    if (oldSettings.id === "fallback") {
      const { data, error } = await admin.from("settings").insert(payload).select().single();

      if (error || !data) {
        return { error: error?.message ?? "Unable to create settings." };
      }

      await writeAuditLog({
        action: "CREATE_SETTINGS",
        tableName: "settings",
        recordId: String(data.id),
        oldValue: null,
        newValue: normalizeSetting(data as Record<string, unknown>),
        performedBy: actor.id
      });
    } else {
      const { data, error } = await admin
        .from("settings")
        .update(payload)
        .eq("id", oldSettings.id)
        .select()
        .single();

      if (error || !data) {
        return { error: error?.message ?? "Unable to update settings." };
      }

      await writeAuditLog({
        action: "UPDATE_SETTINGS",
        tableName: "settings",
        recordId: oldSettings.id,
        oldValue: oldSettings,
        newValue: normalizeSetting(data as Record<string, unknown>),
        performedBy: actor.id
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/deposits/add");
    return { success: "Settings updated. Existing deposit snapshots were not changed." };
  } catch (error) {
    return { error: actionError(error) };
  }
}
