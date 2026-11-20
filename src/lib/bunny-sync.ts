import {
  BunnyVideoStatus,
  getBunnyVideo,
  isBunnyPlayable,
  type BunnyVideoDetails,
} from "@/lib/bunny";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  /** Bunny's own status code, see BunnyVideoStatus. */
  bunnyStatus: number;
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
    return { state: "ready", progress: 100, bunnyStatus: details.status };
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
    return { state: "errored", progress: null, bunnyStatus: details.status };
  }

  return {
    state: null,
    progress: details.encodeProgress ?? null,
    bunnyStatus: details.status,
  };
}

/**
 * Videos on Bunny that aren't marked ready or errored yet. They stay out of
 * the public listings until a webhook or a status check settles them.
 */
const UNSETTLED_FILTER = "bunny_status.is.null,bunny_status.in.(waiting,processing)";

export async function countStuckBunnyVideos(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .not("bunny_video_id", "is", null)
    .or(UNSETTLED_FILTER);

  if (error) {
    console.warn(`[bunny-sync] stuck count failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

/** What a re-check found for one video, in words for the admin. */
export type BunnyResyncOutcome =
  | "ready"
  | "errored"
  | "never_uploaded"
  | "encoding"
  | "check_failed";

export interface BunnyResyncVideo {
  id: string;
  title: string;
  createdAt: string;
  outcome: BunnyResyncOutcome;
  /** Encoding progress, 0-100, while Bunny is still working. */
  progress: number | null;
}

export interface BunnyResyncSummary {
  checked: number;
  ready: number;
  errored: number;
  /** Bunny never received a file for these; the upload didn't finish. */
  neverUploaded: number;
  stillProcessing: number;
  failed: number;
  /** Every video that is still not ready, so the admin can act on it. */
  unready: BunnyResyncVideo[];
  /** More unsettled videos are left for another run. */
  more: boolean;
}

/** Videos checked per run, so one request stays well inside a timeout. */
const RESYNC_BATCH = 60;
/** Bunny calls in flight at once. */
const RESYNC_CONCURRENCY = 6;

/**
 * Asks Bunny about every unsettled video (oldest first, one batch per call)
 * and saves what it says, for videos whose webhook never arrived.
 */
export async function resyncStuckBunnyVideos(): Promise<BunnyResyncSummary> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("videos")
    .select("id, title, created_at, bunny_video_id")
    .not("bunny_video_id", "is", null)
    .or(UNSETTLED_FILTER)
    .order("created_at", { ascending: true })
    .limit(RESYNC_BATCH + 1);

  if (error) throw error;

  const rows = (data ?? []).slice(0, RESYNC_BATCH);
  const summary: BunnyResyncSummary = {
    checked: rows.length,
    ready: 0,
    errored: 0,
    neverUploaded: 0,
    stillProcessing: 0,
    failed: 0,
    unready: [],
    more: (data ?? []).length > RESYNC_BATCH,
  };

  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const row = rows[next++];
      const guid = row.bunny_video_id as string;
      let outcome: BunnyResyncOutcome;
      let progress: number | null = null;
      try {
        const sync = await syncBunnyVideo(guid);
        progress = sync.progress;
        outcome =
          sync.state === "ready"
            ? "ready"
            : sync.state === "errored"
              ? "errored"
              : sync.bunnyStatus === BunnyVideoStatus.Created
                ? "never_uploaded"
                : "encoding";
      } catch (syncError) {
        outcome = "check_failed";
        console.warn(`[bunny-sync] resync failed for ${guid}: ${String(syncError)}`);
      }

      if (outcome === "ready") summary.ready++;
      else if (outcome === "errored") summary.errored++;
      else if (outcome === "never_uploaded") summary.neverUploaded++;
      else if (outcome === "encoding") summary.stillProcessing++;
      else summary.failed++;

      if (outcome !== "ready") {
        summary.unready.push({
          id: row.id as string,
          title: (row.title as string) || "Untitled",
          createdAt: row.created_at as string,
          outcome,
          progress,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: RESYNC_CONCURRENCY }, worker));

  summary.unready.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return summary;
}
