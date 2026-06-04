import { Download, PiggyBank } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { approvedTotal, getSettings, listDeposits, listMembers, pendingTotal } from "@/lib/data";
import { formatCurrency, formatMonth } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import type { DepositStatus, Profile } from "@/lib/types";
import { monthNow } from "@/lib/utils";

type MonthlyReportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MonthlyReportPage({ searchParams }: MonthlyReportPageProps) {
  const params = (await searchParams) ?? {};
  const selectedMonth = stringParam(params.month) || monthNow();
  const { supabase } = await requireAdmin();
  const [settings, members, deposits] = await Promise.all([
    getSettings(supabase),
    listMembers(supabase),
    listDeposits(supabase, { month: selectedMonth })
  ]);
  const activeMembers = members.filter((member) => member.is_active);
  const expectedTotal = activeMembers.reduce((total, member) => total + member.assigned_shares * settings.share_price, 0);
  const collectedTotal = approvedTotal(deposits);
  const pendingAmount = pendingTotal(deposits);
  const rows = activeMembers.map((member) => {
    const memberDeposits = deposits.filter((deposit) => deposit.member_id === member.id);
    const approvedDeposit = memberDeposits.find((deposit) => deposit.status === "APPROVED");
    const pendingDeposit = memberDeposits.find((deposit) => deposit.status === "PENDING");
    const rejectedDeposit = memberDeposits.find((deposit) => deposit.status === "REJECTED");
    const status: DepositStatus | "MISSING" = approvedDeposit ? "APPROVED" : pendingDeposit ? "PENDING" : rejectedDeposit ? "REJECTED" : "MISSING";
    const amount = approvedDeposit?.amount ?? pendingDeposit?.amount ?? rejectedDeposit?.amount ?? 0;

    return {
      member,
      status,
      amount,
      expected: member.assigned_shares * settings.share_price
    };
  });
  const missingMembers = rows.filter((row) => row.status === "MISSING");
  const paidMembers = rows.filter((row) => row.status === "APPROVED");
  const csv = buildCsv(rows, settings.currency, selectedMonth);

  return (
    <>
      <PageHeader
        title="Monthly report"
        description={`Collection summary for ${formatMonth(selectedMonth)}.`}
        action={
          <a
            className="btn-secondary"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={`friend-savings-${selectedMonth}.csv`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <form className="panel mb-5 flex max-w-xl flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-2">
          <span className="form-label">Month</span>
          <input className="form-input" name="month" type="month" defaultValue={selectedMonth} />
        </label>
        <button className="btn-secondary" type="submit">
          View
        </button>
      </form>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary label="Expected total" value={formatCurrency(expectedTotal, settings.currency)} />
        <Summary label="Collected total" value={formatCurrency(collectedTotal, settings.currency)} />
        <Summary label="Pending total" value={formatCurrency(pendingAmount, settings.currency)} />
        <Summary label="Paid members" value={String(paidMembers.length)} />
        <Summary label="Missing members" value={String(missingMembers.length)} />
      </div>
      {rows.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Shares</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Collected/Pending</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.member.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.member.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.member.assigned_shares}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(row.expected, settings.currency)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.amount ? formatCurrency(row.amount, settings.currency) : "-"}</td>
                  <td className="px-4 py-3">
                    {row.status === "MISSING" ? (
                      <span className="inline-flex min-w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Missing
                      </span>
                    ) : (
                      <StatusBadge status={row.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState icon={PiggyBank} title="No active members" description="Add or activate members to generate a monthly report." />
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function buildCsv(
  rows: Array<{ member: Profile; status: DepositStatus | "MISSING"; amount: number; expected: number }>,
  currency: string,
  month: string
) {
  const header = ["month", "member", "email", "assigned_shares", "expected", "amount", "currency", "status"];
  const lines = rows.map((row) =>
    [month, row.member.full_name, row.member.email, row.member.assigned_shares, row.expected, row.amount, currency, row.status]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
