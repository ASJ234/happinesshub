import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "./site-url";

/** Paid referrals per withdrawal block. Also enforced by request_referral_payout(). */
export const REFERRAL_BLOCK = 100;
/** UGX paid for each full block. Also enforced by request_referral_payout(). */
export const REFERRAL_BLOCK_REWARD = 20000;

export type ReferralPayoutMethod = "mtn" | "airtel";
export type ReferralPayoutStatus = "pending" | "paid" | "rejected";

export const REFERRAL_PAYOUT_METHODS: { value: ReferralPayoutMethod; label: string }[] = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "airtel", label: "Airtel Money" },
];

export function payoutMethodLabel(method: string): string {
  return REFERRAL_PAYOUT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export interface ReferralSummary {
  /** Paid referrals not withdrawn yet (includes those held by a pending withdrawal). */
  unredeemed: number;
  /** Of those, the ones held by a withdrawal waiting for an admin. */
  held: number;
  /** Paid referrals already withdrawn. */
  redeemed: number;
  /** Full blocks the creator can ask to withdraw right now. */
  blocks: number;
  /** UGX the creator can ask for right now. */
  redeemable: number;
  /** Free referrals left over after every full block, towards the next one. */
  carryOver: number;
}

export interface PaidReferral {
  referredId: string;
  username: string;
  displayName: string | null;
  paidAt: string;
  /** Held by a withdrawal that is waiting for an admin. */
  held: boolean;
}

export interface ReferralPayoutRow {
  id: string;
  user_id: string;
  referrals: number;
  amount: number;
  method: ReferralPayoutMethod;
  account: string;
  status: ReferralPayoutStatus;
  created_at: string;
  reviewed_at: string | null;
  user: { username: string; display_name: string | null } | null;
}

export function referralLink(username: string): string {
  return `${SITE_URL}/login?ref=${encodeURIComponent(username)}`;
}

export function summarize(unredeemed: number, held: number, redeemed: number): ReferralSummary {
  const free = Math.max(unredeemed - held, 0);
  const blocks = Math.floor(free / REFERRAL_BLOCK);
  return {
    unredeemed,
    held,
    redeemed,
    blocks,
    redeemable: blocks * REFERRAL_BLOCK_REWARD,
    carryOver: free % REFERRAL_BLOCK,
  };
}

type PaidState = "unredeemed" | "held" | "redeemed";

async function countPaid(
  supabase: SupabaseClient,
  userId: string,
  state: PaidState
): Promise<number> {
  const query = supabase
    .from("referrals")
    .select("referred_id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .not("paid_at", "is", null)
    .filter("redeemed_at", state === "redeemed" ? "not.is" : "is", null);

  const { count, error } = await (state === "held"
    ? query.filter("payout_id", "not.is", null)
    : query);
  if (error) {
    console.warn(`[referrals] count failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

export async function fetchReferralSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<ReferralSummary> {
  const [unredeemed, held, redeemed] = await Promise.all([
    countPaid(supabase, userId, "unredeemed"),
    countPaid(supabase, userId, "held"),
    countPaid(supabase, userId, "redeemed"),
  ]);
  return summarize(unredeemed, held, redeemed);
}

/** Paid referrals not withdrawn yet, newest first. */
export async function fetchUnredeemedReferrals(
  supabase: SupabaseClient,
  userId: string,
  limit = 200
): Promise<PaidReferral[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("referred_id, paid_at, payout_id, referred:referred_id(username, display_name)")
    .eq("referrer_id", userId)
    .not("paid_at", "is", null)
    .is("redeemed_at", null)
    .order("paid_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`[referrals] list failed: ${error.message}`);
    return [];
  }

  type Profile = { username: string; display_name: string | null };
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as {
      referred_id: string;
      paid_at: string;
      payout_id: string | null;
      referred: Profile | Profile[] | null;
    };
    const profile = Array.isArray(r.referred) ? r.referred[0] : r.referred;
    return {
      referredId: r.referred_id,
      username: profile?.username ?? "user",
      displayName: profile?.display_name ?? null,
      paidAt: r.paid_at,
      held: r.payout_id !== null,
    };
  });
}

/** Referral withdrawals, newest first: one creator's, or everyone's for admins. */
export async function fetchReferralPayouts(
  supabase: SupabaseClient,
  userId?: string,
  limit = 100
): Promise<ReferralPayoutRow[]> {
  let query = supabase
    .from("referral_payouts")
    .select(
      "id, user_id, referrals, amount, method, account, status, created_at, reviewed_at, user:user_id(username, display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) {
    console.warn(`[referrals] payouts failed: ${error.message}`);
    return [];
  }

  type Profile = NonNullable<ReferralPayoutRow["user"]>;
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Omit<ReferralPayoutRow, "user"> & { user: Profile | Profile[] | null };
    return {
      ...r,
      amount: Number(r.amount),
      user: Array.isArray(r.user) ? (r.user[0] ?? null) : r.user,
    };
  });
}
