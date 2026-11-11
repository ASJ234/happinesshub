"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LiveGift } from "@/lib/live";

export interface GiftAlert {
  id: number;
  giftName: string;
  emoji: string;
  sender: string;
}

/** How long one alert stays on screen, and how many show at once. */
const ALERT_MS = 4000;
const MAX_ALERTS = 5;

/**
 * Follows the gifts sent to one stream as they happen: a short-lived alert per
 * gift (real gift and sender) and a running gift total.
 */
export function useLiveGiftFeed(
  streamId: string,
  gifts: LiveGift[],
  initialTotal: number
) {
  const [alerts, setAlerts] = useState<GiftAlert[]>([]);
  const [total, setTotal] = useState(initialTotal);

  // Kept in refs so the subscription is not torn down when they change.
  const giftsRef = useRef(gifts);
  const namesRef = useRef(new Map<string, string>());
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    giftsRef.current = gifts;
  }, [gifts]);

  useEffect(() => {
    const supabase = createClient();
    const timers = timersRef.current;
    const seen = new Set<number>();

    async function senderName(id: string): Promise<string> {
      const cached = namesRef.current.get(id);
      if (cached) return cached;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", id)
        .maybeSingle();
      const name = data?.display_name || data?.username || "Someone";
      namesRef.current.set(id, name);
      return name;
    }

    const channel = supabase
      .channel(`live-gifts:${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_gift_sends",
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: number;
            sender_id: string;
            gift_id: string;
            amount: number | string;
          };
          if (seen.has(row.id)) return;
          seen.add(row.id);

          setTotal((value) => value + Number(row.amount));

          const gift = giftsRef.current.find((g) => g.id === row.gift_id);
          const sender = await senderName(row.sender_id);

          setAlerts((prev) => [
            ...prev.slice(-(MAX_ALERTS - 1)),
            {
              id: row.id,
              giftName: gift?.name ?? "Gift",
              emoji: gift?.emoji ?? "🎁",
              sender,
            },
          ]);

          const timer = setTimeout(() => {
            timers.delete(timer);
            setAlerts((prev) => prev.filter((alert) => alert.id !== row.id));
          }, ALERT_MS);
          timers.add(timer);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [streamId]);

  return { alerts, total };
}
