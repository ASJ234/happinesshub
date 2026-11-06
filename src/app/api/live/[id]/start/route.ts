import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteMuxLiveStream, isMuxApiConfigured } from "@/lib/mux";
import { getLiveProvider } from "@/lib/providers/live";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Starts an approved stream and, when Mux is configured, creates the RTMPS
// ingest point. The response includes stream credentials when available.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createClient();

  // Validate the stream is approved and belongs to this creator (or admin).
  const { data: stream, error: fetchError } = await supabase
    .from("live_streams")
    .select("id, creator_id, title, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  const isOwner = stream.creator_id === user.id;
  if (!isOwner && user.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (stream.status !== "approved") {
    return NextResponse.json(
      { error: "Stream must be approved before going live" },
      { status: 400 }
    );
  }

  // Enforce the day rule.
  const { data: canGoLive, error: dayError } = await supabase.rpc(
    "can_go_live_today"
  );
  if (dayError || !canGoLive) {
    return NextResponse.json(
      { error: dayError?.message ?? "Going live is not allowed today" },
      { status: 400 }
    );
  }

  const provider = getLiveProvider();
  const session = await provider.createSession(id, stream.title).catch(
    (err: unknown) => {
      console.warn(`[live/start] provider.createSession failed: ${String(err)}`);
      return null;
    }
  );

  if (session === null) {
    return NextResponse.json(
      { error: "Could not create the live stream. Please try again." },
      { status: 502 }
    );
  }

  // Persist status and Mux credentials atomically via the admin client so RLS
  // cannot block the write.
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("live_streams")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
      ended_at: null,
      provider: session.provider,
      mux_live_stream_id: session.muxLiveStreamId,
      mux_playback_id: session.playbackId,
      mux_stream_key: session.streamKey,
    })
    .eq("id", id)
    .eq("status", "approved");

  if (updateError) {
    // Roll back the Mux resource so it doesn't sit orphaned.
    if (session.muxLiveStreamId && isMuxApiConfigured()) {
      await deleteMuxLiveStream(session.muxLiveStreamId).catch(() => undefined);
    }
    console.warn(`[live/start] DB update failed: ${updateError.message}`);
    return NextResponse.json(
      { error: "Could not start the stream. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    provider: session.provider,
    ingestUrl: session.ingestUrl,
    streamKey: session.streamKey,
    playbackId: session.playbackId,
  });
}
