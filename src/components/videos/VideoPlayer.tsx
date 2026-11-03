"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  src: string;
  poster?: string;
}

/**
 * Records a view whenever playback starts. Free viewers are counted once per
 * video per day; subscribers are counted on every play. The server decides,
 * this only reports the outcome back.
 */
export function VideoPlayer({ videoId, src, poster }: VideoPlayerProps) {
  const [counted, setCounted] = useState<boolean | null>(null);

  async function recordView() {
    try {
      const res = await fetch(`/api/videos/${videoId}/view`, { method: "POST" });
      if (!res.ok) return;
      const data: { counted?: boolean } = await res.json();
      setCounted(data.counted === true);
    } catch {
      // A failed view record must never interrupt playback.
    }
  }

  return (
    <div className="space-y-2">
      <video
        src={src}
        poster={poster}
        controls
        autoPlay
        playsInline
        onPlay={recordView}
        className="w-full max-h-[70vh] bg-black rounded-xl border border-border"
      />
      {counted !== null && (
        <p className="text-[11px] text-muted flex items-center gap-1.5">
          {counted ? <Eye size={12} /> : <EyeOff size={12} />}
          {counted
            ? "View counted"
            : "Your daily view for this video is already counted"}
        </p>
      )}
    </div>
  );
}
