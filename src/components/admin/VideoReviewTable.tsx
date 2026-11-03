"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { videoStatusLabel } from "@/lib/videos";

export interface AdminVideoRow {
  id: string;
  title: string;
  category: string;
  status: string;
  views: number;
  created_at: string;
  creator: { username: string; display_name: string | null } | null;
}

interface VideoReviewTableProps {
  videos: AdminVideoRow[];
}

export function VideoReviewTable({ videos }: VideoReviewTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(videos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(video: AdminVideoRow, action: "approve" | "reject") {
    setBusyId(video.id);
    setMessage(null);

    const response = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: video.id, action }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not update the video");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === video.id
          ? { ...row, status: action === "approve" ? "published" : "rejected" }
          : row
      )
    );
    setMessage(
      action === "approve"
        ? `Published "${video.title}"`
        : `Rejected "${video.title}"`
    );
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No videos are waiting for review.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {message && <p className="px-4 pt-3 text-xs text-muted">{message}</p>}
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">Video</th>
            <th className="p-4 font-medium">Creator</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((video) => (
            <tr
              key={video.id}
              className="border-b border-border last:border-0 hover:bg-surface-elevated"
            >
              <td className="p-4">
                <p className="font-medium line-clamp-1 max-w-72">{video.title}</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                  <span>{video.category}</span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {video.views}
                  </span>
                </p>
              </td>
              <td className="p-4 text-muted">
                {video.creator?.display_name || video.creator?.username || "Unknown"}
              </td>
              <td className="p-4">
                <StatusBadge status={videoStatusLabel(video.status)} />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => review(video, "approve")}
                    disabled={busyId === video.id}
                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => review(video, "reject")}
                    disabled={busyId === video.id}
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
