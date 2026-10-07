"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  Phone,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

export interface PaymentSettings {
  id: boolean;
  account_name: string;
  phone_number: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  amount: number;
  plan_id: string;
  paid_from: string;
  reference: string;
  note: string | null;
  status: "pending" | "active" | "rejected";
  expires_at: string | null;
  created_at: string;
}

export type SubscriptionState =
  | "active"
  | "pending"
  | "rejected"
  | "expired"
  | "none";

interface SubscriptionPanelProps {
  settings: PaymentSettings | null;
  latest: SubscriptionRecord | null;
  plans: SubscriptionPlan[];
  state: SubscriptionState;
}

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

export function SubscriptionPanel({
  settings,
  latest,
  plans,
  state,
}: SubscriptionPanelProps) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [paidFrom, setPaidFrom] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const latestPlan = plans.find((p) => p.id === latest?.plan_id) ?? null;
  const expiresAt = latest?.expires_at ? new Date(latest.expires_at) : null;

  if (!settings) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 max-w-lg text-sm text-muted">
        Payment details have not been configured yet. Please check back soon.
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 max-w-lg text-sm text-muted">
        Subscription plans are not configured yet. Please check back soon.
      </div>
    );
  }

  if (state === "active" && latest) {
    return (
      <div className="bg-surface border-2 border-green-500/40 rounded-xl p-8 max-w-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-green-400">Subscription active</h2>
            <p className="text-xs text-muted">
              All padlocks are open — enjoy every video.
            </p>
          </div>
        </div>
        <dl className="text-sm text-muted space-y-1 border-t border-border pt-3">
          <div className="flex justify-between">
            <dt>Plan</dt>
            <dd className="text-foreground">
              {latestPlan?.name ?? `${latestPlan?.id ?? ""}`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Amount</dt>
            <dd className="text-foreground">{formatUgx(latest.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Reference</dt>
            <dd className="text-foreground">{latest.reference}</dd>
          </div>
          {expiresAt && (
            <div className="flex justify-between">
              <dt>Expires</dt>
              <dd className="text-foreground">
                {expiresAt.toLocaleDateString()}{" "}
                {expiresAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  if (state === "pending" && latest) {
    return (
      <div className="bg-surface border-2 border-yellow-500/40 rounded-xl p-8 max-w-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/15 text-yellow-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-yellow-400">
              Waiting for admin approval
            </h2>
            <p className="text-xs text-muted">
              Your deposit is being reviewed. Padlocks open once approved.
            </p>
          </div>
        </div>
        <dl className="text-sm text-muted space-y-1 border-t border-border pt-3">
          <div className="flex justify-between">
            <dt>Plan</dt>
            <dd className="text-foreground">{latestPlan?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Amount sent</dt>
            <dd className="text-foreground">{formatUgx(latest.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Paid from</dt>
            <dd className="text-foreground">{latest.paid_from}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Reference</dt>
            <dd className="text-foreground">{latest.reference}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Submitted</dt>
            <dd className="text-foreground">
              {new Date(latest.created_at).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!settings) return;

    if (!selectedPlan) {
      setError("Choose a subscription plan.");
      return;
    }
    if (!paidFrom.trim() || !reference.trim()) {
      setError("Enter the number you paid from and the transaction reference.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      setError("Your session expired. Please sign in again.");
      return;
    }

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan_id: selectedPlan.id,
      amount: selectedPlan.amount,
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

  function copyNumber() {
    if (!settings) return;
    navigator.clipboard?.writeText(settings.phone_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-semibold mb-1">Choose your plan</h2>
        <p className="text-sm text-muted mb-4">
          Your padlocks open as soon as an admin approves your deposit, and stay
          open until the plan expires.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left bg-surface border rounded-xl p-4 transition-colors ${
                  selected
                    ? "border-primary ring-1 ring-primary/50"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="text-lg font-bold text-primary">
                  {formatUgx(plan.amount)}
                </p>
                <p className="text-sm font-medium mt-0.5">{plan.name}</p>
                <p className="text-xs text-muted mt-1">
                  Access for{" "}
                  {plan.duration_days === 1
                    ? "24 hours"
                    : `${plan.duration_days} days`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={18} className="text-primary" />
            <h2 className="font-semibold">How to pay</h2>
          </div>
          <p className="text-sm text-muted mb-5">
            Deposit{" "}
            <span className="text-foreground font-medium">
              {selectedPlan ? formatUgx(selectedPlan.amount) : "—"}
            </span>{" "}
            for the{" "}
            <span className="text-foreground font-medium">
              {selectedPlan?.name ?? "selected plan"}
            </span>{" "}
            to the account below, then submit your transaction reference.
          </p>

          <div className="space-y-3">
            <div className="bg-surface-elevated border border-border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted uppercase tracking-wide">
                    Account name
                  </p>
                  <p className="text-sm font-medium truncate">
                    {settings.account_name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-elevated border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone size={16} className="text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted uppercase tracking-wide">
                      Pay to this number
                    </p>
                    <p className="text-lg font-bold text-primary truncate">
                      {settings.phone_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={copyNumber}
                  className="shrink-0 flex items-center gap-1 text-xs text-muted hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Copy size={13} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Submit your deposit</h2>
          <p className="text-sm text-muted mb-5">
            {state === "expired"
              ? "Your subscription expired — renew by submitting a new deposit."
              : state === "rejected"
                ? "Your previous request was rejected — you can submit a new one."
                : "Tell us where you sent the money so the admin can match it."}
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted block mb-1.5">
                Number you paid from
              </label>
              <input
                type="tel"
                value={paidFrom}
                onChange={(e) => setPaidFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">
                Transaction reference / code
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">
                Note <span className="text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedPlan}
              className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Submitting..."
                : selectedPlan
                  ? `Submit ${formatUgx(selectedPlan.amount)} deposit`
                  : "Choose a plan first"}
            </button>

            <p className="text-xs text-muted">
              Your videos stay locked until an admin approves your deposit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
