"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getDepositById, getDepositForMemberMonth, getSettings, normalizeDeposit, normalizeProfile } from "@/lib/data";
import { actionError, textValue } from "@/lib/form";
import { MAX_RECEIPT_BYTES, RECEIPT_BUCKET } from "@/lib/receipts";
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

    const existingDeposit = await getDepositForMemberMonth(admin, member.id, values.deposit_month);

    if (existingDeposit) {
      return { error: duplicateDepositMessage(member.full_name, values.deposit_month) };
    }

    const settings = await getSettings(admin);
    const amount = member.assigned_shares * settings.share_price;
    const depositId = randomUUID();
    const receiptFile = receiptFileValue(formData);
    const receiptPath = receiptFile ? await uploadReceipt(admin, receiptFile, member.id, depositId) : null;
    const payload = {
      id: depositId,
      member_id: member.id,
      deposit_month: values.deposit_month,
      deposit_date: values.deposit_date,
      share_count_snapshot: member.assigned_shares,
      share_price_snapshot: settings.share_price,
      amount,
      status: "PENDING" as DepositStatus,
      note: values.note ?? null,
      receipt_path: receiptPath,
      created_by: actor.id,
      updated_by: actor.id
    };

    const { data, error } = await admin.from("deposits").insert(payload).select().single();

    if (error || !data) {
      if (receiptPath) {
        await deleteReceipt(admin, receiptPath);
      }
      return { error: depositWriteError(error, "Unable to create deposit.", member.full_name, values.deposit_month) };
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
    const { profile: actor } = await requireUser();
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

    if (oldDeposit.status === "APPROVED") {
      return { error: "Approved deposits are locked and cannot be changed." };
    }

    const isAdmin = actor.role === "ADMIN";

    if (!isAdmin && oldDeposit.member_id !== actor.id) {
      return { error: "Members can only edit their own deposits." };
    }

    if (!isAdmin && oldDeposit.status !== "PENDING") {
      return { error: "Only pending deposits can be edited before approval." };
    }

    const memberId = isAdmin ? values.member_id : oldDeposit.member_id;
    const depositMonth = isAdmin ? values.deposit_month : oldDeposit.deposit_month;
    const nextStatus = isAdmin ? values.status : oldDeposit.status;
    const member = await loadMember(admin, memberId);

    if (!member.is_active) {
      return { error: "This member is inactive." };
    }

    const settings = await getSettings(admin);
    const memberChanged = member.id !== oldDeposit.member_id;

    if (memberChanged && member.assigned_shares <= 0) {
      return { error: "This member needs assigned shares before a deposit can be moved to them." };
    }

    const duplicateDeposit = await getDepositForMemberMonth(admin, member.id, depositMonth, {
      excludeId: oldDeposit.id
    });

    if (duplicateDeposit) {
      return { error: duplicateDepositMessage(member.full_name, depositMonth) };
    }

    const shareCountSnapshot = memberChanged ? member.assigned_shares : oldDeposit.share_count_snapshot;
    const sharePriceSnapshot = memberChanged ? settings.share_price : oldDeposit.share_price_snapshot;
    const amount = shareCountSnapshot * sharePriceSnapshot;
    const receiptFile = receiptFileValue(formData);
    const removeReceipt = textValue(formData, "remove_receipt") === "on";
    const newReceiptPath = receiptFile ? await uploadReceipt(admin, receiptFile, member.id, values.id) : null;
    const receiptPath = newReceiptPath ?? (removeReceipt ? null : oldDeposit.receipt_path);

    const updatePayload = {
      member_id: member.id,
      deposit_month: depositMonth,
      deposit_date: values.deposit_date,
      share_count_snapshot: shareCountSnapshot,
      share_price_snapshot: sharePriceSnapshot,
      amount,
      status: nextStatus,
      note: values.note ?? null,
      receipt_path: receiptPath,
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
      if (newReceiptPath) {
        await deleteReceipt(admin, newReceiptPath);
      }
      return { error: depositWriteError(error, "Unable to update deposit.", member.full_name, depositMonth) };
    }

    const updatedDeposit = normalizeDeposit(data as Record<string, unknown>);

    if ((newReceiptPath || removeReceipt) && oldDeposit.receipt_path) {
      await deleteReceipt(admin, oldDeposit.receipt_path);
    }

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
    redirect(values.return_to ?? (isAdmin ? "/admin/deposits" : "/deposits/history"));
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

    if (oldDeposit.status === "APPROVED") {
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

    if (oldDeposit.status === "APPROVED") {
      redirect(returnTo);
    }

    const { error } = await admin.from("deposits").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    if (oldDeposit.receipt_path) {
      await deleteReceipt(admin, oldDeposit.receipt_path);
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

function duplicateDepositMessage(memberName: string, month: string) {
  return `${memberName} already has a deposit for ${month}. Edit the existing pending deposit instead.`;
}

function depositWriteError(
  error: { code?: string; message?: string } | null,
  fallback: string,
  memberName: string,
  month: string
) {
  if (isUniqueViolation(error)) {
    return duplicateDepositMessage(memberName, month);
  }

  return error?.message ?? fallback;
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return error?.code === "23505" || error?.message?.includes("deposits_member_month_unique_idx") === true;
}

function receiptFileValue(formData: FormData) {
  const value = formData.get("receipt");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

async function uploadReceipt(
  admin: ReturnType<typeof createServiceRoleClient>,
  file: File,
  memberId: string,
  depositId: string
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Receipt must be a JPEG, PNG, or WebP image.");
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt image is too large. Use an image under 6 MB.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${memberId}/${depositId}-${Date.now()}.${extension}`;
  const { error } = await admin.storage.from(RECEIPT_BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

async function deleteReceipt(admin: ReturnType<typeof createServiceRoleClient>, path: string) {
  const { error } = await admin.storage.from(RECEIPT_BUCKET).remove([path]);

  if (error) {
    console.warn(`Unable to delete receipt ${path}: ${error.message}`);
  }
}
