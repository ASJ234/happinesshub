"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VideoComment } from "@/lib/comments";
import { CommentForm } from "./CommentForm";

interface CommentListProps {
  comments: VideoComment[];
  canReply: boolean;
  showVideoTitle?: boolean;
}

export function CommentList({
  comments,
  canReply,
  showVideoTitle = false,
}: CommentListProps) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          canReply={canReply}
          showVideoTitle={showVideoTitle}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  canReply,
  showVideoTitle,
}: {
  comment: VideoComment;
  canReply: boolean;
  showVideoTitle: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = comment.parent_id !== null;

  async function act(init: RequestInit) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, init);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error ?? "That did not work. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function setHidden(hidden: boolean) {
    return act({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
  }

  function remove() {
    if (window.confirm("Delete this comment and any replies to it?")) {
      return act({ method: "DELETE" });
    }
  }

  const actionClass =
    "text-xs text-muted hover:text-foreground disabled:opacity-50";

  return (
    <div
      className={
        isReply
          ? "pl-4 border-l border-border"
          : "bg-surface border border-border rounded-xl p-4"
      }
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {comment.author_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{comment.author_name}</p>
            {showVideoTitle && !isReply && (
              <Link
                href={`/dashboard/watch/${comment.video_id}`}
                className="block text-[11px] text-muted hover:text-foreground truncate"
              >
                on {comment.video_title}
              </Link>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted shrink-0">{comment.date_label}</span>
      </div>

      <p className="text-sm text-muted ml-10 whitespace-pre-wrap break-words">
        {comment.body}
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-2 ml-10">
        {comment.hidden && (
          <span className="text-[11px] font-medium text-amber-400">Hidden</span>
        )}
        {canReply && !isReply && !comment.hidden && (
          <button
            type="button"
            onClick={() => setReplying((open) => !open)}
            className="text-xs text-primary hover:text-primary-hover font-medium"
          >
            Reply
          </button>
        )}
        {comment.can_moderate && (
          <button
            type="button"
            onClick={() => setHidden(!comment.hidden)}
            disabled={busy}
            className={actionClass}
          >
            {comment.hidden ? "Unhide" : "Hide"}
          </button>
        )}
        {comment.can_delete && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={actionClass}
          >
            Delete
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-2 ml-10">{error}</p>}

      {replying && (
        <div className="mt-3 ml-10">
          <CommentForm
            videoId={comment.video_id}
            parentId={comment.id}
            placeholder={`Reply to ${comment.author_name}...`}
            onPosted={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 ml-10 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              canReply={canReply}
              showVideoTitle={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
