"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  /** False for owners and admins, whose plays are never counted. */
  countsViews: boolean;
}

interface PlayerJsPlayer {
  on(event: string, callback: () => void): void;
}

declare global {
  interface Window {
    playerjs?: { Player: new (iframe: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

const PLAYERJS_URL =
  "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

/**
 * Asks the server for a signed embed after the access check, then records a
 * view when playback starts. Free viewers are counted once per video per day;
 * subscribers are counted on every play. The server decides, this only reports
 * the outcome back.
 */
export function VideoPlayer({ videoId, countsViews }: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<boolean | null>(null);
  const [playerScript, setPlayerScript] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recorded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/videos/${videoId}/stream`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Could not start playback");
        }
        if (!cancelled) setEmbedUrl((body as { embedUrl: string }).embedUrl);
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

  const recordView = useCallback(async () => {
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
  }, [videoId]);

  // The iframe only renders once the script has settled, so the listener is
  // attached before the player can announce that it is ready.
  useEffect(() => {
    if (
      !countsViews ||
      playerScript !== "ready" ||
      !iframeRef.current ||
      !window.playerjs
    ) {
      return;
    }

    const player = new window.playerjs.Player(iframeRef.current);
    player.on("ready", () => player.on("play", recordView));
  }, [countsViews, playerScript, embedUrl, recordView]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-black rounded-xl border border-border flex items-center justify-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="w-full h-64 bg-black rounded-xl border border-border flex items-center justify-center px-6 text-center text-sm text-muted">
        {error ?? "Playback is unavailable right now."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src={PLAYERJS_URL}
        onReady={() => setPlayerScript("ready")}
        onError={() => setPlayerScript("failed")}
      />
      <div className="relative w-full aspect-video max-h-[70vh] bg-black rounded-xl border border-border overflow-hidden">
        {playerScript !== "loading" && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="Video player"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
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
