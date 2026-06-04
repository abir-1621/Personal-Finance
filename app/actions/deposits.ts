"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getDepositById, getSettings, normalizeDeposit, normalizeProfile } from "@/lib/data";
import { actionError, textValue } from "@/lib/form";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionState, DepositStatus, Profile } from "@/lib/types";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Use month format YYYY-MM.");

const createDepositSchema = z.object({
  member_id: z.string().uuid("Choose a member."),
  deposit_month: monthSchema,
  deposit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid deposit date."),
  note: z.string().max(500, "Note is too long.").optional(),
  return_to: z.string().optional()
});

const updateDepositSchema = createDepositSchema.extend({
  id: z.string().uuid("Missing deposit id."),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"])
});

export async function createDepositAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { profile: actor } = await requireUser();
    const values = createDepositSchema.parse({
      member_id: actor.role === "ADMIN" ? textValue(formData, "member_id") : actor.id,
      deposit_month: textValue(formData, "deposit_month"),
      deposit_date: textValue(formData, "deposit_date"),
      note: textValue(formData, "note") || undefined,
      return_to: textValue(formData, "return_to") || undefined
    });

    const admin = createServiceRoleClient();
    const member = await loadMember(admin, values.member_id);

    if (!member.is_active) {
      return { error: "This member is inactive." };
    }

    if (member.assigned_shares <= 0) {
      return { error: "This member needs assigned shares before a deposit can be added." };
    }

    if (actor.role !== "ADMIN" && values.member_id !== actor.id) {
      return { error: "Members can only add their own deposits." };
    }

    const settings = await getSettings(admin);
    const amount = member.assigned_shares * settings.share_price;
    const payload = {
      member_id: member.id,
      deposit_month: values.deposit_month,
      deposit_date: values.deposit_date,
      share_count_snapshot: member.assigned_shares,
      share_price_snapshot: settings.share_price,
      amount,
      status: "PENDING" as DepositStatus,
      note: values.note ?? null,
      created_by: actor.id,
      updated_by: actor.id
    };

    const { data, error } = await admin.from("deposits").insert(payload).select().single();

    if (error || !data) {
      return { error: error?.message ?? "Unable to create deposit." };
    }

    const deposit = normalizeDeposit(data as Record<string, unknown>);

    await writeAuditLog({
      action: "CREATE_DEPOSIT",
      tableName: "deposits",
      recordId: deposit.id,
      newValue: deposit,
      performedBy: actor.id
    });

    revalidatePath("/dashboard");
    revalidatePath("/deposits/history");
    revalidatePath("/admin/deposits");
    revalidatePath("/admin/monthly-report");

    redirect(values.return_to ?? "/deposits/history");
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function updateDepositAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { profile: actor } = await requireAdmin();
    const values = updateDepositSchema.parse({
      id: textValue(formData, "id"),
      member_id: textValue(formData, "member_id"),
      deposit_month: textValue(formData, "deposit_month"),
      deposit_date: textValue(formData, "deposit_date"),
      status: statusValue(formData),
      note: textValue(formData, "note") || undefined,
      return_to: textValue(formData, "return_to") || undefined
    });

    const admin = createServiceRoleClient();
    const oldDeposit = await getDepositById(admin, values.id);

    if (!oldDeposit) {
      return { error: "Deposit not found." };
    }

    const member = await loadMember(admin, values.member_id);
    const settings = await getSettings(admin);
    const memberChanged = values.member_id !== oldDeposit.member_id;
    const shareCountSnapshot = memberChanged ? member.assigned_shares : oldDeposit.share_count_snapshot;
    const sharePriceSnapshot = memberChanged ? settings.share_price : oldDeposit.share_price_snapshot;
    const amount = shareCountSnapshot * sharePriceSnapshot;

    const updatePayload = {
      member_id: member.id,
      deposit_month: values.deposit_month,
      deposit_date: values.deposit_date,
      share_count_snapshot: shareCountSnapshot,
      share_price_snapshot: sharePriceSnapshot,
      amount,
      status: values.status,
      note: values.note ?? null,
      updated_by: actor.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await admin
      .from("deposits")
      .update(updatePayload)
      .eq("id", values.id)
      .select()
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Unable to update deposit." };
    }

    const updatedDeposit = normalizeDeposit(data as Record<string, unknown>);

    await writeAuditLog({
      action: "UPDATE_DEPOSIT",
      tableName: "deposits",
      recordId: values.id,
      oldValue: oldDeposit,
      newValue: updatedDeposit,
      performedBy: actor.id
    });

    revalidatePath("/dashboard");
    revalidatePath("/deposits/history");
    revalidatePath("/admin/deposits");
    revalidatePath("/admin/monthly-report");
    redirect(values.return_to ?? "/admin/deposits");
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function setDepositStatusAction(formData: FormData) {
  try {
    const { profile: actor } = await requireAdmin();
    const id = z.string().uuid().parse(textValue(formData, "id"));
    const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).parse(statusValue(formData));
    const returnTo = textValue(formData, "return_to") || "/admin/deposits";
    const admin = createServiceRoleClient();
    const oldDeposit = await getDepositById(admin, id);

    if (!oldDeposit) {
      redirect(returnTo);
    }

    const { data, error } = await admin
      .from("deposits")
      .update({
        status,
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to update deposit status.");
    }

    const updatedDeposit = normalizeDeposit(data as Record<string, unknown>);

    await writeAuditLog({
      action: status === "APPROVED" ? "APPROVE_DEPOSIT" : status === "REJECTED" ? "REJECT_DEPOSIT" : "MARK_PENDING_DEPOSIT",
      tableName: "deposits",
      recordId: id,
      oldValue: oldDeposit,
      newValue: updatedDeposit,
      performedBy: actor.id
    });

    revalidatePath("/dashboard");
    revalidatePath("/deposits/history");
    revalidatePath("/admin/deposits");
    revalidatePath("/admin/monthly-report");
    redirect(returnTo);
  } catch (error) {
    throw new Error(actionError(error));
  }
}

export async function deleteDepositAction(formData: FormData) {
  try {
    const { profile: actor } = await requireAdmin();
    const id = z.string().uuid().parse(textValue(formData, "id"));
    const returnTo = textValue(formData, "return_to") || "/admin/deposits";
    const admin = createServiceRoleClient();
    const oldDeposit = await getDepositById(admin, id);

    if (!oldDeposit) {
      redirect(returnTo);
    }

    const { error } = await admin.from("deposits").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      action: "DELETE_DEPOSIT",
      tableName: "deposits",
      recordId: id,
      oldValue: oldDeposit,
      performedBy: actor.id
    });

    revalidatePath("/dashboard");
    revalidatePath("/deposits/history");
    revalidatePath("/admin/deposits");
    revalidatePath("/admin/monthly-report");
    redirect(returnTo);
  } catch (error) {
    throw new Error(actionError(error));
  }
}

async function loadMember(admin: ReturnType<typeof createServiceRoleClient>, memberId: string): Promise<Profile> {
  const { data, error } = await admin.from("profiles").select("*").eq("id", memberId).maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Member not found.");
  }

  return normalizeProfile(data as Record<string, unknown>);
}

function statusValue(formData: FormData): DepositStatus {
  const value = textValue(formData, "status");

  if (value === "APPROVED" || value === "REJECTED") {
    return value;
  }

  return "PENDING";
}
