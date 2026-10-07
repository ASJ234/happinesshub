import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/videos";
import { createClient } from "@/lib/supabase/server";

// Issues a short-lived signed URL for a video after the app's own access
// check (admin, own upload, or active subscription). Private bucket files are
// never exposed directly, and each successful play counts one view.
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
    .select("id, creator_id, video_path, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const isOwn = video.creator_id === user.id;
  const isAdmin = user.role === "admin";
  const published = video.status === "published";

  if (!published && !isOwn && !isAdmin) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  let unlocked = isOwn || isAdmin;
  if (!unlocked) {
    unlocked = await hasActiveSubscription(supabase, user.id);
  }

  if (!unlocked) {
    return NextResponse.json(
      { error: "Subscription required", locked: true },
      { status: 403 }
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("videos")
    .createSignedUrl(video.video_path, 60 * 60);

  if (signError || !signed) {
    console.warn(`[stream] could not sign video ${id}: ${signError?.message}`);
    return NextResponse.json(
      { error: "Could not start playback" },
      { status: 500 }
    );
  }

  await supabase.rpc("increment_video_views", { p_video_id: id });

  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}
