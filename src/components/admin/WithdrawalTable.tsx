"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { money, type WithdrawalRow } from "@/lib/wallet";

export function WithdrawalTable({ withdrawals }: { withdrawals: WithdrawalRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(withdrawals);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(withdrawal: WithdrawalRow, action: "pay" | "reject") {
    setBusyId(withdrawal.id);
    setMessage(null);

    const response = await fetch("/api/admin/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: withdrawal.id, action }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not update the withdrawal");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === withdrawal.id
          ? { ...row, status: action === "pay" ? "paid" : "rejected" }
          : row
      )
    );
    setMessage(
      action === "pay"
        ? "Marked as paid"
        : "Rejected — the amount was returned to the creator"
    );
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No withdrawal requests yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {message && <p className="px-4 pt-3 text-xs text-muted">{message}</p>}
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">Creator</th>
            <th className="p-4 font-medium">Amount</th>
            <th className="p-4 font-medium">Method</th>
            <th className="p-4 font-medium">Account</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((withdrawal) => (
            <tr
              key={withdrawal.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                {withdrawal.user?.display_name ||
                  withdrawal.user?.username ||
                  "Unknown"}
              </td>
              <td className="p-4 font-medium">{money(withdrawal.amount)}</td>
              <td className="p-4 text-muted text-xs uppercase">
                {withdrawal.method}
              </td>
              <td className="p-4 text-muted text-xs">{withdrawal.account}</td>
              <td className="p-4">
                <StatusBadge
                  status={
                    withdrawal.status === "paid"
                      ? "Approved"
                      : withdrawal.status === "rejected"
                        ? "Rejected"
                        : "Pending review"
                  }
                />
              </td>
              <td className="p-4">
                {withdrawal.status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => review(withdrawal, "pay")}
                      disabled={busyId === withdrawal.id}
                      className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                    >
                      <Banknote size={13} />
                      Mark paid
                    </button>
                    <button
                      onClick={() => review(withdrawal, "reject")}
                      disabled={busyId === withdrawal.id}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                    >
                      <X size={13} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
