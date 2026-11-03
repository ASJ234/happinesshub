import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchCategoryAccess } from "@/lib/categories";
import { hasActiveSubscription, isVideoUnlocked } from "@/lib/videos";
import { createClient } from "@/lib/supabase/server";

// Issues a short-lived signed URL for a video after the app's own access
// check (admin, own upload, free sector, or active subscription). Private
// bucket files are never exposed directly, and the storage bucket repeats the
// same check through public.can_access_video.
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
    .select("id, creator_id, category, video_path, status")
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

  // Views are recorded by the player itself (POST /api/videos/[id]/view) so
  // that the daily-unique rule can be applied server-side.
  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}