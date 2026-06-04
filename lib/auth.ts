import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type RequireUserOptions = {
  allowPasswordChange?: boolean;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile: profile as Profile | null };
}

export async function requireUser(options: RequireUserOptions = {}) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.must_change_password && !options.allowPasswordChange) {
    redirect("/change-password");
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const context = await requireUser();

  if (context.profile.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return context;
}
