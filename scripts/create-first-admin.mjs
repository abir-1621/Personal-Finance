import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvFile(".env.local");
loadEnvFile(".env");

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

let userId;

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName
  }
});

if (authError || !authData.user) {
  const message = authError?.message ?? "Unable to create auth user.";

  if (!/already|registered|exists/i.test(message)) {
    console.error(message);
    process.exit(1);
  }

  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    console.error("The auth user already exists, but it could not be loaded.");
    process.exit(1);
  }

  userId = existingUser.id;
} else {
  userId = authData.user.id;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: userId,
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

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail.toLowerCase());

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}
