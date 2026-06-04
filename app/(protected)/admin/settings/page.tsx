import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const settings = await getSettings(supabase);

  return (
    <>
      <PageHeader title="Settings" description="Share price changes apply to future deposits only." />
      <section className="panel max-w-2xl p-5">
        <SettingsForm settings={settings} />
        <div className="mt-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Current expected deposit per share is {formatCurrency(settings.share_price, settings.currency)}. Existing
            deposits keep their stored share count and share price snapshots.
          </p>
        </div>
      </section>
    </>
  );
}
