"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { inputLargeClass, submitButtonClass } from "@/components/ui/styles";
import type { SubscriptionState } from "@/lib/subscriptions";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface PaymentLinkFormProps {
  plan: SubscriptionPlan | null;
  state: SubscriptionState;
}

const INTRO: Partial<Record<SubscriptionState, string>> = {
  expired: "Your subscription expired — pay again to renew it.",
  rejected: "Your previous payment couldn't be confirmed — you can pay again.",
  failed: "Your last payment didn't go through — you can try again.",
};

/** Sends the subscriber to the plan's MarzPay payment page. */
export function PaymentLinkForm({ plan, state }: PaymentLinkFormProps) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!plan) return setError("Choose a subscription plan.");
    if (!phone.trim()) return setError("Enter the number you'll pay from.");
    if (submitting) return;

    setSubmitting(true);
    const response = await fetch("/api/subscriptions/payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: plan.id, phone }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);

    if (!response?.ok || !body?.url) {
      setSubmitting(false);
      return setError(body?.error ?? "Could not start the payment. Try again.");
    }
    window.location.href = body.url;
  }

  const unavailable = plan !== null && !plan.payment_link;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-6 max-w-lg"
    >
      <div className="flex items-center gap-2 mb-1">
        <Smartphone size={18} className="text-primary" />
        <h2 className="font-semibold">Pay with MTN or Airtel</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        {INTRO[state] ??
          "You'll go to MarzPay's secure page to pay. Use the same number you enter here so we can match your payment."}
      </p>

      <div className="space-y-4">
        <Field label="Number you'll pay from" hint="e.g. 0772123456">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputLargeClass}
          />
        </Field>

        {unavailable && (
          <Alert tone="error">This plan can&apos;t be paid online yet. Please contact support.</Alert>
        )}
        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="submit"
          disabled={submitting || !plan || unavailable}
          className={submitButtonClass}
        >
          {submitting
            ? "Opening MarzPay..."
            : plan
              ? `Pay ${formatUgx(plan.amount)}`
              : "Choose a plan first"}
        </button>

        <p className="text-xs text-muted">
          Payments are processed by MarzPay. Your padlocks open once your payment
          is confirmed.
        </p>
      </div>
    </form>
  );
}
