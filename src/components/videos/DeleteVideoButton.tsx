"use client";

import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/useConfirm";
import { sendDelete } from "@/lib/fetch-error";

interface DeleteVideoButtonProps {
  videoId: string;
  /** Named in the confirmation, when known. */
  title?: string;
}

export function DeleteVideoButton({ videoId, title }: DeleteVideoButtonProps) {
  const { ask, dialog } = useConfirm();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          ask({
            title: "Delete this video?",
            description: (
              <>
                {title && <span className="text-foreground font-medium">“{title}” </span>}
                will be removed permanently, with its video file, views and
                comments. This can&apos;t be undone.
              </>
            ),
            confirmLabel: "Delete video",
            action: () => sendDelete(`/api/videos/${videoId}`, "Could not delete the video"),
          })
        }
        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
      >
        <Trash2 size={13} />
        Delete
      </button>
      {dialog}
    </>
  );
}
