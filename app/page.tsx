import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const errorCode = stringParam(params.error_code);
  const error = stringParam(params.error);

  if (errorCode || error) {
    redirect(`/login?error=${encodeURIComponent(errorCode || error)}`);
  }

  redirect("/dashboard");
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
