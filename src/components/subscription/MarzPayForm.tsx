"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { inputLargeClass, submitButtonClass } from "@/components/ui/styles";
import type { SubscriptionState } from "@/lib/subscriptions";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface MarzPayFormProps {
  plan: SubscriptionPlan | null;
  state: SubscriptionState;
}

const INTRO: Partial<Record<SubscriptionState, string>> = {
  expired: "Your subscription expired — pay again to renew it.",
  rejected: "Your previous request was rejected — you can pay again.",
  failed: "Your last payment didn't go through — you can try again.",
};

/** Sends a MarzPay mobile money prompt for the chosen plan. */
export function MarzPayForm({ plan, state }: MarzPayFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!plan) return setError("Choose a subscription plan.");
    if (!phone.trim()) return setError("Enter the number to pay from.");
    if (submitting) return;

    setSubmitting(true);
    const response = await fetch("/api/subscriptions/marzpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: plan.id, phone }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setSubmitting(false);

    if (!response?.ok) {
      return setError(body?.error ?? "Could not start the payment. Try again.");
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-6 max-w-lg"
    >
      <div className="flex items-center gap-2 mb-1">
        <Smartphone size={18} className="text-primary" />
        <h2 className="font-semibold">Pay with mobile money</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        {INTRO[state] ??
          "We'll send a payment prompt to your phone. Approve it with your PIN and your padlocks open straight away."}
      </p>

      <div className="space-y-4">
        <Field label="MTN or Airtel number" hint="e.g. 0772123456">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputLargeClass}
          />
        </Field>

        {error && <Alert tone="error">{error}</Alert>}

        <button type="submit" disabled={submitting || !plan} className={submitButtonClass}>
          {submitting
            ? "Sending prompt..."
            : plan
              ? `Pay ${formatUgx(plan.amount)}`
              : "Choose a plan first"}
        </button>

        <p className="text-xs text-muted">Payments are processed by MarzPay.</p>
      </div>
    </form>
  );
}
