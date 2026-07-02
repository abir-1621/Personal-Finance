"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { normalizeProfile } from "@/lib/data";
import { actionError, booleanValue, numberValue, textValue } from "@/lib/form";
import { passwordResetErrorMessage } from "@/lib/password-reset-errors";
import { getSiteUrl, passwordResetRedirectUrl } from "@/lib/site-url";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionState, Role } from "@/lib/types";

const memberBaseSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "MEMBER"]),
  assigned_shares: z.number().int().min(0, "Shares cannot be negative."),
  is_active: z.boolean()
});

const createMemberSchema = memberBaseSchema.extend({
  initial_password: z.string().min(8, "Initial password must be at least 8 characters.")
});

const updateMemberSchema = memberBaseSchema.extend({
  id: z.string().uuid("Missing member id.")
});

const resetPasswordSchema = z.object({
  id: z.string().uuid("Missing member id.")
});

export async function createMemberAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { profile: actor } = await requireAdmin();
    const values = createMemberSchema.parse({
      full_name: textValue(formData, "full_name"),
      email: textValue(formData, "email").toLowerCase(),
      role: roleValue(formData),
      assigned_shares: numberValue(formData, "assigned_shares"),
      is_active: true,
      initial_password: textValue(formData, "initial_password")
    });

    const admin = createServiceRoleClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: values.email,
      password: values.initial_password,
      email_confirm: true,
      user_metadata: {
        full_name: values.full_name
      }
    });

    if (authError || !authData.user) {
      return { error: authError?.message ?? "Unable to create auth user." };
    }

    const newProfile = {
      id: authData.user.id,
      email: values.email,
      full_name: values.full_name,
      role: values.role,
      assigned_shares: values.assigned_shares,
      is_active: values.is_active,
      must_change_password: true
    };

    const { error: profileError } = await admin.from("profiles").insert(newProfile);

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    await writeAuditLog({
      action: "CREATE_MEMBER",
      tableName: "profiles",
      recordId: authData.user.id,
      newValue: newProfile,
      performedBy: actor.id
    });

    revalidatePath("/admin/members");
    revalidatePath("/dashboard");
    return { success: "Member created." };
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function updateMemberAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { profile: actor } = await requireAdmin();
    const values = updateMemberSchema.parse({
      id: textValue(formData, "id"),
      full_name: textValue(formData, "full_name"),
      email: textValue(formData, "email").toLowerCase(),
      role: roleValue(formData),
      assigned_shares: numberValue(formData, "assigned_shares"),
      is_active: booleanValue(formData, "is_active")
    });

    if (values.id === actor.id && (values.role !== "ADMIN" || !values.is_active)) {
      return { error: "You cannot demote or deactivate your own admin account." };
    }

    const admin = createServiceRoleClient();
    const { data: oldRow, error: oldError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", values.id)
      .maybeSingle();

    if (oldError || !oldRow) {
      return { error: oldError?.message ?? "Member not found." };
    }

    const oldProfile = normalizeProfile(oldRow as Record<string, unknown>);

    const { error: authError } = await admin.auth.admin.updateUserById(values.id, {
      email: values.email,
      email_confirm: true,
      user_metadata: {
        full_name: values.full_name
      }
    });

    if (authError) {
      return { error: authError.message };
    }

    const updates = {
      email: values.email,
      full_name: values.full_name,
      role: values.role,
      assigned_shares: values.assigned_shares,
      is_active: values.is_active,
      updated_at: new Date().toISOString()
    };

    const { data: updatedRow, error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", values.id)
      .select()
      .single();

    if (updateError || !updatedRow) {
      return { error: updateError?.message ?? "Unable to update member." };
    }

    await writeAuditLog({
      action: "UPDATE_MEMBER",
      tableName: "profiles",
      recordId: values.id,
      oldValue: oldProfile,
      newValue: normalizeProfile(updatedRow as Record<string, unknown>),
      performedBy: actor.id
    });

    revalidatePath("/admin/members");
    revalidatePath("/dashboard");
    revalidatePath("/deposits/add");
    return { success: "Member updated." };
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function sendMemberPasswordResetAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase, profile: actor } = await requireAdmin();
    const values = resetPasswordSchema.parse({
      id: textValue(formData, "id")
    });
    const admin = createServiceRoleClient();
    const { data: member, error: memberError } = await admin
      .from("profiles")
      .select("id,email,full_name,is_active")
      .eq("id", values.id)
      .maybeSingle();

    if (memberError || !member) {
      return { error: memberError?.message ?? "Member not found." };
    }

    if (!member.is_active) {
      return { error: "Activate this member before sending a password reset email." };
    }

    const redirectTo = passwordResetRedirectUrl(await getSiteUrl());
    const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
      redirectTo
    });

    if (error) {
      return { error: passwordResetErrorMessage(error, redirectTo) };
    }

    await writeAuditLog({
      action: "SEND_PASSWORD_RESET",
      tableName: "profiles",
      recordId: member.id,
      oldValue: null,
      newValue: {
        email: member.email,
        full_name: member.full_name,
        reset_email_sent: true
      },
      performedBy: actor.id
    });

    return { success: `Password reset email sent to ${member.email}.` };
  } catch (error) {
    return { error: actionError(error) };
  }
}

function roleValue(formData: FormData): Role {
  return textValue(formData, "role") === "ADMIN" ? "ADMIN" : "MEMBER";
}
