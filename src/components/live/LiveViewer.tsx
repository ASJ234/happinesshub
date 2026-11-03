"use client";

import { useEffect, useState } from "react";
import { Gift, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LiveChat } from "@/components/live/LiveChat";
import type { LiveChatMessage, LiveGift, LiveStreamRow } from "@/lib/live";

interface LiveViewerProps {
  stream: LiveStreamRow;
  gifts: LiveGift[];
  initialMessages: LiveChatMessage[];
  giftBalance: number;
  isOwner: boolean;
}

interface GiftPing {
  id: number;
  giftName: string;
  emoji: string;
  sender: string;
}

export function LiveViewer({
  stream,
  gifts,
  initialMessages,
  giftBalance,
  isOwner,
}: LiveViewerProps) {
  const [pings, setPings] = useState<GiftPing[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(giftBalance);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-gifts:${stream.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_gift_sends",
          filter: `stream_id=eq.${stream.id}`,
        },
        () => {
          // The name and emoji are resolved on the next server render; the
          // overlay only needs to know that a gift arrived.
          setPings((prev) => [
            ...prev.slice(-4),
            {
              id: Date.now(),
              giftName: "Gift",
              emoji: "🎁",
              sender: "Someone",
            },
          ]);
          setTimeout(
            () =>
              setPings((prev) =>
                prev.filter((ping) => ping.id !== Date.now())
              ),
            4000
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream.id]);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Radio size={48} className="text-red-500 mb-4" />
            {stream.status === "live" ? (
              <>
                <p className="text-white font-semibold text-lg">
                  {stream.title}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  The video feed is handled by the streaming provider
                </p>
              </>
            ) : (
              <p className="text-white/70 text-sm">
                This stream is {stream.status}. Check back when it is live.
              </p>
            )}
          </div>

          {stream.status === "live" && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}

          {pings.length > 0 && (
            <div className="absolute top-3 right-3 space-y-1">
              {pings.map((ping) => (
                <div
                  key={ping.id}
                  className="bg-black/70 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
                >
                  <span>{ping.emoji}</span>
                  <span>{ping.giftName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <h1 className="font-semibold text-lg">{stream.title}</h1>
          <p className="text-sm text-muted mt-1">{stream.description}</p>
          <p className="text-xs text-muted mt-3">
            {stream.viewers} watching · ${stream.gift_total.toFixed(2)} in gifts
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
              Top up your gift credit from the Subscription page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
