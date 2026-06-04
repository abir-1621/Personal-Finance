import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

type AuditPayload = {
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  performedBy?: string | null;
};

export async function writeAuditLog(payload: AuditPayload) {
  const admin = createServiceRoleClient();
  const { error } = await admin.from("audit_logs").insert({
    action: payload.action,
    table_name: payload.tableName,
    record_id: payload.recordId ?? null,
    old_value: payload.oldValue ?? null,
    new_value: payload.newValue ?? null,
    performed_by: payload.performedBy ?? null
  });

  if (error) {
    throw new Error(error.message);
  }
}
