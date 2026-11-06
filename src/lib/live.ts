import type { SupabaseClient } from "@supabase/supabase-js";

export type LiveStatus = "pending" | "approved" | "rejected" | "live" | "ended";

export interface LiveStreamRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: LiveStatus;
  provider: string;
  provider_session_id: string | null;
  mux_playback_id: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewers: number;
  gift_total: number;
  review_note: string | null;
  created_at: string;
  creator: { username: string; display_name: string | null } | null;
}

export interface LiveGift {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  price: number;
  active: boolean;
  sort_order: number;
}

export interface LiveChatMessage {
  id: number;
  stream_id: string;
  user_id: string;
  body: string;
  created_at: string;
  sender: { username: string; display_name: string | null } | null;
}

export interface LiveStreamFilters {
  status?: LiveStatus;
  creatorId?: string;
  limit?: number;
}

export async function fetchLiveStreams(
  supabase: SupabaseClient,
  { status, creatorId, limit = 40 }: LiveStreamFilters = {}
): Promise<LiveStreamRow[]> {
  let query = supabase
    .from("live_streams")
    .select(
      "id, creator_id, title, description, status, provider, provider_session_id, mux_playback_id, scheduled_for, started_at, ended_at, viewers, gift_total, review_note, created_at, creator:creator_id(username, display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data, error } = await query;

  if (error) {
    console.warn(`[live] fetch failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const stream = row as Omit<LiveStreamRow, "creator"> & {
      creator: LiveStreamRow["creator"] | LiveStreamRow["creator"][];
    };
    return {
      ...stream,
      creator: Array.isArray(stream.creator)
        ? (stream.creator[0] ?? null)
        : (stream.creator ?? null),
    };
  }) as LiveStreamRow[];
}

export async function fetchLiveGifts(
  supabase: SupabaseClient
): Promise<LiveGift[]> {
  const { data, error } = await supabase
    .from("live_gifts")
    .select("id, slug, name, emoji, price, active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn(`[live] gift catalogue failed: ${error.message}`);
    return [];
  }

  return (data ?? []) as LiveGift[];
}

export async function fetchChatMessages(
  supabase: SupabaseClient,
  streamId: string,
  limit = 100
): Promise<LiveChatMessage[]> {
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select(
      "id, stream_id, user_id, body, created_at, sender:user_id(username, display_name)"
    )
    .eq("stream_id", streamId)
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    console.warn(`[live] chat fetch failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const message = row as Omit<LiveChatMessage, "sender"> & {
      sender: LiveChatMessage["sender"] | LiveChatMessage["sender"][];
    };
    return {
      ...message,
      sender: Array.isArray(message.sender)
        ? (message.sender[0] ?? null)
        : (message.sender ?? null),
    };
  }) as LiveChatMessage[];
}

export function liveStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "live":
      return "Live now";
    case "ended":
      return "Ended";
    default:
      return status;
  }
}

export function liveCreatorLabel(stream: LiveStreamRow): string {
  return stream.creator?.display_name || stream.creator?.username || "Unknown";
}

/** The weekdays creators may go live on, using the same numbering as the DB. */
export const LIVE_ALLOWED_WEEKDAYS: readonly number[] = [3, 5, 6, 7];

export const WEEKDAY_NAMES: readonly string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** True when the ISO weekday (1 = Monday) is an allowed live day. */
export function isLiveDay(isoWeekday: number): boolean {
  return LIVE_ALLOWED_WEEKDAYS.includes(isoWeekday);
}

export function liveDaySummary(): string {
  return LIVE_ALLOWED_WEEKDAYS.map((day) => WEEKDAY_NAMES[day - 1]).join(
    ", "
  );
}
