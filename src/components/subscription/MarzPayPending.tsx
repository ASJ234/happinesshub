"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { MARZPAY_STALE_MS, type SubscriptionRecord } from "@/lib/subscriptions";
import { formatUgx } from "@/lib/videos";
import { StatusCard } from "./StatusCard";

const POLL_MS = 4000;

interface MarzPayPendingProps {
  latest: SubscriptionRecord;
  planName: string;
  /** Shown once the prompt has gone unanswered for a while. */
  onRetry: () => void;
}

/** "Check your phone" while a MarzPay prompt waits, polling until it settles. */
export function MarzPayPending({ latest, planName, onRetry }: MarzPayPendingProps) {
  const router = useRouter();
  const createdAt = new Date(latest.created_at).getTime();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      setStale(Date.now() - createdAt > MARZPAY_STALE_MS);
      const response = await fetch("/api/subscriptions/marzpay").catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!cancelled && body?.status && body.status !== "pending") {
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [createdAt, router]);

  return (
    <div className="space-y-3 max-w-lg">
      <StatusCard
        tone="yellow"
        icon={Smartphone}
        title="Check your phone"
        subtitle="Approve the mobile money prompt with your PIN. This page updates by itself."
        rows={[
          ["Plan", planName],
          ["Amount", formatUgx(latest.amount)],
          ["Paying from", latest.paid_from],
        ]}
      />
      {stale && (
        <p className="text-sm text-muted">
          No prompt?{" "}
          <button onClick={onRetry} className="text-primary hover:underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
