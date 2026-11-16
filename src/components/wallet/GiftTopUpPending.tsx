"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import type { PendingGiftTopUp } from "@/lib/gift-topups";
import { formatUgx } from "@/lib/videos";

const REFRESH_MS = 15_000;

interface GiftTopUpPendingProps {
  pending: PendingGiftTopUp;
  paymentLink: string | null;
}

/** A gift top-up waiting for its payment to be confirmed. */
export function GiftTopUpPending({ pending, paymentLink }: GiftTopUpPendingProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const isLink = pending.method === "link";

  // Picks up the confirmation without the viewer reloading.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  async function cancel() {
    setCancelling(true);
    await fetch("/api/gifts/payment-link", { method: "DELETE" }).catch(() => null);
    router.refresh();
  }

  return (
    <div className="bg-surface border-2 border-yellow-500/40 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/15 text-yellow-400 flex items-center justify-center">
          <Clock size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-yellow-400">
            {formatUgx(pending.amount)} top-up awaiting confirmation
          </h2>
          <p className="text-xs text-muted">
            Your credit is added once the payment is confirmed. This updates by itself.
          </p>
        </div>
      </div>

      {isLink && (
        <Alert tone="info">
          Pay from <b>{pending.paid_from}</b>, the number you entered. A payment
          from any other number can&apos;t be matched to your account.
        </Alert>
      )}

      {isLink && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {paymentLink && (
            <a href={paymentLink} className="text-primary hover:underline">
              Haven&apos;t paid yet? Open the payment page
            </a>
          )}
          <button
            onClick={cancel}
            disabled={cancelling}
            className="text-muted hover:text-foreground disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel and choose another amount"}
          </button>
        </div>
      )}
    </div>
  );
}
