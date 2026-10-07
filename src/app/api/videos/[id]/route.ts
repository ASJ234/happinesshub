import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Deletes a video (owner or admin) along with its storage objects.
export async function DELETE(
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
    .select("id, creator_id, video_path, thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  // RLS hides rows the caller may not touch — treat them as missing.
  if (error || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const canDelete = video.creator_id === user.id || user.role === "admin";
  if (!canDelete) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await supabase.storage.from("videos").remove([video.video_path]);
  if (video.thumbnail_path) {
    await supabase.storage.from("thumbnails").remove([video.thumbnail_path]);
  }

  const { error: deleteError } = await supabase
    .from("videos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Could not delete video" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
