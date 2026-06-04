import { PiggyBank } from "lucide-react";
import { DepositForm } from "@/components/deposit-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getSettings, listMembers } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export default async function AddDepositPage() {
  const { supabase, profile } = await requireUser();
  const settings = await getSettings(supabase);
  const members = profile.role === "ADMIN" ? (await listMembers(supabase)).filter((member) => member.is_active) : [profile];

  return (
    <>
      <PageHeader
        title="Add deposit"
        description="The amount is calculated from assigned shares and the current share price at submit time."
      />
      <section className="panel max-w-3xl p-5">
        {members.length ? (
          <DepositForm mode="create" currentProfile={profile} members={members} settings={settings} />
        ) : (
          <EmptyState icon={PiggyBank} title="No active members" description="Activate a member before adding deposits." />
        )}
      </section>
    </>
  );
}
