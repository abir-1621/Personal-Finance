import Link from "next/link";
import { Banknote, CalendarCheck, CircleDollarSign, Clock3, Layers3, PiggyBank, Users } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { WhatsAppReminder } from "@/components/whatsapp-reminder";
import {
  approvedTotal,
  getSettings,
  listDeposits,
  listMembers,
  pendingTotal
} from "@/lib/data";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import type { Deposit, Profile } from "@/lib/types";
import { monthNow } from "@/lib/utils";

export default async function DashboardPage() {
  const { supabase, profile } = await requireUser();
  const settings = await getSettings(supabase);
  const deposits = await listDeposits(supabase);

  if (profile.role === "ADMIN") {
    const members = await listMembers(supabase);
    return <AdminDashboard profile={profile} members={members} deposits={deposits} currency={settings.currency} sharePrice={settings.share_price} />;
  }

  return <MemberDashboard profile={profile} deposits={deposits} currency={settings.currency} sharePrice={settings.share_price} />;
}

function MemberDashboard({
  profile,
  deposits,
  currency,
  sharePrice
}: {
  profile: Profile;
  deposits: Deposit[];
  currency: string;
  sharePrice: number;
}) {
  const currentMonth = monthNow();
  const ownDeposits = deposits.filter((deposit) => deposit.member_id === profile.id);
  const approvedOwnDeposits = ownDeposits.filter((deposit) => deposit.status === "APPROVED");
  const currentMonthDeposit = ownDeposits.find((deposit) => deposit.deposit_month === currentMonth);
  const groupTotal = approvedTotal(deposits);
  const ownTotal = approvedTotal(ownDeposits);
  const paidHistoricalShares = approvedOwnDeposits.reduce((total, deposit) => total + deposit.share_count_snapshot, 0);
  const expected = profile.assigned_shares * sharePrice;
  const action =
    currentMonthDeposit?.status === "PENDING" ? (
      <Link href={`/deposits/add?edit=${currentMonthDeposit.id}`} className="btn-primary">
        Edit current deposit
      </Link>
    ) : currentMonthDeposit ? (
      <Link href="/deposits/history" className="btn-secondary">
        View history
      </Link>
    ) : (
      <Link href="/deposits/add" className="btn-primary">
        Add deposit
      </Link>
    );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your shares, deposits, and the group's accumulated savings."
        action={action}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Assigned shares" value={String(profile.assigned_shares)} caption="Managed by admin" icon={Users} tone="blue" />
        <StatCard title="Expected monthly" value={formatCurrency(expected, currency)} caption="Shares multiplied by current share price" icon={CalendarCheck} tone="teal" />
        <StatCard title="My total deposited" value={formatCurrency(ownTotal, currency)} caption="Approved deposits only" icon={PiggyBank} tone="teal" />
        <StatCard title="Shares paid historically" value={String(paidHistoricalShares)} caption="Sum of approved deposit snapshots" icon={CircleDollarSign} tone="slate" />
        <StatCard
          title="This month"
          value={currentMonthDeposit ? currentMonthDeposit.status[0] + currentMonthDeposit.status.slice(1).toLowerCase() : "Missing"}
          caption={formatMonth(currentMonth)}
          icon={Clock3}
          tone={currentMonthDeposit?.status === "APPROVED" ? "teal" : currentMonthDeposit?.status === "REJECTED" ? "red" : "amber"}
        />
        <StatCard title="Group accumulated" value={formatCurrency(groupTotal, currency)} caption="All approved group deposits" icon={Banknote} tone="blue" />
      </div>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent deposits</h2>
          <Link href="/deposits/history" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
            View history
          </Link>
        </div>
        {ownDeposits.length ? (
          <DepositTable deposits={ownDeposits.slice(0, 8)} currency={currency} nameForMember={() => profile.full_name} />
        ) : (
          <EmptyState icon={PiggyBank} title="No deposits yet" description="Submit a deposit when you are ready for this month." />
        )}
      </section>
    </>
  );
}

function AdminDashboard({
  members,
  deposits,
  currency,
  sharePrice
}: {
  profile: Profile;
  members: Profile[];
  deposits: Deposit[];
  currency: string;
  sharePrice: number;
}) {
  const currentMonth = monthNow();
  const activeMembers = members.filter((member) => member.is_active);
  const expectedMembers = activeMembers.filter((member) => member.assigned_shares > 0);
  const totalActiveShares = activeMembers.reduce((total, member) => total + member.assigned_shares, 0);
  const totalSavings = approvedTotal(deposits);
  const monthlyExpected = expectedMembers.reduce((total, member) => total + member.assigned_shares * sharePrice, 0);
  const currentMonthDeposits = deposits.filter((deposit) => deposit.deposit_month === currentMonth);
  const collectedThisMonth = approvedTotal(currentMonthDeposits);
  const pendingDeposits = deposits.filter((deposit) => deposit.status === "PENDING");
  const pendingAmount = pendingTotal(deposits);
  const memberNames = new Map(members.map((member) => [member.id, member.full_name]));
  const submittedThisMonthMemberIds = new Set(currentMonthDeposits.map((deposit) => deposit.member_id));
  const remainingMembers = expectedMembers.filter((member) => !submittedThisMonthMemberIds.has(member.id));
  const remainingReminderMembers = remainingMembers.map((member) => ({
    name: member.full_name,
    amount: formatCurrency(member.assigned_shares * sharePrice, currency)
  }));
  const currentMonthLabel = formatMonth(currentMonth);
  const summaries = recentMonths(6).map((month) => ({
    month,
    collected: approvedTotal(deposits.filter((deposit) => deposit.deposit_month === month)),
    pending: pendingTotal(deposits.filter((deposit) => deposit.deposit_month === month))
  }));

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="Savings totals, monthly collection health, and member contributions."
        action={
          <Link href="/admin/members" className="btn-primary">
            Manage members
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-7">
        <StatCard title="Group savings" value={formatCurrency(totalSavings, currency)} caption="Approved all time" icon={PiggyBank} tone="teal" />
        <StatCard title="Expected this month" value={formatCurrency(monthlyExpected, currency)} caption={currentMonthLabel} icon={CalendarCheck} tone="blue" />
        <StatCard title="Collected this month" value={formatCurrency(collectedThisMonth, currency)} caption="Approved deposits" icon={Banknote} tone="teal" />
        <StatCard title="Pending deposits" value={String(pendingDeposits.length)} caption={formatCurrency(pendingAmount, currency)} icon={Clock3} tone="amber" />
        <StatCard title="Remaining submissions" value={String(remainingMembers.length)} caption={currentMonthLabel} icon={Users} tone={remainingMembers.length ? "amber" : "teal"} />
        <StatCard title="Active members" value={String(activeMembers.length)} caption={`${members.length} total profiles`} icon={Users} tone="slate" />
        <StatCard title="Active shares" value={String(totalActiveShares)} caption="Assigned to active members" icon={Layers3} tone="blue" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-950">Month-wise collection</h2>
          <DataTable>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Collected</th>
                  <th className="px-4 py-3">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((summary) => (
                  <tr key={summary.month}>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatMonth(summary.month)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(summary.collected, currency)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(summary.pending, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-950">Member-wise contribution</h2>
          <DataTable>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Shares</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Deposited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const memberDeposits = deposits.filter((deposit) => deposit.member_id === member.id);
                  return (
                    <tr key={member.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{memberNames.get(member.id)}</td>
                      <td className="px-4 py-3 text-slate-600">{member.assigned_shares}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(member.assigned_shares * sharePrice, currency)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(approvedTotal(memberDeposits), currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        </section>
      </div>
      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">Remaining this month</h2>
            <Link href={`/admin/deposits?month=${currentMonth}`} className="text-sm font-semibold text-teal-700 hover:text-teal-900">
              View month
            </Link>
          </div>
          <WhatsAppReminder members={remainingReminderMembers} monthLabel={currentMonthLabel} />
        </div>
        {remainingMembers.length ? (
          <RemainingMembersTable members={remainingMembers} currency={currency} sharePrice={sharePrice} />
        ) : (
          <EmptyState icon={CalendarCheck} title="All expected members submitted" description="Every active member with assigned shares has a deposit record for this month." />
        )}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Recent deposits</h2>
        {deposits.length ? (
          <DepositTable deposits={deposits.slice(0, 8)} currency={currency} nameForMember={(id) => memberNames.get(id) ?? "Unknown"} />
        ) : (
          <EmptyState icon={PiggyBank} title="No deposits yet" description="Deposits will appear here after members start submitting them." />
        )}
      </section>
    </>
  );
}

function RemainingMembersTable({
  members,
  currency,
  sharePrice
}: {
  members: Profile[];
  currency: string;
  sharePrice: number;
}) {
  return (
    <DataTable>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Shares</th>
            <th className="px-4 py-3">Expected amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{member.full_name}</td>
              <td className="px-4 py-3 text-slate-600">{member.email}</td>
              <td className="px-4 py-3 text-slate-600">{member.assigned_shares}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(member.assigned_shares * sharePrice, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

function DepositTable({
  deposits,
  currency,
  nameForMember
}: {
  deposits: Deposit[];
  currency: string;
  nameForMember: (memberId: string) => string;
}) {
  return (
    <DataTable>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deposits.map((deposit) => (
            <tr key={deposit.id}>
              <td className="px-4 py-3 text-slate-600">{formatDate(deposit.deposit_date)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMonth(deposit.deposit_month)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{nameForMember(deposit.member_id)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(deposit.amount, currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={deposit.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}
