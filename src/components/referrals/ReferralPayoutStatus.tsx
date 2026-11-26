import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ReferralPayoutStatus as Status } from "@/lib/referrals";

const LABELS: Record<Status, string> = {
  pending: "Pending review",
  paid: "Paid",
  rejected: "Rejected",
};

/** The status pill for a referral withdrawal, shared by creator and admin views. */
export function ReferralPayoutStatus({ status }: { status: Status }) {
  return <StatusBadge status={LABELS[status] ?? status} />;
}
