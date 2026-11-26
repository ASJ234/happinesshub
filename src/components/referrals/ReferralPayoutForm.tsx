"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { PhoneField } from "@/components/ui/PhoneField";
import { Spinner } from "@/components/ui/Spinner";
import { inputClass, submitButtonClass } from "@/components/ui/styles";
import { readError } from "@/lib/fetch-error";
import { phoneProblem } from "@/lib/phone";
import { REFERRAL_PAYOUT_METHODS, type ReferralPayoutMethod } from "@/lib/referrals";
import { money, type PayoutAccount } from "@/lib/wallet";

interface ReferralPayoutFormProps {
  /** UGX the creator can ask for now. */
  redeemable: number;
  /** Paid referrals that go into this withdrawal. */
  count: number;
  /** Prefilled from the creator's last withdrawal. */
  savedAccount: PayoutAccount | null;
}

/** Asks an admin to send the referral reward to a mobile money number. */
export function ReferralPayoutForm({ redeemable, count, savedAccount }: ReferralPayoutFormProps) {
  const router = useRouter();
  const saved = savedAccount && savedAccount.method !== "bank" ? savedAccount : null;
  const [method, setMethod] = useState<ReferralPayoutMethod>(
    (saved?.method as ReferralPayoutMethod) ?? "mtn"
  );
  const [phone, setPhone] = useState(saved?.account ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const problem = phoneProblem(phone);
    if (problem) return setPhoneError(problem.replace(" before paying", ""));

    setBusy(true);
    try {
      const response = await fetch("/api/referrals/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, phone }),
      });
      if (!response.ok) {
        setMessage({
          ok: false,
          text: await readError(response, "Could not request the withdrawal. Try again."),
        });
        return;
      }
      router.refresh();
    } catch {
      setMessage({
        ok: false,
        text: "Can't reach the server. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="referral-method" className="text-sm text-muted block mb-1.5">
          Send my money by
        </label>
        <select
          id="referral-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as ReferralPayoutMethod)}
          className={inputClass}
        >
          {REFERRAL_PAYOUT_METHODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <PhoneField
        label={method === "mtn" ? "MTN number to send the money to" : "Airtel number to send the money to"}
        value={phone}
        onChange={(value) => {
          setPhone(value);
          setPhoneError(null);
        }}
        error={phoneError}
      />

      {message && <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>}

      <button
        type="submit"
        disabled={busy}
        className={`${submitButtonClass} inline-flex items-center justify-center gap-2`}
      >
        {busy && <Spinner size={16} />}
        {busy ? "Requesting…" : `Withdraw ${money(redeemable)} (${count} referrals)`}
      </button>
    </form>
  );
}
