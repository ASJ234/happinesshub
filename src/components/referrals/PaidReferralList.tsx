import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaidReferral } from "@/lib/referrals";

interface PaidReferralListProps {
  referrals: PaidReferral[];
  /** All paid referrals not withdrawn yet; may exceed the rows shown. */
  total: number;
}

/** Paid referrals that still count towards the next withdrawal. */
export function PaidReferralList({ referrals, total }: PaidReferralListProps) {
  if (total === 0) {
    return (
      <EmptyState icon={Users}>
        No paid referrals yet. They show up here once someone you invited pays
        for a subscription.
      </EmptyState>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">
        Paid referrals <span className="text-muted font-normal">({total})</span>
      </h2>
      <ul>
        {referrals.map((referral) => (
          <li
            key={referral.referredId}
            className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">
                {referral.displayName || referral.username}
              </p>
              <p className="text-xs text-muted">@{referral.username}</p>
            </div>
            <span className="text-xs text-muted shrink-0 text-right">
              Paid {new Date(referral.paidAt).toLocaleDateString()}
              {referral.held && (
                <span className="block text-yellow-400">Withdrawal pending</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {total > referrals.length && (
        <p className="text-xs text-muted mt-3">
          Showing the newest {referrals.length} of {total}.
        </p>
      )}
    </Card>
  );
}
