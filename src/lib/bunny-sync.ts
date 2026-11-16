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
