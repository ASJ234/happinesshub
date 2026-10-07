"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteVideoButtonProps {
  videoId: string;
}

export function DeleteVideoButton({ videoId }: DeleteVideoButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this video permanently? The video file will be removed too."
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const response = await fetch(`/api/videos/${videoId}`, {
      method: "DELETE",
    });

    setDeleting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not delete video");
      return;
    }

    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
      >
        <Trash2 size={13} />
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </span>
  );
}
