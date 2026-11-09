import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role, User } from "./roles";
import {
  DEFAULT_ACCESS_MAP,
  isFreeAccess,
  type CategoryAccessMap,
} from "./categories";

export type VideoStatus =
  | "published"
  | "draft"
  | "scheduled"
  | "pending_review"
  | "rejected";

export interface VideoRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_path: string | null;
  views: number;
  status: VideoStatus;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  aspect: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_upload_id: string | null;
  mux_status: "waiting" | "preparing" | "ready" | "errored" | "cancelled" | null;
  mux_error: string | null;
  created_at: string;
  creator: { username: string; display_name: string | null } | null;
}

export function creatorLabel(video: VideoRow): string {
  return video.creator?.display_name || video.creator?.username || "Unknown";
}

/**
 * Padlock rule: admins watch anything, creators watch their own uploads for
 * free, free sectors (picha, wardrobe, masseuse, hookups) are open to everyone,
 * and every other sector needs an active (admin-approved) subscription.
 */
export function isVideoUnlocked(
  video: Pick<VideoRow, "creator_id" | "category">,
  viewer: Pick<User, "id" | "role"> | null,
  hasActiveSubscription: boolean,
  accessMap: CategoryAccessMap = DEFAULT_ACCESS_MAP
): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  if (video.creator_id === viewer.id) return true;
  if (isFreeAccess(video.category, accessMap)) return true;
  return hasActiveSubscription;
}

export async function hasActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("status", "active");

  return (data ?? []).some(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now()
  );
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  duration_days: number;
  sort_order: number;
}

export async function fetchSubscriptionPlans(
  supabase: SupabaseClient
): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn(`[plans] fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as SubscriptionPlan[];
}

export function formatUgx(amount: number): string {
  return `UGX ${Number(amount).toLocaleString()}`;
}

interface FetchVideosOptions {
  category?: string;
  creatorId?: string;
  search?: string;
  publishedOnly?: boolean;
  limit?: number;
}

export async function fetchVideos(
  supabase: SupabaseClient,
  { category, creatorId, search, publishedOnly = true, limit = 60 }: FetchVideosOptions = {}
): Promise<VideoRow[]> {
  let query = supabase
    .from("videos")
    .select("*, creator:creator_id(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (creatorId) query = query.eq("creator_id", creatorId);
  if (publishedOnly) query = query.eq("status", "published");
  if (search) {
    // Escape the LIKE wildcards so user input matches literally.
    const escaped = search
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    query = query.ilike("title", `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(`[videos] fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as VideoRow[];
}

export interface CreatorTotals {
  videos: number;
  views: number;
}

/** Totals across a creator's published videos. */
export async function fetchCreatorTotals(
  supabase: SupabaseClient,
  creatorId: string
): Promise<CreatorTotals> {
  const { data, error } = await supabase
    .from("videos")
    .select("views")
    .eq("creator_id", creatorId)
    .eq("status", "published");

  if (error) {
    console.warn(`[videos] creator totals failed: ${error.message}`);
    return { videos: 0, views: 0 };
  }

  return {
    videos: data.length,
    views: data.reduce((sum, row) => sum + Number(row.views), 0),
  };
}

export interface VideoViewCount {
  video_id: string;
  title: string;
  views: number;
}

/** A creator's videos by views over the last `days` days, most viewed first. */
export async function fetchRecentViewCounts(
  supabase: SupabaseClient,
  creatorId: string,
  days: number
): Promise<VideoViewCount[]> {
  const today = new Date();
  const from = new Date(today.getTime() - (days - 1) * 86_400_000);
  const { data, error } = await supabase.rpc("creator_view_counts", {
    p_creator_id: creatorId,
    p_from: from.toISOString().slice(0, 10),
    p_to: today.toISOString().slice(0, 10),
  });

  if (error) {
    console.warn(`[videos] view counts failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as VideoViewCount[]).map((row) => ({
    ...row,
    views: Number(row.views),
  }));
}

export function thumbnailUrl(
  supabase: SupabaseClient,
  path: string | null
): string | null {
  if (!path) return null;
  return supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function roleLabel(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Human readable label for a video's review state. */
export function videoStatusLabel(status: string): string {
  switch (status) {
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "pending_review":
      return "Pending review";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}
