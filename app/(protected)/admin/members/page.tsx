import { PiggyBank, UserPlus } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/page-header";
import { PasswordResetButton } from "@/components/password-reset-button";
import { approvedTotal, expectedMonthlyDeposit, getSettings, listDeposits, listMembers } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

export default async function AdminMembersPage() {
  const { supabase } = await requireAdmin();
  const [settings, members, deposits] = await Promise.all([
    getSettings(supabase),
    listMembers(supabase),
    listDeposits(supabase)
  ]);

  return (
    <>
      <PageHeader title="Members" description="Admin-created users with admin-assigned share counts." />
      <section className="panel mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-950">Create member</h2>
        </div>
        <MemberForm mode="create" settings={settings} />
      </section>
      {members.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned shares</th>
                <th className="px-4 py-3">Expected monthly</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Total deposited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const totalDeposited = approvedTotal(deposits.filter((deposit) => deposit.member_id === member.id));
                return (
                  <tr key={member.id} className="align-top">
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-slate-900">{member.full_name}</summary>
                        <div className="mt-4 grid min-w-[320px] gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:min-w-[520px]">
                          <MemberForm mode="edit" member={member} settings={settings} />
                          <PasswordResetButton member={member} />
                        </div>
                      </details>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{member.email}</td>
                    <td className="px-4 py-3 text-slate-600">{member.role}</td>
                    <td className="px-4 py-3 text-slate-600">{member.assigned_shares}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(expectedMonthlyDeposit(member, settings), settings.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={member.is_active ? "text-emerald-700" : "text-red-700"}>{member.is_active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(totalDeposited, settings.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState icon={PiggyBank} title="No members yet" description="Create the first member using the form above." />
      )}
    </>
  );
}
