import {
  BunnyVideoStatus,
  getBunnyVideo,
  type BunnyVideoDetails,
} from "@/lib/bunny";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function markBunnyVideoReady(
  admin: AdminClient,
  guid: string,
  details: BunnyVideoDetails
): Promise<void> {
  const width = details.width || null;
  const height = details.height || null;

  const { error } = await admin
    .from("videos")
    .update({
      bunny_status: "ready",
      bunny_error: null,
      duration_seconds: details.length || null,
      width,
      height,
      aspect: width && height ? `${width}:${height}` : null,
    })
    .eq("bunny_video_id", guid);

  if (error) throw error;
}

/**
 * Asks Bunny for the video's state and saves it, so a missed webhook can never
 * leave a video stuck. Returns null while Bunny is still working on it.
 */
export async function syncBunnyVideo(
  guid: string
): Promise<"ready" | "errored" | null> {
  const details = await getBunnyVideo(guid);
  const admin = createAdminClient();

  if (details.status === BunnyVideoStatus.Finished) {
    await markBunnyVideoReady(admin, guid, details);
    return "ready";
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
    return "errored";
  }

  return null;
}
