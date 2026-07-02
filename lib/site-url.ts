import "server-only";

import { headers } from "next/headers";

export async function getSiteUrl() {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  const vercelProductionUrl = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (vercelProductionUrl) {
    return vercelProductionUrl;
  }

  const vercelUrl = normalizeUrl(process.env.VERCEL_URL);

  if (vercelUrl) {
    return vercelUrl;
  }

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  return "http://localhost:3000";
}

export function passwordResetRedirectUrl(siteUrl: string) {
  return `${siteUrl}/auth/confirm`;
}

function normalizeUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
