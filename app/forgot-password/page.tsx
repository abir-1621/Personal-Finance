import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const { profile } = await getCurrentProfile();

  if (profile) {
    redirect(profile.must_change_password ? "/change-password" : "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white">
            RP
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your account email and we will send a secure reset link.</p>
        </div>
        <div className="panel p-6">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
