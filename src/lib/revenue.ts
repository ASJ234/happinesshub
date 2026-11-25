import type { SupabaseClient } from "@supabase/supabase-js";

/** Money that actually came in, split by where it came from. */
export interface RevenueTotals {
  subscriptions: number;
  giftCredit: number;
  total: number;
  /** Collected since the 1st of the current month. */
  thisMonth: number;
  payments: number;
}

/** Kampala is UTC+3 all year round (Uganda has no daylight saving). */
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Midnight on the 1st of the current month in Kampala, as a UTC instant. */
function kampalaMonthStart(now: Date): Date {
  const kampala = new Date(now.getTime() + KAMPALA_OFFSET_MS);
  return new Date(
    Date.UTC(kampala.getUTCFullYear(), kampala.getUTCMonth(), 1) -
      KAMPALA_OFFSET_MS
  );
}

/** Supabase returns at most this many rows per request. */
const PAGE_SIZE = 1000;

interface PaidRow {
  amount: number | string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Reads every row of `table` with the given status a page at a time and
 * adds up the amounts. Approval time (reviewed_at) is when the money was
 * confirmed, so it decides which month a payment counts towards.
 */
async function sumPaid(
  supabase: SupabaseClient,
  table: "subscriptions" | "gift_deposits",
  status: string,
  monthStart: Date
) {
  let total = 0;
  let thisMonth = 0;
  let payments = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("amount, reviewed_at, created_at")
      .eq("status", status)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn(`[revenue] ${table} totals failed: ${error.message}`);
      break;
    }
    for (const row of (data ?? []) as PaidRow[]) {
      const amount = Number(row.amount ?? 0);
      total += amount;
      payments += 1;
      if (new Date(row.reviewed_at ?? row.created_at) >= monthStart) {
        thisMonth += amount;
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  return { total, thisMonth, payments };
}

/**
 * Totals of approved subscription payments and gift credit top-ups.
 * Pending, rejected, failed, cancelled and revoked payments are left out.
 */
export async function fetchRevenueTotals(
  supabase: SupabaseClient
): Promise<RevenueTotals> {
  const monthStart = kampalaMonthStart(new Date());

  const [subs, gifts] = await Promise.all([
    sumPaid(supabase, "subscriptions", "active", monthStart),
    sumPaid(supabase, "gift_deposits", "approved", monthStart),
  ]);

  return {
    subscriptions: subs.total,
    giftCredit: gifts.total,
    total: subs.total + gifts.total,
    thisMonth: subs.thisMonth + gifts.thisMonth,
    payments: subs.payments + gifts.payments,
  };
}
