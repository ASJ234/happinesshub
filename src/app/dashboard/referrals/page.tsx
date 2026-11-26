import { BadgeCheck, Banknote, Gift, UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fetchReferralPayouts,
  fetchReferralSummary,
  fetchUnredeemedReferrals,
  REFERRAL_BLOCK_REWARD,
  REFERRAL_BLOCK,
  referralLink,
} from "@/lib/referrals";
import { fetchPayoutAccount, money } from "@/lib/wallet";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralLinkCard } from "@/components/referrals/ReferralLinkCard";
import { ReferralProgress } from "@/components/referrals/ReferralProgress";
import { PaidReferralList } from "@/components/referrals/PaidReferralList";
import { ReferralPayoutHistory } from "@/components/referrals/ReferralPayoutHistory";

export default async function ReferralsPage() {
  const user = await requireRole("creator");
  const supabase = await createClient();

  const [summary, referrals, payouts, savedAccount] = await Promise.all([
    fetchReferralSummary(supabase, user.id),
    fetchUnredeemedReferrals(supabase, user.id),
    fetchReferralPayouts(supabase, user.id, 20),
    fetchPayoutAccount(supabase, user.id),
  ]);
  const pending = payouts.find((payout) => payout.status === "pending") ?? null;

  const withdrawnTotal = (summary.redeemed / REFERRAL_BLOCK) * REFERRAL_BLOCK_REWARD;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserPlus className="text-primary" size={28} />}
        title="Referrals"
        description={`Earn ${money(REFERRAL_BLOCK_REWARD)} for every ${REFERRAL_BLOCK} people who join through you and pay`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Paid referrals" value={summary.unredeemed.toLocaleString()} icon={BadgeCheck} />
        <StatCard label="Ready to withdraw" value={money(summary.redeemable)} icon={Gift} />
        <StatCard label="Withdrawn so far" value={money(withdrawnTotal)} icon={Banknote} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReferralLinkCard link={referralLink(user.username)} />
        <ReferralProgress summary={summary} pending={pending} savedAccount={savedAccount} />
      </div>

      <PaidReferralList referrals={referrals} total={summary.unredeemed} />

      <ReferralPayoutHistory payouts={payouts} />
    </div>
  );
}
