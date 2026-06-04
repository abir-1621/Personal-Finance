import Link from "next/link";
import { Check, Pencil, PiggyBank, Trash2, X } from "lucide-react";
import { deleteDepositAction, setDepositStatusAction } from "@/app/actions/deposits";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { DepositForm } from "@/components/deposit-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDepositById, getSettings, listAuditLogs, listDeposits, listMembers } from "@/lib/data";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import type { Deposit } from "@/lib/types";

type AdminDepositsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDepositsPage({ searchParams }: AdminDepositsPageProps) {
  const params = (await searchParams) ?? {};
  const editId = stringParam(params.edit);
  const month = stringParam(params.month);
  const memberId = stringParam(params.member);
  const status = stringParam(params.status);
  const { supabase, profile } = await requireAdmin();
  const [settings, members, deposits, editDeposit, auditLogs] = await Promise.all([
    getSettings(supabase),
    listMembers(supabase),
    listDeposits(supabase, {
      month: month || undefined,
      memberId: memberId || undefined,
      status: status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? status : undefined
    }),
    editId ? getDepositById(supabase, editId) : Promise.resolve(null),
    editId ? listAuditLogs(supabase, 100) : Promise.resolve([])
  ]);
  const activeMembers = members.filter((member) => member.is_active);
  const memberNames = new Map(members.map((member) => [member.id, member.full_name]));
  const returnTo = `/admin/deposits${queryString({ month, member: memberId, status })}`;
  const depositAuditLogs = editId ? auditLogs.filter((log) => log.table_name === "deposits" && log.record_id === editId) : [];

  return (
    <>
      <PageHeader
        title="Deposit management"
        description="Edit, approve, reject, or delete transactions. Every admin change writes an audit log."
        action={
          <Link href="/deposits/add" className="btn-primary">
            Add deposit
          </Link>
        }
      />
      {editDeposit ? (
        <section className="panel mb-6 max-w-3xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Pencil className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">Edit deposit</h2>
          </div>
          <DepositForm
            mode="edit"
            currentProfile={profile}
            members={activeMembers.length ? activeMembers : members}
            settings={settings}
            deposit={editDeposit}
            returnTo={returnTo}
          />
          {depositAuditLogs.length ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Audit history</h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {depositAuditLogs.slice(0, 5).map((log) => (
                  <li key={log.id}>
                    <span className="font-semibold text-slate-800">{log.action}</span> on {new Date(log.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      <form className="panel mb-5 grid gap-4 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="space-y-2">
          <span className="form-label">Month</span>
          <input className="form-input" name="month" type="month" defaultValue={month} />
        </label>
        <label className="space-y-2">
          <span className="form-label">Member</span>
          <select className="form-input" name="member" defaultValue={memberId}>
            <option value="">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="form-label">Status</span>
          <select className="form-input" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="btn-secondary" type="submit">
            Filter
          </button>
          <Link href="/admin/deposits" className="btn-secondary">
            Reset
          </Link>
        </div>
      </form>
      {deposits.length ? (
        <AdminDepositsTable deposits={deposits} currency={settings.currency} memberNames={memberNames} returnTo={returnTo} />
      ) : (
        <EmptyState icon={PiggyBank} title="No deposits found" description="Try another filter or add a new deposit." />
      )}
    </>
  );
}

function AdminDepositsTable({
  deposits,
  currency,
  memberNames,
  returnTo
}: {
  deposits: Deposit[];
  currency: string;
  memberNames: Map<string, string>;
  returnTo: string;
}) {
  return (
    <DataTable>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Shares</th>
            <th className="px-4 py-3">Share price</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deposits.map((deposit) => (
            <tr key={deposit.id}>
              <td className="px-4 py-3 text-slate-600">{formatDate(deposit.deposit_date)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMonth(deposit.deposit_month)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{memberNames.get(deposit.member_id) ?? "Unknown"}</td>
              <td className="px-4 py-3 text-slate-600">{deposit.share_count_snapshot}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(deposit.share_price_snapshot, currency)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(deposit.amount, currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={deposit.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/deposits?edit=${deposit.id}`} className="btn-secondary min-h-8 px-2 py-1" title="Edit">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <StatusForm id={deposit.id} status="APPROVED" returnTo={returnTo} icon="approve" />
                  <StatusForm id={deposit.id} status="REJECTED" returnTo={returnTo} icon="reject" />
                  <ConfirmDialog action={deleteDepositAction} message="Delete this deposit? This keeps an audit log entry.">
                    <input type="hidden" name="id" value={deposit.id} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <button className="btn-danger min-h-8 px-2 py-1" type="submit" title="Delete">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </ConfirmDialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

function StatusForm({
  id,
  status,
  returnTo,
  icon
}: {
  id: string;
  status: "APPROVED" | "REJECTED";
  returnTo: string;
  icon: "approve" | "reject";
}) {
  const Icon = icon === "approve" ? Check : X;
  return (
    <form action={setDepositStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button className="btn-secondary min-h-8 px-2 py-1" type="submit" title={status === "APPROVED" ? "Approve" : "Reject"}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function queryString(params: Record<string, string>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}
