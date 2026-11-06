import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { signMuxLivePlaybackToken } from "@/lib/mux";
import { hasActiveSubscription } from "@/lib/videos";
import { createClient } from "@/lib/supabase/server";

// Returns a signed Mux playback token for a live stream after the access check.
// Live is a paid category, so non-owners need an active subscription.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: stream, error } = await supabase
    .from("live_streams")
    .select("id, creator_id, status, mux_playback_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  if (stream.status !== "live") {
    return NextResponse.json(
      { error: "Stream is not live", status: stream.status },
      { status: 409 }
    );
  }

  if (!stream.mux_playback_id) {
    return NextResponse.json(
      { error: "Playback is not available for this stream" },
      { status: 409 }
    );
  }

  const isOwner = stream.creator_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    const subscribed = await hasActiveSubscription(supabase, user.id);
    if (!subscribed) {
      return NextResponse.json(
        { error: "Subscription required", locked: true },
        { status: 403 }
      );
    }
  }

  try {
    const token = await signMuxLivePlaybackToken(stream.mux_playback_id);
    return NextResponse.json({ playbackId: stream.mux_playback_id, token });
  } catch (signError) {
    console.warn(
      `[live/playback] could not sign token for ${id}: ${String(signError)}`
    );
    return NextResponse.json(
      { error: "Could not start playback" },
      { status: 500 }
    );
  }
}
