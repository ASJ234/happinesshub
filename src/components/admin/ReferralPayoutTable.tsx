"use client";

import { Banknote, X } from "lucide-react";
import { useConfirm } from "@/components/ui/useConfirm";
import { ReferralPayoutStatus } from "@/components/referrals/ReferralPayoutStatus";
import { readError } from "@/lib/fetch-error";
import { payoutMethodLabel, type ReferralPayoutRow } from "@/lib/referrals";
import { money } from "@/lib/wallet";

async function review(id: string, action: "pay" | "reject"): Promise<string | null> {
  try {
    const response = await fetch("/api/admin/referral-payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    return response.ok ? null : await readError(response, "Could not update the withdrawal");
  } catch {
    return "Can't reach the server. Check your connection and try again.";
  }
}

/** Referral withdrawals for the admin to send and mark paid, or reject. */
export function ReferralPayoutTable({ payouts }: { payouts: ReferralPayoutRow[] }) {
  const { ask, dialog } = useConfirm();

  if (payouts.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No referral withdrawals yet.
      </p>
    );
  }

  function confirmPay(payout: ReferralPayoutRow) {
    ask({
      title: `Mark ${money(payout.amount)} as paid?`,
      description: `Only do this after you have sent ${money(payout.amount)} to ${payout.account} (${payoutMethodLabel(payout.method)}). The creator's ${payout.referrals} referrals are then marked as withdrawn.`,
      confirmLabel: "Mark paid",
      busyLabel: "Saving…",
      action: () => review(payout.id, "pay"),
      refresh: true,
    });
  }

  function confirmReject(payout: ReferralPayoutRow) {
    ask({
      title: "Reject this withdrawal?",
      description: `Nothing is paid. The creator's ${payout.referrals} referrals count again and they can ask once more.`,
      confirmLabel: "Reject",
      busyLabel: "Rejecting…",
      action: () => review(payout.id, "reject"),
      refresh: true,
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">Creator</th>
            <th className="p-4 font-medium">Amount</th>
            <th className="p-4 font-medium">Referrals</th>
            <th className="p-4 font-medium">Send to</th>
            <th className="p-4 font-medium">Requested</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr
              key={payout.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                {payout.user?.display_name || payout.user?.username || "Unknown"}
                {payout.user?.username && (
                  <span className="block text-xs text-muted">@{payout.user.username}</span>
                )}
              </td>
              <td className="p-4 font-medium">{money(payout.amount)}</td>
              <td className="p-4 text-muted">{payout.referrals}</td>
              <td className="p-4 text-xs">
                <span className="font-medium">{payout.account}</span>
                <span className="block text-muted">{payoutMethodLabel(payout.method)}</span>
              </td>
              <td className="p-4 text-muted text-xs">
                {new Date(payout.created_at).toLocaleDateString()}
              </td>
              <td className="p-4">
                <ReferralPayoutStatus status={payout.status} />
              </td>
              <td className="p-4">
                {payout.status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => confirmPay(payout)}
                      className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium"
                    >
                      <Banknote size={13} />
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmReject(payout)}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      <X size={13} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dialog}
    </div>
  );
}
