import { ScrollText } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { listAuditLogs, listMembers } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export default async function AuditLogsPage() {
  const { supabase } = await requireAdmin();
  const [logs, members] = await Promise.all([listAuditLogs(supabase, 150), listMembers(supabase)]);
  const names = new Map(members.map((member) => [member.id, member.full_name]));

  return (
    <>
      <PageHeader title="Audit logs" description="Admin and transaction changes recorded by server-side actions." />
      {logs.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Record id</th>
                <th className="px-4 py-3">Performed by</th>
                <th className="px-4 py-3">Old value</th>
                <th className="px-4 py-3">New value</th>
                <th className="px-4 py-3">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.table_name}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">{log.record_id ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{log.performed_by ? (names.get(log.performed_by) ?? log.performed_by) : "-"}</td>
                  <td className="max-w-xs px-4 py-3">
                    <JsonPreview value={log.old_value} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <JsonPreview value={log.new_value} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState icon={ScrollText} title="No audit logs yet" description="Audit logs appear after members, deposits, or settings are changed." />
      )}
    </>
  );
}

function JsonPreview({ value }: { value: Record<string, unknown> | null }) {
  if (!value) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
