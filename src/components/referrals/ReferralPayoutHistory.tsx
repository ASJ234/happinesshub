import { Card } from "@/components/ui/Card";
import { payoutMethodLabel, type ReferralPayoutRow } from "@/lib/referrals";
import { money } from "@/lib/wallet";
import { ReferralPayoutStatus } from "./ReferralPayoutStatus";

/** A creator's past and pending referral withdrawals. */
export function ReferralPayoutHistory({ payouts }: { payouts: ReferralPayoutRow[] }) {
  if (payouts.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">Withdrawals</h2>
      <ul>
        {payouts.map((payout) => (
          <li
            key={payout.id}
            className="flex items-center justify-between gap-3 text-sm border-b border-border last:border-0 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {money(payout.amount)}{" "}
                <span className="text-muted font-normal">· {payout.referrals} referrals</span>
              </p>
              <p className="text-xs text-muted">
                {new Date(payout.created_at).toLocaleDateString()} · {payout.account} (
                {payoutMethodLabel(payout.method)})
              </p>
            </div>
            <ReferralPayoutStatus status={payout.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
