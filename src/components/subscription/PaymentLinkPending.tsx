"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import type { SubscriptionRecord } from "@/lib/subscriptions";
import { formatUgx } from "@/lib/videos";
import { StatusCard } from "./StatusCard";

const REFRESH_MS = 15_000;

interface PaymentLinkPendingProps {
  latest: SubscriptionRecord;
  planName: string;
  paymentLink: string | null;
}

/** Waiting for a payment-link payment to be confirmed. */
export function PaymentLinkPending({ latest, planName, paymentLink }: PaymentLinkPendingProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  // Picks up the confirmation without the subscriber reloading.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  async function cancel() {
    setCancelling(true);
    await fetch("/api/subscriptions/payment-link", { method: "DELETE" }).catch(() => null);
    router.refresh();
  }

  return (
    <div className="space-y-3 max-w-lg">
      <StatusCard
        tone="yellow"
        icon={Clock}
        title="Waiting for payment confirmation"
        subtitle="Once your payment is confirmed, your padlocks open. This page updates by itself."
        rows={[
          ["Plan", planName],
          ["Amount", formatUgx(latest.amount)],
          ["Paying from", latest.paid_from],
          ["Started", new Date(latest.created_at).toLocaleString()],
        ]}
      />
      <Alert tone="info">
        Pay from <b>{latest.paid_from}</b>, the number you entered. A payment
        from any other number can&apos;t be matched to your account.
      </Alert>
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
          {cancelling ? "Cancelling..." : "Cancel and choose another plan"}
        </button>
      </div>
    </div>
  );
}
