import { AppLayout } from "@/components/app-layout";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();

  return <AppLayout profile={profile}>{children}</AppLayout>;
}
