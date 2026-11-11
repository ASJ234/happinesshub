"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui/styles";

interface GiftTopUpFormProps {
  /** The account to pay, shown above the form when known. */
  payTo?: { account_name: string; phone_number: string } | null;
}

/** Asks for gift credit: the viewer pays manually and an admin approves it. */
export function GiftTopUpForm({ payTo }: GiftTopUpFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [reference, setReference] = useState("");

  async function topUp() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/gifts/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), paid_from: paidFrom, reference }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not send the top-up");
      return;
    }

    setNotice("Top-up sent. An admin approves it before the credit can be used.");
    setAmount("");
    setPaidFrom("");
    setReference("");
    router.refresh();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold">Top up gift credit</h2>
      <p className="text-xs text-muted">
        {payTo ? (
          <>
            Send the money to{" "}
            <span className="text-foreground font-medium">{payTo.phone_number}</span>{" "}
            ({payTo.account_name}), then enter the reference.
          </>
        ) : (
          "Send the money to the account the site shows, then enter the reference."
        )}{" "}
        An admin approves the credit, and you can then send gifts during live streams.
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

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-400">{notice}</p>}

      <button
        onClick={topUp}
        disabled={busy || !Number(amount) || !paidFrom.trim() || !reference.trim()}
        className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {busy ? "Sending..." : "Send top-up"}
      </button>
    </div>
  );
}
