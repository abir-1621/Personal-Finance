import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { LogoMark } from "@/components/brand-logo";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { profile } = await getCurrentProfile();
  const params = (await searchParams) ?? {};
  const error = stringParam(params.error);

  if (profile) {
    redirect(profile.must_change_password ? "/change-password" : "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Friends &amp; Fund</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in with the account created by your admin.</p>
        </div>
        <div className="panel p-6">
          {error ? <ResetLinkError error={error} /> : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

function ResetLinkError({ error }: { error: string }) {
  const message =
    error === "otp_expired" || error === "reset-link"
      ? "That password reset link is invalid or has expired. Request a fresh reset link and use the newest email."
      : "The sign-in link could not be used. Please request a fresh password reset link.";

  return <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>;
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
