"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  videoId: string;
  parentId?: string;
  placeholder?: string;
  onPosted?: () => void;
}

const MAX_LENGTH = 1000;

export function CommentForm({
  videoId,
  parentId,
  placeholder = "Add a comment...",
  onPosted,
}: CommentFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    const body = text.trim();
    if (!body || posting) return;

    setPosting(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error ?? "Could not post the comment");
        return;
      }

      setText("");
      onPosted?.();
      router.refresh();
    } catch {
      setError("Could not post the comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_LENGTH}
        rows={2}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={post}
          disabled={posting || !text.trim()}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {posting ? "Posting..." : parentId ? "Reply" : "Comment"}
        </button>
      </div>
    </div>
  );
}
