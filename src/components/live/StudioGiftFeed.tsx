"use client";

import { Gift } from "lucide-react";
import type { LiveGift } from "@/lib/live";
import { GiftAlerts } from "./GiftAlerts";
import { useLiveGiftFeed } from "./useLiveGiftFeed";

interface StudioGiftFeedProps {
  streamId: string;
  gifts: LiveGift[];
  initialTotal: number;
}

/** The creator's view of gifts coming in while their stream is live. */
export function StudioGiftFeed({ streamId, gifts, initialTotal }: StudioGiftFeedProps) {
  const { alerts, total } = useLiveGiftFeed(streamId, gifts, initialTotal);

  return (
    <div className="w-full space-y-2">
      <p className="text-xs text-muted flex items-center gap-1.5">
        <Gift size={12} className="text-primary" />
        ${total.toFixed(2)} in gifts so far
      </p>
      <GiftAlerts alerts={alerts} />
    </div>
  );
}
