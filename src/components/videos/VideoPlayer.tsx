"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  poster?: string;
}

type Playback = {
  playbackId: string;
  tokens: {
    playback: string;
    thumbnail: string;
    storyboard: string;
  };
};

/**
 * Asks the server for playback details after the access check, then records a
 * view when playback starts. Free viewers are counted once per video per day;
 * subscribers are counted on every play. The server decides, this only reports
 * the outcome back.
 */
export function VideoPlayer({ videoId, poster }: VideoPlayerProps) {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<boolean | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/videos/${videoId}/stream`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Could not start playback");
        }
        if (!cancelled) setPlayback(body as Playback);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function recordView() {
    if (recorded.current) return;
    recorded.current = true;

    try {
      const res = await fetch(`/api/videos/${videoId}/view`, { method: "POST" });
      if (!res.ok) return;
      const data: { counted?: boolean } = await res.json();
      setCounted(data.counted === true);
    } catch {
      // A failed view record must never interrupt playback.
    }
  }

  if (loading) {
    return (
      <div className="w-full h-64 bg-black rounded-xl border border-border flex items-center justify-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (error || !playback) {
    return (
      <div className="w-full h-64 bg-black rounded-xl border border-border flex items-center justify-center px-6 text-center text-sm text-muted">
        {error ?? "Playback is unavailable right now."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <MuxPlayer
        playbackId={playback.playbackId}
        tokens={playback.tokens}
        poster={poster}
        envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY}
        metadataVideoId={videoId}
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
