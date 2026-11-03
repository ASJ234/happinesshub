"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { liveCreatorLabel, liveStatusLabel, type LiveStreamRow } from "@/lib/live";

export function LiveRequestTable({ streams }: { streams: LiveStreamRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(streams);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(stream: LiveStreamRow, action: "approve" | "reject") {
    setBusyId(stream.id);
    setMessage(null);

    const response = await fetch("/api/admin/live", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: stream.id, action }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not update the request");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === stream.id
          ? { ...row, status: action === "approve" ? "approved" : "rejected" }
          : row
      )
    );
    setMessage(
      action === "approve"
        ? `Approved "${stream.title}"`
        : `Rejected "${stream.title}"`
    );
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No live requests are waiting.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {message && <p className="px-4 pt-3 text-xs text-muted">{message}</p>}
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">Stream</th>
            <th className="p-4 font-medium">Creator</th>
            <th className="p-4 font-medium">Planned</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((stream) => (
            <tr
              key={stream.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                <p className="font-medium line-clamp-1 max-w-64">{stream.title}</p>
                {stream.description && (
                  <p className="text-xs text-muted mt-0.5 line-clamp-1 max-w-64">
                    {stream.description}
                  </p>
                )}
              </td>
              <td className="p-4 text-muted">{liveCreatorLabel(stream)}</td>
              <td className="p-4 text-muted text-xs">
                {stream.scheduled_for
                  ? new Date(stream.scheduled_for).toLocaleString()
                  : "Not scheduled"}
              </td>
              <td className="p-4">
                <StatusBadge status={liveStatusLabel(stream.status)} />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => review(stream, "approve")}
                    disabled={busyId === stream.id}
                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => review(stream, "reject")}
                    disabled={busyId === stream.id}
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
