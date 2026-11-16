import type { SupabaseClient } from "@supabase/supabase-js";

export interface GiftTopUpPackage {
  id: string;
  amount: number;
  payment_link: string | null;
  sort_order: number;
}

export interface PendingGiftTopUp {
  id: string;
  amount: number;
  paid_from: string;
  method: "manual" | "link";
  created_at: string;
}

export interface GiftTopUpState {
  packages: GiftTopUpPackage[];
  pending: PendingGiftTopUp | null;
}

export async function fetchGiftTopUpPackages(
  supabase: SupabaseClient
): Promise<GiftTopUpPackage[]> {
  const { data, error } = await supabase
    .from("gift_topup_packages")
    .select("id, amount, payment_link, sort_order")
    .order("sort_order")
    .order("amount");
  if (error) {
    console.warn(`[gift-topups] packages fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
}

/** The packages on offer and the viewer's top-up awaiting confirmation. */
export async function fetchGiftTopUpState(
  supabase: SupabaseClient,
  userId: string
): Promise<GiftTopUpState> {
  const [packages, pending] = await Promise.all([
    fetchGiftTopUpPackages(supabase),
    supabase
      .from("gift_deposits")
      .select("id, amount, paid_from, method, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  return {
    packages: packages.filter((p) => p.payment_link),
    pending: pending.data
      ? { ...pending.data, amount: Number(pending.data.amount) }
      : null,
  };
}
