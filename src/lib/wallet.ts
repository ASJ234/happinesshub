import type { SupabaseClient } from "@supabase/supabase-js";

export type WalletTransactionKind =
  | "pool"
  | "gift"
  | "withdrawal"
  | "refund"
  | "adjustment";

export type WithdrawalStatus = "pending" | "paid" | "rejected";

export interface WalletSummary {
  balance: number;
  lifetimeEarnings: number;
}

export interface WalletTransactionRow {
  id: number;
  user_id: string;
  kind: WalletTransactionKind;
  amount: number;
  period: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
}

export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  account: string;
  status: WithdrawalStatus;
  note: string | null;
  created_at: string;
  user: { username: string; display_name: string | null } | null;
}

export async function fetchWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<WalletSummary> {
  const { data } = await supabase
    .from("wallets")
    .select("balance, lifetime_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    balance: Number(data?.balance ?? 0),
    lifetimeEarnings: Number(data?.lifetime_earnings ?? 0),
  };
}

export async function fetchTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<WalletTransactionRow[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, kind, amount, period, reference, note, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`[wallet] transactions failed: ${error.message}`);
    return [];
  }

  return (data ?? []) as WalletTransactionRow[];
}

export async function fetchWithdrawals(
  supabase: SupabaseClient,
  userId?: string
): Promise<WithdrawalRow[]> {
  let query = supabase
    .from("withdrawal_requests")
    .select(
      "id, user_id, amount, method, account, status, note, created_at, user:user_id(username, display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    console.warn(`[wallet] withdrawals failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const withdrawal = row as Omit<WithdrawalRow, "user"> & {
      user: WithdrawalRow["user"] | WithdrawalRow["user"][];
    };
    return {
      ...withdrawal,
      user: Array.isArray(withdrawal.user)
        ? (withdrawal.user[0] ?? null)
        : (withdrawal.user ?? null),
    };
  }) as WithdrawalRow[];
}

export function transactionLabel(kind: WalletTransactionKind): string {
  switch (kind) {
    case "pool":
      return "Monthly pool";
    case "gift":
      return "Gift income";
    case "withdrawal":
      return "Withdrawal";
    case "refund":
      return "Refund";
    default:
      return "Adjustment";
  }
}

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}
