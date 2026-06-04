export type Role = "ADMIN" | "MEMBER";

export type DepositStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  assigned_shares: number;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type Setting = {
  id: string;
  share_price: number;
  currency: string;
  updated_by: string | null;
  updated_at: string;
};

export type Deposit = {
  id: string;
  member_id: string;
  deposit_month: string;
  deposit_date: string;
  share_count_snapshot: number;
  share_price_snapshot: number;
  amount: number;
  status: DepositStatus;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
};

export type ActionState = {
  error?: string;
  success?: string;
};
