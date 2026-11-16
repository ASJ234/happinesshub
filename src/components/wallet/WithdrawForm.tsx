"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { PhoneField } from "@/components/ui/PhoneField";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import { phoneProblem } from "@/lib/phone";
import {
  MIN_WITHDRAWAL,
  money,
  PAYOUT_METHODS,
  type PayoutAccount,
  type PayoutMethod,
  type WithdrawalRow,
} from "@/lib/wallet";

interface WithdrawFormProps {
  balance: number;
  /** Prefilled from the creator's last withdrawal. */
  savedAccount: PayoutAccount | null;
  withdrawals: WithdrawalRow[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  rejected: "Rejected",
};

/** Asks an admin to pay out part of the wallet balance. */
export function WithdrawForm({ balance, savedAccount, withdrawals }: WithdrawFormProps) {
  const router = useRouter();
  const available = Math.floor(balance);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayoutMethod>(savedAccount?.method ?? "mtn");
  const [phone, setPhone] = useState(
    savedAccount && savedAccount.method !== "bank" ? savedAccount.account : ""
  );
  const [bank, setBank] = useState(savedAccount?.method === "bank" ? savedAccount.account : "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const canWithdraw = available >= MIN_WITHDRAWAL;

  function check(): string | null {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < MIN_WITHDRAWAL) {
      return `Enter a whole amount of at least ${money(MIN_WITHDRAWAL)}.`;
    }
    if (value > available) return `You only have ${money(available)} available.`;
    if (method === "bank" && bank.trim().length < 4) {
      return "Enter your bank name, account name and account number.";
    }
    return null;
  }

  async function withdraw(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (method !== "bank") {
      const problem = phoneProblem(phone);
      if (problem) return setPhoneError(problem.replace(" before paying", ""));
    }
    const problem = check();
    if (problem) return setMessage({ ok: false, text: problem });

    setBusy(true);
    const response = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        method,
        account: method === "bank" ? bank : phone,
      }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      return setMessage({
        ok: false,
        text: body?.error ?? "Could not request the withdrawal. Try again.",
      });
    }
    setMessage({
      ok: true,
      text: `${money(Number(amount))} requested. It's on hold until an admin sends it to you.`,
    });
    setAmount("");
    router.refresh();
  }

  return (
    <form
      onSubmit={withdraw}
      noValidate
      className="bg-surface border border-border rounded-2xl p-5 space-y-4"
    >
      <div>
        <h2 className="font-semibold">Withdraw</h2>
        <p className="text-xs text-muted mt-1">
          The amount is held as soon as you ask, and returned to your balance if
          the request is rejected. Minimum {money(MIN_WITHDRAWAL)}.
        </p>
      </div>

      {!canWithdraw ? (
        <p className="text-sm text-muted">
          You need at least {money(MIN_WITHDRAWAL)} to withdraw. You have{" "}
          {money(available)}.
        </p>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="withdraw-amount" className="text-sm text-muted">
                Amount (UGX)
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(available))}
                className="text-xs text-primary hover:underline"
              >
                Withdraw all ({money(available)})
              </button>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              inputMode="numeric"
              min={MIN_WITHDRAWAL}
              max={available}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="withdraw-method" className="text-sm text-muted block mb-1.5">
              Pay me by
            </label>
            <select
              id="withdraw-method"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as PayoutMethod);
                setPhoneError(null);
              }}
              className={inputClass}
            >
              {PAYOUT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {method === "bank" ? (
            <div>
              <label htmlFor="withdraw-bank" className="text-sm text-muted block mb-1.5">
                Bank details
              </label>
              <textarea
                id="withdraw-bank"
                rows={2}
                maxLength={120}
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Bank name, account name, account number"
                className={`${inputClass} resize-none`}
              />
            </div>
          ) : (
            <PhoneField
              label={method === "mtn" ? "MTN number to pay" : "Airtel number to pay"}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setPhoneError(null);
              }}
              error={phoneError}
            />
          )}

          {message && <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>}

          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy && <Spinner size={16} />}
            {busy ? "Requesting…" : "Request withdrawal"}
          </button>
        </>
      )}

      {canWithdraw === false && message && (
        <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>
      )}

      {withdrawals.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted">Recent requests</p>
          {withdrawals.slice(0, 5).map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted w-20 shrink-0">
                {new Date(withdrawal.created_at).toLocaleDateString()}
              </span>
              <span className="font-medium flex-1">{money(withdrawal.amount)}</span>
              <StatusBadge status={STATUS_LABELS[withdrawal.status] ?? withdrawal.status} />
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
