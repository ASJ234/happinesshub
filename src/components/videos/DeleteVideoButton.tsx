"use client";

import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/useConfirm";
import { sendDelete } from "@/lib/fetch-error";

interface DeleteVideoButtonProps {
  videoId: string;
  /** Named in the confirmation, when known. */
  title?: string;
  /** Called once the video is gone, for lists the page refresh doesn't redraw. */
  onDeleted?: () => void;
}

export function DeleteVideoButton({ videoId, title, onDeleted }: DeleteVideoButtonProps) {
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
            action: async () => {
              // A video that's already gone was deleted earlier, e.g. in another tab.
              const problem = await sendDelete(
                `/api/videos/${videoId}`,
                "Could not delete the video",
                { missingIsDone: true }
              );
              if (!problem) onDeleted?.();
              return problem;
            },
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
