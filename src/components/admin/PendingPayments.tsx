"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatUgx } from "@/lib/videos";

export interface AdminSubscriptionRow {
  id: string;
  user_id: string;
  amount: number;
  paid_from: string;
  reference: string;
  note: string | null;
  status: "pending" | "active" | "rejected" | "failed" | "revoked";
  method: "manual" | "marzpay" | "link";
  plan_id: string;
  expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: { username: string; display_name: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  failed: "Failed",
  revoked: "Revoked",
};

const DONE_MESSAGES = {
  approve: "Approved — padlocks opened.",
  reject: "Request rejected.",
  revoke: "Subscription revoked — padlocks closed.",
} as const;

type ReviewAction = keyof typeof DONE_MESSAGES;

function isRunning(row: AdminSubscriptionRow): boolean {
  return (
    row.status === "active" &&
    (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  );
}

interface PendingPaymentsProps {
  requests: AdminSubscriptionRow[];
}

export function PendingPayments({ requests }: PendingPaymentsProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(row: AdminSubscriptionRow, action: ReviewAction) {
    const id = row.id;
    if (action === "revoke") {
      const who = row.user?.display_name || row.user?.username || "this user";
      const ok = window.confirm(
        `Revoke ${who}'s ${formatUgx(row.amount)} subscription? Their padlocks close straight away. This can't be undone.`
      );
      if (!ok) return;
    }
    setBusyId(id);
    setMessage(null);

    const response = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not review request");
      return;
    }

    setMessage(DONE_MESSAGES[action]);
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <p className="p-4 text-sm text-muted">
        No deposit requests yet. New submissions appear here for approval.
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
            <th className="p-4 font-medium">Date</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                <p className="font-medium">
                  {row.user?.display_name || row.user?.username || "Unknown"}
                </p>
                <p className="text-xs text-muted">
                  @{row.user?.username ?? "—"}
                </p>
              </td>
              <td className="p-4 font-medium">
                {formatUgx(row.amount)}
                <p className="text-xs text-muted mt-0.5">{row.plan_id}</p>
              </td>
              <td className="p-4 text-muted">
                {row.paid_from}
                <p className="text-xs text-muted/70 mt-0.5">
                  {row.method === "marzpay"
                    ? "MarzPay prompt"
                    : row.method === "link"
                      ? "MarzPay link — check it arrived"
                      : "Manual deposit"}
                </p>
              </td>
              <td className="p-4 text-muted">
                {row.reference}
                {row.note && (
                  <p className="text-xs text-muted/70 mt-0.5">{row.note}</p>
                )}
              </td>
              <td className="p-4 text-muted">{formatDate(row.created_at)}</td>
              <td className="p-4">
                <StatusBadge status={STATUS_LABELS[row.status]} />
                {row.status === "active" && row.expires_at && (
                  <p className="text-[11px] text-muted mt-1">
                    until {formatDate(row.expires_at)}
                  </p>
                )}
              </td>
              <td className="p-4">
                {row.status === "pending" && row.method === "marzpay" ? (
                  <span className="text-xs text-muted">Awaiting phone approval</span>
                ) : row.status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => review(row, "approve")}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      Approve
                    </button>
                    <button
                      onClick={() => review(row, "reject")}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </div>
                ) : isRunning(row) ? (
                  <button
                    onClick={() => review(row, "revoke")}
                    disabled={busyId === row.id}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                  >
                    <Ban size={13} />
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-muted">
                    {row.reviewed_at ? formatDate(row.reviewed_at) : "—"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
