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

/** Smallest withdrawal, in UGX. Also enforced by request_withdrawal(). */
export const MIN_WITHDRAWAL = 1000;

export type PayoutMethod = "mtn" | "airtel" | "bank";

export const PAYOUT_METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "airtel", label: "Airtel Money" },
  { value: "bank", label: "Bank transfer" },
];

export interface PayoutAccount {
  method: PayoutMethod;
  account: string;
}

/** The creator's payout details from their last withdrawal, if any. */
export async function fetchPayoutAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<PayoutAccount | null> {
  const { data, error } = await supabase
    .from("payout_accounts")
    .select("method, account")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[wallet] payout account failed: ${error.message}`);
    return null;
  }
  return (data as PayoutAccount | null) ?? null;
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

/** An amount in Ugandan shillings, e.g. "UGX 12,500". */
export function money(value: number): string {
  return `UGX ${Math.round(Number(value)).toLocaleString()}`;
}

/** A short amount for tight spaces, e.g. 500, 1K, 2.5K, 50K. */
export function compactMoney(value: number): string {
  const n = Number(value);
  if (n < 1000) return Math.round(n).toLocaleString();
  return `${Number((n / 1000).toFixed(1)).toLocaleString()}K`;
}
