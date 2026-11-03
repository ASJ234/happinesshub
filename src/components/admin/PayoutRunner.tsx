"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { money } from "@/lib/wallet";

export function PayoutRunner({ poolAmount }: { poolAmount: number }) {
  const router = useRouter();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [period, setPeriod] = useState(defaultPeriod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not run the payouts");
      return;
    }

    const paid = Array.isArray(body.paid) ? body.paid : [];
    setNotice(
      paid.length === 0
        ? "Nobody was paid — every creator in this period was already paid or collected no views."
        : `Paid ${paid.length} creator${paid.length === 1 ? "" : "s"}: ${paid
            .map((entry: { amount: number }) => money(Number(entry.amount)))
            .join(", ")}`
    );
    router.refresh();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <Coins size={15} className="text-primary" />
          Monthly pool
        </h2>
        <span className="text-sm font-medium">{money(poolAmount)}</span>
      </div>

      <p className="text-xs text-muted">
        The pool is split between the creators in proportion to the views they
        collected in the chosen month. Running it twice never pays twice.
      </p>

      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="text-xs text-muted block mb-1">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {busy ? "Running..." : "Run payouts"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {notice && <p className="text-xs text-green-400">{notice}</p>}
    </div>
  );
}
