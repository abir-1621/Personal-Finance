import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deposit } from "@/lib/types";

export const RECEIPT_BUCKET = "deposit-receipts";
export const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp";

export async function getReceiptUrl(client: SupabaseClient, path: string | null) {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 10 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function getReceiptUrlMap(client: SupabaseClient, deposits: Deposit[]) {
  const entries = await Promise.all(
    deposits.map(async (deposit) => [deposit.id, await getReceiptUrl(client, deposit.receipt_path)] as const)
  );

  return new Map(entries);
}
