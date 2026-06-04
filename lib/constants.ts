import type { Setting } from "@/lib/types";

export const DEFAULT_SHARE_PRICE = 5000;
export const DEFAULT_CURRENCY = "NOK";

export const FALLBACK_SETTINGS: Setting = {
  id: "fallback",
  share_price: DEFAULT_SHARE_PRICE,
  currency: DEFAULT_CURRENCY,
  updated_by: null,
  updated_at: new Date(0).toISOString()
};
