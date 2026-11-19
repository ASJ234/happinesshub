import {
  BunnyVideoStatus,
  getBunnyVideo,
  isBunnyPlayable,
  type BunnyVideoDetails,
} from "@/lib/bunny";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Marks a video playable. Measurements Bunny doesn't know yet (it may report
 * 0 while still encoding) are left alone rather than wiped.
 */
export async function markBunnyVideoReady(
  admin: AdminClient,
  guid: string,
  details: BunnyVideoDetails
): Promise<void> {
  const update: Record<string, unknown> = { bunny_status: "ready", bunny_error: null };
  if (details.length) update.duration_seconds = details.length;
  if (details.width && details.height) {
    update.width = details.width;
    update.height = details.height;
    update.aspect = `${details.width}:${details.height}`;
  }

  const { error } = await admin.from("videos").update(update).eq("bunny_video_id", guid);
  if (error) throw error;
}

export interface BunnySyncResult {
  state: "ready" | "errored" | null;
  /** Bunny's encoding progress while it is still working, 0-100. */
  progress: number | null;
}

/**
 * Asks Bunny for the video's state and saves it, so a missed webhook can never
 * leave a video stuck. `state` is null while nothing can be played yet.
 */
/** How long one Bunny answer is reused across viewers polling the same video. */
const SYNC_TTL_MS = 20_000;
const MAX_CACHED = 500;
const recentSyncs = new Map<
  string,
  { at: number; result: Promise<BunnySyncResult> }
>();

/**
 * syncBunnyVideo, but at most once per video every SYNC_TTL_MS on this server
 * instance. Every viewer of an unready video polls, and each Bunny call takes
 * over a second, so they share one answer (and one in-flight request) instead.
 * The webhook still marks the video ready the moment Bunny finishes.
 */
export function syncBunnyVideoThrottled(guid: string): Promise<BunnySyncResult> {
  const now = Date.now();
  const cached = recentSyncs.get(guid);
  if (cached && now - cached.at < SYNC_TTL_MS) return cached.result;

  if (recentSyncs.size >= MAX_CACHED) {
    for (const [key, entry] of recentSyncs) {
      if (now - entry.at >= SYNC_TTL_MS) recentSyncs.delete(key);
    }
    if (recentSyncs.size >= MAX_CACHED) recentSyncs.clear();
  }

  const result = syncBunnyVideo(guid);
  recentSyncs.set(guid, { at: now, result });
  // A failed call shouldn't be reused; the next poll tries again.
  result.catch(() => recentSyncs.delete(guid));
  return result;
}

export async function syncBunnyVideo(guid: string): Promise<BunnySyncResult> {
  const details = await getBunnyVideo(guid);
  const admin = createAdminClient();

  if (isBunnyPlayable(details)) {
    await markBunnyVideoReady(admin, guid, details);
    return { state: "ready", progress: 100 };
  }

  if (
    details.status === BunnyVideoStatus.Error ||
    details.status === BunnyVideoStatus.UploadFailed
  ) {
    const { error } = await admin
      .from("videos")
      .update({
        bunny_status: "errored",
        bunny_error: "Bunny could not process the video",
      })
      .eq("bunny_video_id", guid)
      .neq("bunny_status", "ready");

    if (error) throw error;
    return { state: "errored", progress: null };
  }

  return { state: null, progress: details.encodeProgress ?? null };
}
