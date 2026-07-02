"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, textValue } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionState, Profile } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address.")
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your new password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export async function loginAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const values = loginSchema.parse({
      email: textValue(formData, "email"),
      password: textValue(formData, "password")
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      return { error: "Invalid email or password." };
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unable to start a secure session." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      return { error: "This account does not have an app profile yet." };
    }

    const appProfile = profile as Profile;

    if (!appProfile.is_active) {
      await supabase.auth.signOut();
      return { error: "This account is inactive. Contact the admin." };
    }

    redirect(appProfile.must_change_password ? "/change-password" : "/dashboard");
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function changePasswordAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const values = passwordSchema.parse({
      password: textValue(formData, "password"),
      confirmPassword: textValue(formData, "confirmPassword")
    });

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { error } = await supabase.auth.updateUser({
      password: values.password
    });

    if (error) {
      return { error: error.message };
    }

    const admin = createServiceRoleClient();
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileError) {
      return { error: profileError.message };
    }

    redirect("/dashboard");
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function forgotPasswordAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const values = forgotPasswordSchema.parse({
      email: textValue(formData, "email").toLowerCase()
    });
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${await getOrigin()}/auth/callback?next=/reset-password`
    });

    if (error) {
      return { error: "Unable to send reset email right now. Please try again." };
    }

    return {
      success: "If this email belongs to an active account, a reset link has been sent."
    };
  } catch (error) {
    return { error: actionError(error) };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
