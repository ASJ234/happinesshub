import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchCategoryAccess } from "@/lib/categories";
import { signMuxPlaybackTokens } from "@/lib/mux";
import { hasActiveSubscription, isVideoUnlocked } from "@/lib/videos";
import { createClient } from "@/lib/supabase/server";

// Returns playback details after the app's own access check (admin, own
// upload, free sector, or active subscription).
//
// Mux videos come back as a signed playback ID plus short-lived tokens, so the
// playback ID alone is useless to anyone who has not passed this route.
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
  const { data: video, error } = await supabase
    .from("videos")
    .select(
      "id, creator_id, category, status, mux_playback_id, mux_status, mux_error"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const isOwn = video.creator_id === user.id;
  const isAdmin = user.role === "admin";

  if (video.status !== "published" && !isOwn && !isAdmin) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const [subscribed, accessMap] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    fetchCategoryAccess(supabase),
  ]);

  if (!isVideoUnlocked(video, user, subscribed, accessMap)) {
    return NextResponse.json(
      { error: "Subscription required", locked: true },
      { status: 403 }
    );
  }

  if (video.mux_status === "errored") {
    return NextResponse.json(
      { error: video.mux_error || "This video could not be processed" },
      { status: 422 }
    );
  }

  if (video.mux_playback_id) {
    try {
      const tokens = await signMuxPlaybackTokens(video.mux_playback_id);
      return NextResponse.json({
        playbackId: video.mux_playback_id,
        tokens,
      });
    } catch (signError) {
      console.warn(
        `[stream] could not sign Mux playback for ${id}: ${String(signError)}`
      );
      return NextResponse.json(
        { error: "Could not start playback" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "This video is still processing", processing: true },
    { status: 409 }
  );
}
