import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.FIRST_ADMIN_EMAIL;
const password = process.env.FIRST_ADMIN_PASSWORD;
const fullName = process.env.FIRST_ADMIN_FULL_NAME ?? "Admin User";

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIRST_ADMIN_EMAIL, or FIRST_ADMIN_PASSWORD."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName
  }
});

if (authError || !authData.user) {
  console.error(authError?.message ?? "Unable to create auth user.");
  process.exit(1);
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: authData.user.id,
  email,
  full_name: fullName,
  role: "ADMIN",
  assigned_shares: 0,
  is_active: true,
  must_change_password: true
});

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

console.log(`Created first admin: ${email}`);
