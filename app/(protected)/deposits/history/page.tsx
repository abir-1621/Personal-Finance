import Link from "next/link";
import { Check, ExternalLink, ImageIcon, Pencil, PiggyBank, Trash2, X } from "lucide-react";
import { deleteDepositAction, setDepositStatusAction } from "@/app/actions/deposits";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getSettings, listDeposits, listMembers } from "@/lib/data";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { getReceiptUrlMap } from "@/lib/receipts";
import { requireUser } from "@/lib/auth";
import type { Deposit } from "@/lib/types";
import { monthNow } from "@/lib/utils";

type HistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DepositHistoryPage({ searchParams }: HistoryPageProps) {
  const params = (await searchParams) ?? {};
  const month = stringParam(params.month);
  const memberId = stringParam(params.member);
  const { supabase, profile } = await requireUser();
  const settings = await getSettings(supabase);
  const members = profile.role === "ADMIN" ? await listMembers(supabase) : [profile];
  const filters = {
    month: month || undefined,
    memberId: profile.role === "ADMIN" && memberId ? memberId : undefined
  };
  const deposits = await listDeposits(supabase, filters);
  const receiptUrls = await getReceiptUrlMap(supabase, deposits);
  const nameForMember = (id: string) => members.find((member) => member.id === id)?.full_name ?? (id === profile.id ? profile.full_name : "Friend");
  const returnTo = `/deposits/history${queryString({ month, member: profile.role === "ADMIN" ? memberId : "" })}`;

  return (
    <>
      <PageHeader
        title="Deposit history"
        description="Review monthly deposits and their approval status."
        action={
          <Link href="/deposits/add" className="btn-primary">
            Add deposit
          </Link>
        }
      />
      <form className="panel mb-5 grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2">
          <span className="form-label">Month</span>
          <input className="form-input" name="month" type="month" defaultValue={month || monthNow()} />
        </label>
        {profile.role === "ADMIN" ? (
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
        ) : null}
        <div className="flex items-end gap-2">
          <button className="btn-secondary" type="submit">
            Filter
          </button>
          <Link href="/deposits/history" className="btn-secondary">
            Reset
          </Link>
        </div>
      </form>
      {deposits.length ? (
        <DepositsHistoryTable
          deposits={deposits}
          currency={settings.currency}
          nameForMember={nameForMember}
          isAdmin={profile.role === "ADMIN"}
          returnTo={returnTo}
          receiptUrls={receiptUrls}
        />
      ) : (
        <EmptyState icon={PiggyBank} title="No deposits found" description="Try another filter or add a new deposit." />
      )}
    </>
  );
}

function DepositsHistoryTable({
  deposits,
  currency,
  nameForMember,
  isAdmin,
  returnTo,
  receiptUrls
}: {
  deposits: Deposit[];
  currency: string;
  nameForMember: (id: string) => string;
  isAdmin: boolean;
  returnTo: string;
  receiptUrls: Map<string, string | null>;
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
            <th className="px-4 py-3">Receipt</th>
            <th className="px-4 py-3">Note</th>
            {isAdmin ? <th className="px-4 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deposits.map((deposit) => (
            <tr key={deposit.id} className="align-top">
              <td className="px-4 py-3 text-slate-600">{formatDate(deposit.deposit_date)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMonth(deposit.deposit_month)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{nameForMember(deposit.member_id)}</td>
              <td className="px-4 py-3 text-slate-600">{deposit.share_count_snapshot}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(deposit.share_price_snapshot, currency)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(deposit.amount, currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={deposit.status} />
              </td>
              <td className="px-4 py-3">
                <ReceiptLink url={receiptUrls.get(deposit.id) ?? null} />
              </td>
              <td className="max-w-xs px-4 py-3 text-slate-600">{deposit.note || "-"}</td>
              {isAdmin ? (
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
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

function ReceiptLink({ url }: { url: string | null }) {
  if (!url) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <a className="btn-secondary min-h-8 px-2 py-1" href={url} target="_blank" rel="noreferrer" title="Open receipt">
      <ImageIcon className="h-4 w-4" aria-hidden="true" />
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
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
