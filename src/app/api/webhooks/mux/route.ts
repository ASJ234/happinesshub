import { NextResponse } from "next/server";
import { verifyMuxWebhook } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type WebhookRow = {
  data: Record<string, unknown>;
  type: string;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Mux calls this endpoint as live streams change state. Signature verification
 * is done by the Mux SDK before anything is written.
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
      case "video.live_stream.active":
      case "video.live_stream.idle":
      case "video.live_stream.disconnected": {
        const muxLiveStreamId = readString(data.id);
        if (!muxLiveStreamId) break;

        const { data: liveStream } = await admin
          .from("live_streams")
          .select("id")
          .eq("mux_live_stream_id", muxLiveStreamId)
          .eq("status", "live")
          .maybeSingle();

        if (!liveStream) break;

        // Auto-end the DB row when the RTMP connection goes permanently idle
        // (reconnect window expired) or the encoder disconnects.
        if (
          event.type === "video.live_stream.idle" ||
          event.type === "video.live_stream.disconnected"
        ) {
          await admin
            .from("live_streams")
            .update({ status: "ended", ended_at: new Date().toISOString() })
            .eq("id", liveStream.id)
            .eq("status", "live");
        }
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
