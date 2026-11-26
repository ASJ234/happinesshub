import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import {
  payoutMethodLabel,
  REFERRAL_BLOCK,
  REFERRAL_BLOCK_REWARD,
  type ReferralPayoutRow,
  type ReferralSummary,
} from "@/lib/referrals";
import { money, type PayoutAccount } from "@/lib/wallet";
import { ReferralPayoutForm } from "./ReferralPayoutForm";

interface ReferralProgressProps {
  summary: ReferralSummary;
  /** The withdrawal waiting for an admin, if any. */
  pending: ReferralPayoutRow | null;
  savedAccount: PayoutAccount | null;
}

/** Progress towards the next block of 100 and the withdrawal request. */
export function ReferralProgress({ summary, pending, savedAccount }: ReferralProgressProps) {
  const toNext = REFERRAL_BLOCK - summary.carryOver;
  const percent = Math.round((summary.carryOver / REFERRAL_BLOCK) * 100);
  const withdrawCount = summary.blocks * REFERRAL_BLOCK;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Withdraw</h2>
        <p className="text-sm text-muted">
          Every {REFERRAL_BLOCK} paid referrals earn {money(REFERRAL_BLOCK_REWARD)}.
          Only full blocks of {REFERRAL_BLOCK} can be withdrawn; the rest carry over.
        </p>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>
            {summary.carryOver} / {REFERRAL_BLOCK} towards the next reward
          </span>
          <span>{toNext} to go</span>
        </div>
        <div
          className="h-2 rounded-full bg-surface-elevated overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={REFERRAL_BLOCK}
          aria-valuenow={summary.carryOver}
        >
          <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {pending ? (
        <Alert tone="info">
          {money(pending.amount)} for {pending.referrals} referrals is waiting for an
          admin to send it to {pending.account} ({payoutMethodLabel(pending.method)}).
          Your count updates once it is paid.
        </Alert>
      ) : summary.blocks > 0 ? (
        <>
          <p className="text-sm">
            <span className="font-medium">{withdrawCount}</span> of your paid referrals are
            ready ({money(summary.redeemable)}).
            {summary.carryOver > 0 &&
              ` ${summary.carryOver} will stay here towards the next ${REFERRAL_BLOCK}.`}
          </p>
          <ReferralPayoutForm
            redeemable={summary.redeemable}
            count={withdrawCount}
            savedAccount={savedAccount}
          />
        </>
      ) : (
        <p className="text-sm text-muted">
          You can withdraw once you reach {REFERRAL_BLOCK} paid referrals.
        </p>
      )}
    </Card>
  );
}
