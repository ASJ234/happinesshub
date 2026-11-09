import { NextResponse } from "next/server";
import {
  BunnyWebhookStatus,
  getBunnyVideo,
  isBunnyWebhookConfigured,
  verifyBunnyWebhook,
} from "@/lib/bunny";
import { markBunnyVideoReady } from "@/lib/bunny-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface BunnyWebhookEvent {
  VideoLibraryId?: number;
  VideoGuid?: string;
  Status?: number;
}

const IN_PROGRESS: readonly number[] = [
  BunnyWebhookStatus.Queued,
  BunnyWebhookStatus.Processing,
  BunnyWebhookStatus.Encoding,
  BunnyWebhookStatus.ResolutionFinished,
  BunnyWebhookStatus.UploadStarted,
  BunnyWebhookStatus.UploadFinished,
];

/**
 * Bunny calls this as a video uploads and encodes. A 5xx response makes Bunny
 * retry, so failures are reported rather than swallowed. Events can arrive out
 * of order, so a late progress event never overwrites a finished video.
 */
export async function POST(request: Request) {
  if (!isBunnyWebhookConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // The signature covers the exact bytes, so this must not be re-serialised.
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-bunnystream-signature");
  if (!verifyBunnyWebhook(rawBody, signature)) {
    console.warn("[bunny] webhook rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: BunnyWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const guid = event.VideoGuid;
  const status = event.Status;
  if (
    !guid ||
    status === undefined ||
    event.VideoLibraryId !== Number(process.env.BUNNY_STREAM_LIBRARY_ID)
  ) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const unlessReady = (fields: Record<string, string | null>) =>
    admin
      .from("videos")
      .update(fields)
      .eq("bunny_video_id", guid)
      .neq("bunny_status", "ready");

  try {
    if (status === BunnyWebhookStatus.Finished) {
      await markBunnyVideoReady(admin, guid, await getBunnyVideo(guid));
    } else if (IN_PROGRESS.includes(status)) {
      const { error } = await unlessReady({
        bunny_status: "processing",
        bunny_error: null,
      });
      if (error) throw error;
    } else if (status === BunnyWebhookStatus.Failed) {
      const { error } = await unlessReady({
        bunny_status: "errored",
        bunny_error: "Bunny could not process the video",
      });
      if (error) throw error;
    } else if (status === BunnyWebhookStatus.UploadFailed) {
      const { error } = await unlessReady({
        bunny_status: "errored",
        bunny_error: "The upload failed",
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error(`[bunny] webhook handling failed: ${String(error)}`);
    return NextResponse.json(
      { error: "Could not process the webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
