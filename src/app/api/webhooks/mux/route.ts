import { NextResponse } from "next/server";
import { verifyMuxWebhook } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type WebhookRow = {
  data: Record<string, unknown>;
  type: string;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : null;
}

function errorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;
  const text = messages.filter((m): m is string => typeof m === "string").join("; ");
  return text ? text.slice(0, 500) : null;
}

async function resolveVideoId(
  admin: ReturnType<typeof createAdminClient>,
  options: { passthrough?: unknown; uploadId?: unknown; assetId?: unknown }
): Promise<string | null> {
  const passthrough = readString(options.passthrough);
  if (passthrough && UUID_RE.test(passthrough)) return passthrough;

  const uploadId = readString(options.uploadId);
  if (uploadId) {
    const { data } = await admin
      .from("videos")
      .select("id")
      .eq("mux_upload_id", uploadId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const assetId = readString(options.assetId);
  if (assetId) {
    const { data } = await admin
      .from("videos")
      .select("id")
      .eq("mux_asset_id", assetId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

/**
 * Mux calls this endpoint when an upload becomes an asset, finishes encoding
 * or fails. Signature verification is done by the Mux SDK before anything is
 * written; the service-role client then updates the row that the upload API
 * created.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: WebhookRow;
  try {
    event = (await verifyMuxWebhook(rawBody, headers)) as unknown as WebhookRow;
  } catch (error) {
    console.warn(`[mux] webhook rejected: ${String(error)}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const data = event.data ?? {};

  try {
    switch (event.type) {
      case "video.upload.asset_created": {
        const uploadId = readString(data.id);
        const assetId = readString(data.asset_id);
        const videoId = await resolveVideoId(admin, { uploadId, assetId });
        if (videoId) {
          await admin
            .from("videos")
            .update({
              mux_asset_id: assetId,
              mux_status: "preparing",
              mux_error: null,
            })
            .eq("id", videoId);
        }
        break;
      }

      case "video.upload.errored":
      case "video.upload.cancelled": {
        const videoId = await resolveVideoId(admin, {
          uploadId: data.id,
          assetId: data.asset_id,
        });
        if (videoId) {
          await admin
            .from("videos")
            .update({
              mux_status:
                event.type === "video.upload.cancelled" ? "cancelled" : "errored",
              mux_error: errorMessage(data.error) ?? "The upload failed",
            })
            .eq("id", videoId);
        }
        break;
      }

      case "video.asset.created":
      case "video.asset.preparing":
      case "video.asset.ready":
      case "video.asset.errored": {
        const assetId = readString(data.id);
        const videoId = await resolveVideoId(admin, {
          passthrough: data.passthrough,
          uploadId: data.upload_id,
          assetId,
        });
        if (!videoId) break;

        if (event.type === "video.asset.errored") {
          await admin
            .from("videos")
            .update({
              mux_asset_id: assetId,
              mux_status: "errored",
              mux_error: errorMessage(data.errors) ?? "Mux could not process the video",
            })
            .eq("id", videoId);
          break;
        }

        if (event.type !== "video.asset.ready") {
          await admin
            .from("videos")
            .update({
              mux_asset_id: assetId,
              mux_status: "preparing",
              mux_error: null,
            })
            .eq("id", videoId);
          break;
        }

        const playbackIds = Array.isArray(data.playback_ids)
          ? (data.playback_ids as Array<Record<string, unknown>>)
          : [];
        const signed = playbackIds.find((id) => id.policy === "signed");
        const playbackId =
          readString(signed?.id) ?? readString(playbackIds[0]?.id);

        const tracks = Array.isArray(data.tracks)
          ? (data.tracks as Array<Record<string, unknown>>)
          : [];
        const videoTrack = tracks.find((track) => track.type === "video");
        const duration = readNumber(data.duration);
        const width = readNumber(videoTrack?.max_width);
        const height = readNumber(videoTrack?.max_height);
        const aspect =
          readString(data.aspect_ratio) ??
          (width && height ? `${width}:${height}` : null);

        await admin
          .from("videos")
          .update({
            mux_asset_id: assetId,
            mux_playback_id: playbackId,
            mux_status: "ready",
            mux_error: null,
            duration_seconds: duration,
            width,
            height,
            aspect,
          })
          .eq("id", videoId);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`[mux] webhook handling failed: ${String(error)}`);
    return NextResponse.json(
      { error: "Could not process the webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
