"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface GiftDepositRow {
  id: string;
  amount: number;
  paid_from: string;
  reference: string;
  note: string | null;
  status: string;
  created_at: string;
  user: { username: string; display_name: string | null } | null;
}

export function GiftDepositTable({ deposits }: { deposits: GiftDepositRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(deposits);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(deposit: GiftDepositRow, action: "approve" | "reject") {
    setBusyId(deposit.id);
    setMessage(null);

    const response = await fetch("/api/admin/gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deposit.id, action }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not update the deposit");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === deposit.id
          ? { ...row, status: action === "approve" ? "approved" : "rejected" }
          : row
      )
    );
    setMessage(
      action === "approve" ? "Gift credit approved" : "Gift credit rejected"
    );
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No gift top-ups are waiting.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {message && <p className="px-4 pt-3 text-xs text-muted">{message}</p>}
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">User</th>
            <th className="p-4 font-medium">Amount</th>
            <th className="p-4 font-medium">Paid from</th>
            <th className="p-4 font-medium">Reference</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((deposit) => (
            <tr
              key={deposit.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                {deposit.user?.display_name || deposit.user?.username || "Unknown"}
              </td>
              <td className="p-4 font-medium">${deposit.amount.toFixed(2)}</td>
              <td className="p-4 text-muted text-xs">{deposit.paid_from}</td>
              <td className="p-4 text-muted text-xs">{deposit.reference}</td>
              <td className="p-4">
                <StatusBadge
                  status={
                    deposit.status === "approved"
                      ? "Approved"
                      : deposit.status === "rejected"
                        ? "Rejected"
                        : "Pending review"
                  }
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => review(deposit, "approve")}
                    disabled={busyId === deposit.id}
                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => review(deposit, "reject")}
                    disabled={busyId === deposit.id}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                  >
                    <X size={13} />
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
