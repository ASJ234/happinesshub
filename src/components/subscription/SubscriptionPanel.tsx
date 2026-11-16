"use client";

import { useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { SubscriptionRecord, SubscriptionState } from "@/lib/subscriptions";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";
import { MarzPayForm } from "./MarzPayForm";
import { MarzPayPending } from "./MarzPayPending";
import { PlanPicker } from "./PlanPicker";
import { StatusCard } from "./StatusCard";

interface SubscriptionPanelProps {
  latest: SubscriptionRecord | null;
  plans: SubscriptionPlan[];
  state: SubscriptionState;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 max-w-lg text-sm text-muted">
      {children}
    </div>
  );
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** The viewer's subscription: its status, or the plan picker and payment form. */
export function SubscriptionPanel({
  latest,
  plans,
  state,
}: SubscriptionPanelProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const latestPlan = plans.find((p) => p.id === latest?.plan_id) ?? null;
  // The prompt the subscriber gave up on; a new one shows its own pending card.
  const [abandonedId, setAbandonedId] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <Notice>Subscription plans are not configured yet. Please check back soon.</Notice>
    );
  }

  if (state === "active" && latest) {
    return (
      <StatusCard
        tone="green"
        icon={CheckCircle2}
        title="Subscription active"
        subtitle="All padlocks are open — enjoy every video."
        rows={[
          ["Plan", latestPlan?.name ?? latest.plan_id],
          ["Amount", formatUgx(latest.amount)],
          ["Reference", latest.reference],
          ["Expires", formatExpiry(latest.expires_at)],
        ]}
      />
    );
  }

  if (state === "pending" && latest?.method === "marzpay" && latest.id !== abandonedId) {
    return (
      <MarzPayPending
        latest={latest}
        planName={latestPlan?.name ?? latest.plan_id}
        onRetry={() => setAbandonedId(latest.id)}
      />
    );
  }

  if (state === "pending" && latest?.method !== "marzpay" && latest) {
    return (
      <StatusCard
        tone="yellow"
        icon={Clock}
        title="Waiting for admin approval"
        subtitle="Your deposit is being reviewed. Padlocks open once approved."
        rows={[
          ["Plan", latestPlan?.name ?? "—"],
          ["Amount sent", formatUgx(latest.amount)],
          ["Paid from", latest.paid_from],
          ["Reference", latest.reference],
          ["Submitted", new Date(latest.created_at).toLocaleString()],
        ]}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-semibold mb-1">Choose your plan</h2>
        <p className="text-sm text-muted mb-4">
          Your padlocks open as soon as you approve the payment on your phone,
          and stay open until the plan expires.
        </p>
        <PlanPicker
          plans={plans}
          selectedId={selectedPlanId}
          onSelect={setSelectedPlanId}
        />
      </div>

      <MarzPayForm plan={selectedPlan} state={state} />
    </div>
  );
}
