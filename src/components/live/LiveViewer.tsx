"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, Radio } from "lucide-react";
import Link from "next/link";
import MuxPlayer from "@mux/mux-player-react";
import { LiveChat } from "@/components/live/LiveChat";
import { GiftAlerts } from "./GiftAlerts";
import { useLiveGiftFeed } from "./useLiveGiftFeed";
import type { LiveChatMessage, LiveGift, LiveStreamRow } from "@/lib/live";

interface LiveViewerProps {
  stream: LiveStreamRow;
  gifts: LiveGift[];
  initialMessages: LiveChatMessage[];
  giftBalance: number;
  isOwner: boolean;
}

type PlaybackState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; playbackId: string; token: string }
  | { kind: "locked" }
  | { kind: "error"; message: string };

export function LiveViewer({
  stream,
  gifts,
  initialMessages,
  giftBalance,
  isOwner,
}: LiveViewerProps) {
  const { alerts, total: giftTotal } = useLiveGiftFeed(stream.id, gifts, stream.gift_total);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(giftBalance);
  // Which playback to fetch, or null when there is nothing to play yet. The
  // result is stored with the key it belongs to, so "loading" is simply "no
  // result for the current key" and never has to be set from inside an effect.
  const playbackKey =
    stream.status === "live" && stream.mux_playback_id
      ? `${stream.id}:${stream.mux_playback_id}`
      : null;
  const [fetched, setFetched] = useState<{ key: string; state: PlaybackState } | null>(
    null
  );
  const playback: PlaybackState = !playbackKey
    ? { kind: "idle" }
    : fetched?.key === playbackKey
      ? fetched.state
      : { kind: "loading" };

  // Fetch a signed playback token when the stream is live and Mux is involved.
  useEffect(() => {
    if (!playbackKey) return;
    let cancelled = false;

    const settle = (state: PlaybackState) => {
      if (!cancelled) setFetched({ key: playbackKey, state });
    };

    fetch(`/api/live/${stream.id}/playback`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (res.status === 403 && body?.locked) {
          settle({ kind: "locked" });
        } else if (!res.ok) {
          settle({ kind: "error", message: body?.error ?? "Could not start playback" });
        } else {
          settle({ kind: "ready", playbackId: body.playbackId, token: body.token });
        }
      })
      .catch(() => settle({ kind: "error", message: "Could not reach the streaming server" }));

    return () => { cancelled = true; };
  }, [playbackKey, stream.id]);

  async function sendGift(gift: LiveGift) {
    if (sending) return;
    setSending(true);
    setNotice(null);

    const response = await fetch(`/api/live/${stream.id}/gift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gift_id: gift.id }),
    });

    const body = await response.json().catch(() => null);
    setSending(false);

    if (!response.ok) {
      setNotice(body?.error ?? "Could not send the gift");
      return;
    }

    setBalance((value) => value - gift.price);
  }

  function renderPlayer() {
    if (stream.status !== "live") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <Radio size={48} className="text-white/30 mb-4" />
          <p className="text-white/70 text-sm">
            This stream is {stream.status}. Check back when it goes live.
          </p>
        </div>
      );
    }

    switch (playback.kind) {
      case "loading":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="text-white/40 animate-spin" />
          </div>
        );

      case "ready":
        return (
          <MuxPlayer
            playbackId={playback.playbackId}
            tokens={{ playback: playback.token }}
            streamType="live"
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full"
          />
        );

      case "locked":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Radio size={48} className="text-white/30 mb-4" />
            <p className="text-white font-semibold">Subscription required</p>
            <p className="text-white/60 text-sm mt-1">
              Unlock live streams and all videos with an active subscription.
            </p>
          </div>
        );

      case "error":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Radio size={48} className="text-white/30 mb-4" />
            <p className="text-white/70 text-sm">{playback.message}</p>
          </div>
        );

      default:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Radio size={48} className="text-white/30 mb-4" />
            <p className="text-white font-semibold">{stream.title}</p>
            <p className="text-white/60 text-sm mt-1">Starting soon…</p>
          </div>
        );
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border">
          {renderPlayer()}

          {stream.status === "live" && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 z-10">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}

          <GiftAlerts alerts={alerts} className="absolute top-3 right-3 z-10" />
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <h1 className="font-semibold text-lg">{stream.title}</h1>
          <p className="text-sm text-muted mt-1">{stream.description}</p>
          <p className="text-xs text-muted mt-3">
            {stream.viewers} watching · ${giftTotal.toFixed(2)} in gifts
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border font-medium text-sm">Chat</div>
          <LiveChat
            streamId={stream.id}
            initialMessages={initialMessages}
            disabled={stream.status !== "live"}
            disabledReason="The chat opens when the stream goes live"
          />
        </div>

        {!isOwner && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm flex items-center gap-1.5">
                <Gift size={15} className="text-primary" />
                Send a gift
              </h2>
              <span className="text-xs text-muted">
                Credit: ${balance.toFixed(2)}
              </span>
            </div>

            {notice && <p className="text-xs text-red-400 mb-2">{notice}</p>}

            <div className="grid grid-cols-4 gap-2">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift)}
                  disabled={sending || balance < gift.price}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-elevated hover:border-primary/40 py-2 transition-colors disabled:opacity-40"
                  title={`${gift.name} — $${gift.price.toFixed(2)}`}
                >
                  <span className="text-lg leading-none">{gift.emoji}</span>
                  <span className="text-[10px] text-muted">
                    ${gift.price.toFixed(0)}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-muted mt-3">
              <Link href="/dashboard/subscription#gift-credit" className="text-primary hover:underline">
                Top up your gift credit
              </Link>{" "}
              on the Subscription page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
