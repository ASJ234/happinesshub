import { Coins } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { PayoutRunner } from "@/components/admin/PayoutRunner";
import { WithdrawalTable } from "@/components/admin/WithdrawalTable";
import { ReferralPayoutTable } from "@/components/admin/ReferralPayoutTable";
import { fetchReferralPayouts } from "@/lib/referrals";
import { fetchWithdrawals, money } from "@/lib/wallet";

export default async function AdminWalletPage() {
  await requireRole("admin");

  const supabase = await createClient();

  const [withdrawals, settings, wallets, referralPayouts] = await Promise.all([
    fetchWithdrawals(supabase),
    supabase
      .from("app_settings")
      .select("monthly_pool")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("wallets").select("balance, user_id"),
    fetchReferralPayouts(supabase),
  ]);

  const poolAmount = Number(settings.data?.monthly_pool ?? 0);
  const totalHeld = (wallets.data ?? []).reduce(
    (sum, row) => sum + Number(row.balance ?? 0),
    0
  );
  const pending = withdrawals.filter((w) => w.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Coins className="text-primary" size={28} />}
        title="Wallets"
        description="Pay creators, run the monthly pool and handle withdrawals"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Monthly pool"
          value={money(poolAmount)}
          icon={Coins}
        />
        <StatCard
          label="Creator balances"
          value={money(totalHeld)}
          icon={Coins}
        />
        <StatCard
          label="Withdrawals waiting"
          value={pending.length.toLocaleString()}
          icon={Coins}
        />
      </div>

      <PayoutRunner poolAmount={poolAmount} />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Withdrawal requests</h2>
          <p className="text-xs text-muted mt-0.5">
            The amount is already held. Rejecting returns it to the creator.
          </p>
        </div>
        <WithdrawalTable withdrawals={withdrawals} />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Referral withdrawals</h2>
          <p className="text-xs text-muted mt-0.5">
            Send the amount to the number shown, then mark it paid. That marks
            the creator&apos;s referrals as withdrawn. Rejecting makes them count again.
          </p>
        </div>
        <ReferralPayoutTable payouts={referralPayouts} />
      </Card>
    </div>
  );
}
