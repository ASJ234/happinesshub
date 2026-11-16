"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import type { GiftTopUpState } from "@/lib/gift-topups";
import { formatUgx } from "@/lib/videos";
import { GiftTopUpPending } from "./GiftTopUpPending";

interface GiftTopUpFormProps {
  topUp: GiftTopUpState;
}

/** Buys gift credit through a package's MarzPay payment link. */
export function GiftTopUpForm({ topUp }: GiftTopUpFormProps) {
  const { packages, pending } = topUp;
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = packages.find((p) => p.id === packageId) ?? null;

  if (pending) {
    const link = packages.find((p) => p.amount === pending.amount)?.payment_link ?? null;
    return <GiftTopUpPending pending={pending} paymentLink={link} />;
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selected) return setError("Choose an amount.");
    if (!phone.trim()) return setError("Enter the number you'll pay from.");

    setBusy(true);
    const response = await fetch("/api/gifts/payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: selected.id, phone }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);

    if (!response?.ok || !body?.url) {
      setBusy(false);
      return setError(body?.error ?? "Could not start the top-up. Try again.");
    }
    window.location.assign(body.url);
  }

  return (
    <form onSubmit={pay} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Top up gift credit</h2>
        <p className="text-xs text-muted mt-1">
          Pick an amount and pay with MTN or Airtel on MarzPay&apos;s secure page.
          The credit is added once your payment is confirmed, and you can then
          send gifts during live streams.
        </p>
      </div>

      {packages.length === 0 ? (
        <p className="text-sm text-muted">Gift top-ups aren&apos;t available yet. Please check back soon.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {packages.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setPackageId(pack.id)}
                aria-pressed={pack.id === packageId}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  pack.id === packageId
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {formatUgx(pack.amount)}
              </button>
            ))}
          </div>

          <Field label="Number you'll pay from" hint="e.g. 0772123456">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Alert tone="info">
            <b>Important:</b> pay from the same number you type here. If you pay
            from a different number, we can&apos;t match your payment and your
            credit won&apos;t be added automatically.
          </Alert>

          {error && <Alert tone="error">{error}</Alert>}

          <button type="submit" disabled={busy || !selected} className={primaryButtonClass}>
            {busy ? "Opening MarzPay..." : selected ? `Pay ${formatUgx(selected.amount)}` : "Choose an amount"}
          </button>
        </>
      )}
    </form>
  );
}
