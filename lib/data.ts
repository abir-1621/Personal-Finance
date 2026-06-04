import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_SETTINGS } from "@/lib/constants";
import type { AuditLog, Deposit, DepositStatus, Profile, Setting } from "@/lib/types";
import { toNumber } from "@/lib/utils";

type DbClient = SupabaseClient;

export type DepositFilters = {
  month?: string;
  memberId?: string;
  status?: DepositStatus;
  limit?: number;
};

export async function getSettings(client: DbClient): Promise<Setting> {
  const { data } = await client
    .from("settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return FALLBACK_SETTINGS;
  }

  return normalizeSetting(data as Record<string, unknown>);
}

export async function listMembers(client: DbClient): Promise<Profile[]> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>));
}

export async function listDeposits(client: DbClient, filters: DepositFilters = {}): Promise<Deposit[]> {
  let query = client
    .from("deposits")
    .select("*")
    .order("deposit_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.month) {
    query = query.eq("deposit_month", filters.month);
  }

  if (filters.memberId) {
    query = query.eq("member_id", filters.memberId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeDeposit(row as Record<string, unknown>));
}

export async function getDepositById(client: DbClient, id: string) {
  const { data, error } = await client.from("deposits").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeDeposit(data as Record<string, unknown>) : null;
}

export async function listAuditLogs(client: DbClient, limit = 100): Promise<AuditLog[]> {
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeAuditLog(row as Record<string, unknown>));
}

export function expectedMonthlyDeposit(profile: Pick<Profile, "assigned_shares">, settings: Setting) {
  return profile.assigned_shares * settings.share_price;
}

export function approvedTotal(deposits: Deposit[]) {
  return deposits
    .filter((deposit) => deposit.status === "APPROVED")
    .reduce((total, deposit) => total + deposit.amount, 0);
}

export function pendingTotal(deposits: Deposit[]) {
  return deposits
    .filter((deposit) => deposit.status === "PENDING")
    .reduce((total, deposit) => total + deposit.amount, 0);
}

export function normalizeProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    role: row.role === "ADMIN" ? "ADMIN" : "MEMBER",
    assigned_shares: toNumber(row.assigned_shares),
    is_active: Boolean(row.is_active),
    must_change_password: Boolean(row.must_change_password),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function normalizeSetting(row: Record<string, unknown>): Setting {
  return {
    id: String(row.id),
    share_price: toNumber(row.share_price),
    currency: String(row.currency),
    updated_by: row.updated_by ? String(row.updated_by) : null,
    updated_at: String(row.updated_at)
  };
}

export function normalizeDeposit(row: Record<string, unknown>): Deposit {
  const status = row.status === "APPROVED" || row.status === "REJECTED" ? row.status : "PENDING";

  return {
    id: String(row.id),
    member_id: String(row.member_id),
    deposit_month: String(row.deposit_month),
    deposit_date: String(row.deposit_date),
    share_count_snapshot: toNumber(row.share_count_snapshot),
    share_price_snapshot: toNumber(row.share_price_snapshot),
    amount: toNumber(row.amount),
    status,
    note: row.note ? String(row.note) : null,
    receipt_path: row.receipt_path ? String(row.receipt_path) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function normalizeAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    action: String(row.action),
    table_name: String(row.table_name),
    record_id: row.record_id ? String(row.record_id) : null,
    old_value: (row.old_value as Record<string, unknown> | null) ?? null,
    new_value: (row.new_value as Record<string, unknown> | null) ?? null,
    performed_by: row.performed_by ? String(row.performed_by) : null,
    created_at: String(row.created_at)
  };
}
