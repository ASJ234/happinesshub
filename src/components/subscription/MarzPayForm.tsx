"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { PhoneField } from "@/components/ui/PhoneField";
import { submitButtonClass } from "@/components/ui/styles";
import { phoneProblem } from "@/lib/phone";
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!plan) return setError("Choose a subscription plan.");
    const problem = phoneProblem(phone);
    if (problem) {
      setPhoneError(problem);
      phoneRef.current?.focus();
      phoneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
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
      noValidate
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
        <PhoneField
          ref={phoneRef}
          label="MTN or Airtel number"
          value={phone}
          onChange={(value) => {
            setPhone(value);
            setPhoneError(null);
          }}
          error={phoneError}
          large
        />

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
