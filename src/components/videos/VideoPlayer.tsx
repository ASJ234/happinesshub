"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { VideoProcessing } from "./VideoProcessing";

interface VideoPlayerProps {
  videoId: string;
  /** False for owners and admins, whose plays are never counted. */
  countsViews: boolean;
  width?: number | null;
  height?: number | null;
}

interface PlayerJsPlayer {
  on(event: string, callback: () => void): void;
}

declare global {
  interface Window {
    playerjs?: { Player: new (iframe: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

const PROCESSING_RETRY_MS = 5000;

const PLAYERJS_URL =
  "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

/**
 * Asks the server for a signed embed after the access check, then records a
 * view when playback starts. Free viewers are counted once per video per day;
 * subscribers are counted on every play. The server decides, this only reports
 * the outcome back.
 */
export function VideoPlayer({
  videoId,
  countsViews,
  width,
  height,
}: VideoPlayerProps) {
  const isVertical = Boolean(width && height && height > width);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<boolean | null>(null);
  /** Bunny's progress while the video is still being prepared. */
  const [processing, setProcessing] = useState<number | null | undefined>(undefined);
  const [playerScript, setPlayerScript] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recorded = useRef(false);

  // Asks for playback; while Bunny is still preparing a fresh upload, asks
  // again every few seconds and starts the player once it is ready.
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch(`/api/videos/${videoId}/stream`);
        const body = await response.json().catch(() => null);
        if (cancelled) return;

        if (response.status === 409 && body?.processing) {
          setProcessing(typeof body.progress === "number" ? body.progress : null);
          setLoading(false);
          retry = setTimeout(load, PROCESSING_RETRY_MS);
          return;
        }
        if (!response.ok) {
          throw new Error(body?.error ?? "Could not start playback");
        }
        setProcessing(undefined);
        setEmbedUrl((body as { embedUrl: string }).embedUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not start playback");
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(retry);
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

  // Backup for when Player.js is blocked (ad blockers) or never answers: a tap
  // into the player moves focus into its frame, which blurs this window. That
  // is the viewer starting the video. recordView only ever reports once, and
  // the server still applies its own once-a-day rule for free viewers.
  useEffect(() => {
    if (!countsViews || !embedUrl) return;
    function onBlur() {
      // Focus lands on the frame just after the blur event.
      setTimeout(() => {
        if (iframeRef.current && document.activeElement === iframeRef.current) {
          recordView();
        }
      }, 0);
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [countsViews, embedUrl, recordView]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-black rounded-xl border border-border flex items-center justify-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (processing !== undefined && !embedUrl) {
    return <VideoProcessing progress={processing} />;
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
      <div
        className={`relative w-full bg-black rounded-xl border border-border overflow-hidden ${
          isVertical ? "h-[70vh]" : "aspect-video max-h-[70vh]"
        }`}
      >
        {playerScript !== "loading" && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="Video player"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            // The frame always fills the box and the player letterboxes the
            // video inside it, so fullscreen keeps it centred. Sizing the frame
            // itself to the video's shape pushed it to the left in fullscreen.
            // The site is color-scheme: dark. A light-scheme embed in a dark
            // page gets an opaque white canvas, so the frame has to match it,
            // which keeps it transparent over the black box.
            className="[color-scheme:light] absolute inset-0 w-full h-full"
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
