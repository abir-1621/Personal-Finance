import { ChangePasswordForm } from "@/app/change-password/change-password-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  await requireUser({ allowPasswordChange: true });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            PW
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Change your password</h1>
          <p className="mt-2 text-sm text-slate-500">Create a private password before entering the tracker.</p>
        </div>
        <div className="panel p-6">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
