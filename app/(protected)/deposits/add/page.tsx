import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { DepositForm } from "@/components/deposit-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getDepositById, getSettings, listMembers } from "@/lib/data";
import { getReceiptUrl } from "@/lib/receipts";
import { requireUser } from "@/lib/auth";
import type { Profile } from "@/lib/types";

type AddDepositPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AddDepositPage({ searchParams }: AddDepositPageProps) {
  const params = (await searchParams) ?? {};
  const editId = stringParam(params.edit);
  const { supabase, profile } = await requireUser();
  const settings = await getSettings(supabase);
  const allMembers = profile.role === "ADMIN" ? await listMembers(supabase) : [profile];
  const activeMembers = allMembers.filter((member) => member.is_active);

  if (editId) {
    const deposit = await getDepositById(supabase, editId);
    const canEdit =
      Boolean(deposit) &&
      deposit?.status === "PENDING" &&
      (profile.role === "ADMIN" || deposit.member_id === profile.id);
    const receiptUrl = canEdit && deposit ? await getReceiptUrl(supabase, deposit.receipt_path) : null;
    const formMembers = profile.role === "ADMIN" ? memberListForEdit(allMembers, activeMembers, deposit?.member_id) : [profile];

    return (
      <>
        <PageHeader
          title="Edit deposit"
          description="Pending deposits can be updated before approval."
          action={
            <Link href="/deposits/history" className="btn-secondary">
              Back to history
            </Link>
          }
        />
        <section className="panel max-w-3xl p-5">
          {canEdit && deposit ? (
            <DepositForm
              mode="edit"
              currentProfile={profile}
              members={formMembers}
              settings={settings}
              deposit={deposit}
              receiptUrl={receiptUrl}
              returnTo="/deposits/history"
            />
          ) : (
            <EmptyState
              icon={PiggyBank}
              title="Deposit cannot be edited"
              description={
                deposit?.status === "APPROVED"
                  ? "Approved deposits are locked."
                  : "Only your own pending deposits can be edited before approval."
              }
            />
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add deposit"
        description="The amount is calculated from assigned shares and the current share price at submit time."
      />
      <section className="panel max-w-3xl p-5">
        {activeMembers.length ? (
          <DepositForm mode="create" currentProfile={profile} members={activeMembers} settings={settings} />
        ) : (
          <EmptyState icon={PiggyBank} title="No active members" description="Activate a member before adding deposits." />
        )}
      </section>
    </>
  );
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function memberListForEdit(allMembers: Profile[], activeMembers: Profile[], memberId?: string) {
  const memberIsActive = activeMembers.some((member) => member.id === memberId);

  if (!memberId || memberIsActive) {
    return activeMembers.length ? activeMembers : allMembers;
  }

  const editMember = allMembers.find((member) => member.id === memberId);
  return editMember ? [editMember, ...activeMembers] : activeMembers;
}
