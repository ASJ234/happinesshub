import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Approve or reject a video that is waiting for review.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  const status =
    body.action === "approve"
      ? "published"
      : body.action === "reject"
        ? "rejected"
        : null;

  if (!status) {
    return NextResponse.json(
      { error: "Action must be approve or reject" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_video", {
    p_id: id,
    p_status: status,
  });

  if (error) {
    console.warn(`[admin/videos] review failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.note) {
    await supabase
      .from("videos")
      .update({ review_note: body.note.trim().slice(0, 500) })
      .eq("id", id);
  }

  return NextResponse.json({ success: true, status });
}
