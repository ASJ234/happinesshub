import { cache } from "react";
import { getCurrentUser } from "./auth";
import { countPendingReferralPayouts } from "./referrals";
import { createClient } from "./supabase/server";

/** Something waiting for an admin, shown in the bell, nav badges and overview. */
export interface AdminAlert {
  /** Where the admin deals with it. */
  href: string;
  /** The admin tab or nav item whose badge counts it. */
  tab: string;
  label: string;
  count: number;
}

export const ADMIN_HREF = "/dashboard/admin";
export const REFERRAL_WITHDRAWALS_ANCHOR = "referral-withdrawals";

/**
 * Alerts with a count above zero for the signed-in admin; empty for anyone
 * else. Cached per request, so the layouts and the page share one query.
 */
export const getAdminAlerts = cache(async function getAdminAlerts(): Promise<AdminAlert[]> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return [];

  const supabase = await createClient();
  const referralWithdrawals = await countPendingReferralPayouts(supabase);

  const alerts: AdminAlert[] = [
    {
      href: `${ADMIN_HREF}/wallet#${REFERRAL_WITHDRAWALS_ANCHOR}`,
      tab: `${ADMIN_HREF}/wallet`,
      label:
        referralWithdrawals === 1
          ? "1 referral withdrawal waiting"
          : `${referralWithdrawals} referral withdrawals waiting`,
      count: referralWithdrawals,
    },
  ];
  return alerts.filter((alert) => alert.count > 0);
});

/** Badge counts keyed by href: each alert's tab, plus the Admin nav item for the total. */
export function alertBadges(alerts: AdminAlert[]): Record<string, number> {
  const badges: Record<string, number> = {};
  for (const alert of alerts) {
    badges[alert.tab] = (badges[alert.tab] ?? 0) + alert.count;
    badges[ADMIN_HREF] = (badges[ADMIN_HREF] ?? 0) + alert.count;
  }
  return badges;
}
