import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Records one view. Free viewers count once per video per day; subscribers
// count every play. The response says whether the counter moved so the player
// can show it.
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
  const { data, error } = await supabase.rpc("record_video_view", {
    p_video_id: id,
  });

  if (error) {
    console.warn(`[view] could not record view for ${id}: ${error.message}`);
    return NextResponse.json({ error: "Could not record the view" }, { status: 500 });
  }

  return NextResponse.json({ counted: data === true });
}
