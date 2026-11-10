"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { inputLargeClass, submitButtonClass } from "@/components/ui/styles";
import type { SubscriptionState } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/client";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface DepositFormProps {
  plan: SubscriptionPlan | null;
  state: SubscriptionState;
}

const INTRO: Partial<Record<SubscriptionState, string>> = {
  expired: "Your subscription expired — renew by submitting a new deposit.",
  rejected: "Your previous request was rejected — you can submit a new one.",
};

/** Records a deposit as a pending subscription for an admin to approve. */
export function DepositForm({ plan, state }: DepositFormProps) {
  const router = useRouter();
  const [paidFrom, setPaidFrom] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!plan) return setError("Choose a subscription plan.");
    if (!paidFrom.trim() || !reference.trim()) {
      return setError("Enter the number you paid from and the transaction reference.");
    }
    if (submitting) return;

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      return setError("Your session expired. Please sign in again.");
    }

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      amount: plan.amount,
      paid_from: paidFrom.trim(),
      reference: reference.trim(),
      note: note.trim() || null,
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You already have a request awaiting approval.");
      } else if (insertError.message?.includes("unknown subscription plan")) {
        setError("Subscription plans changed — reload the page and pick again.");
      } else {
        setError(`Could not submit: ${insertError.message}`);
      }
      return;
    }

    setPaidFrom("");
    setReference("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h2 className="font-semibold mb-1">Submit your deposit</h2>
      <p className="text-sm text-muted mb-5">
        {INTRO[state] ?? "Tell us where you sent the money so the admin can match it."}
      </p>

      <div className="space-y-4">
        <Field label="Number you paid from">
          <input
            type="tel"
            value={paidFrom}
            onChange={(e) => setPaidFrom(e.target.value)}
            className={inputLargeClass}
          />
        </Field>
        <Field label="Transaction reference / code">
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputLargeClass}
          />
        </Field>
        <Field label="Note" optional>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className={inputLargeClass}
          />
        </Field>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !plan}
          className={submitButtonClass}
        >
          {submitting
            ? "Submitting..."
            : plan
              ? `Submit ${formatUgx(plan.amount)} deposit`
              : "Choose a plan first"}
        </button>

        <p className="text-xs text-muted">
          Your videos stay locked until an admin approves your deposit.
        </p>
      </div>
    </div>
  );
}
