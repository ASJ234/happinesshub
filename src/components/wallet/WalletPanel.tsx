"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Gift, Wallet } from "lucide-react";
import {
  money,
  transactionLabel,
  type WalletTransactionRow,
  type WithdrawalRow,
} from "@/lib/wallet";
import { inputClass } from "@/components/ui/styles";

interface WalletPanelProps {
  balance: number;
  lifetimeEarnings: number;
  transactions: WalletTransactionRow[];
  withdrawals: WithdrawalRow[];
  payoutMethod: string;
  payoutAccount: string;
  giftBalance: number;
}


export function WalletPanel({
  balance,
  lifetimeEarnings,
  transactions,
  withdrawals,
  payoutMethod,
  payoutAccount,
  giftBalance,
}: WalletPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(payoutMethod || "mtn");
  const [account, setAccount] = useState(payoutAccount || "");

  const [giftAmount, setGiftAmount] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [reference, setReference] = useState("");

  async function withdraw() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), method, account }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not request the withdrawal");
      return;
    }

    setNotice("Withdrawal requested. The amount is on hold until an admin pays it.");
    setAmount("");
    router.refresh();
  }

  async function topUp() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/gifts/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(giftAmount),
        paid_from: paidFrom,
        reference,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not send the top-up");
      return;
    }

    setNotice("Top-up sent. An admin approves it before the credit can be used.");
    setGiftAmount("");
    setPaidFrom("");
    setReference("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-400">{notice}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-2xl font-bold">{money(balance)}</p>
          <p className="text-sm text-muted mt-1">Available balance</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Banknote size={20} />
          </div>
          <p className="text-2xl font-bold">{money(lifetimeEarnings)}</p>
          <p className="text-sm text-muted mt-1">Lifetime earnings</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-accent-red/10 text-accent-red flex items-center justify-center mb-3">
            <Gift size={20} />
          </div>
          <p className="text-2xl font-bold">{money(giftBalance)}</p>
          <p className="text-sm text-muted mt-1">Gift credit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold">Withdraw</h2>
          <p className="text-xs text-muted">
            The amount is held right away and refunded if the request is
            rejected.
          </p>

          <div>
            <label className="text-sm text-muted block mb-1.5">Amount</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted block mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputClass}
              >
                <option value="mtn">MTN Mobile Money</option>
                <option value="airtel">Airtel Money</option>
                <option value="bank">Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Account</label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={withdraw}
            disabled={busy || !Number(amount) || !account.trim()}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Sending..." : "Request withdrawal"}
          </button>

          {withdrawals.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              {withdrawals.slice(0, 5).map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted">
                    {new Date(withdrawal.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-medium">
                    {money(withdrawal.amount)}
                  </span>
                  <span className="text-muted capitalize">{withdrawal.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold">Top up gift credit</h2>
          <p className="text-xs text-muted">
            Send the money to the account the site shows, then enter the
            reference. An admin approves the credit.
          </p>

          <div>
            <label className="text-sm text-muted block mb-1.5">Amount</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={giftAmount}
              onChange={(e) => setGiftAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted block mb-1.5">Paid from</label>
              <input
                type="text"
                value={paidFrom}
                onChange={(e) => setPaidFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={topUp}
            disabled={busy || !Number(giftAmount) || !paidFrom.trim() || !reference.trim()}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send top-up"}
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Earnings</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet. Earnings show up here as soon as the pool is split or a
            viewer sends a gift.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
              >
                <div>
                  <p className="font-medium">
                    {transactionLabel(transaction.kind)}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(transaction.created_at).toLocaleDateString()}
                    {transaction.period ? ` · ${transaction.period}` : ""}
                    {transaction.note ? ` · ${transaction.note}` : ""}
                  </p>
                </div>
                <span
                  className={
                    transaction.amount >= 0
                      ? "text-green-400 font-medium"
                      : "text-red-400 font-medium"
                  }
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {money(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
